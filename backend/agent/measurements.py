"""
measurements.py — objective, OpenCV-based measurements of a handwriting image.

These cross-check the vision model on features that can be measured directly
(slant, baseline, margins, line spacing). Each measurement returns
a value from the same vocabulary the rules engine uses, or is omitted when the
sample is too small/noisy to measure reliably.
"""

import logging

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_MAX_SIDE = 1400


def _binarize(img_bytes: bytes) -> np.ndarray | None:
    img = cv2.imdecode(np.frombuffer(img_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
    if img is None:
        return None
    h, w = img.shape
    scale = _MAX_SIDE / max(h, w)
    if scale < 1:
        img = cv2.resize(img, (int(w * scale), int(h * scale)), interpolation=cv2.INTER_AREA)
    img = cv2.GaussianBlur(img, (3, 3), 0)
    binary = cv2.adaptiveThreshold(
        img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 41, 15
    )
    return cv2.morphologyEx(binary, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))


def _measure_slant(binary: np.ndarray) -> str | None:
    """Shear-projection method: the angle that makes vertical strokes sharpest."""
    h, w = binary.shape
    small = cv2.resize(binary, (w // 2, h // 2), interpolation=cv2.INTER_AREA)
    sh, sw = small.shape
    best_angle, best_score = 0.0, -1.0
    for angle in range(-35, 36, 2):
        shear = np.tan(np.radians(angle))
        m = np.float32([[1, shear, -shear * sh / 2], [0, 1, 0]])
        warped = cv2.warpAffine(small, m, (sw, sh))
        profile = (warped > 0).sum(axis=0).astype(np.float64)
        score = float((profile ** 2).sum())
        if score > best_score:
            best_angle, best_score = float(angle), score
    # Empirically verified on synthetic strokes: positive shear angle == right lean.
    lean = best_angle
    if lean > 25:
        return "far right"
    if lean > 8:
        return "right"
    if lean < -25:
        return "far left"
    if lean < -8:
        return "left"
    return "upright"


def _line_bands(binary: np.ndarray) -> list[tuple[int, int]]:
    profile = (binary > 0).sum(axis=1).astype(np.float64)
    profile = np.convolve(profile, np.ones(9) / 9, mode="same")
    if profile.max() <= 0:
        return []
    active = profile > profile.max() * 0.08
    bands, start = [], None
    for i, on in enumerate(active):
        if on and start is None:
            start = i
        elif not on and start is not None:
            if i - start > 12:
                bands.append((start, i))
            start = None
    if start is not None and len(active) - start > 12:
        bands.append((start, len(active)))
    return bands


def _measure_baseline(binary: np.ndarray, bands: list[tuple[int, int]]) -> str | None:
    angles, residuals = [], []
    for top, bottom in bands:
        strip = binary[top:bottom]
        n, _, stats, _ = cv2.connectedComponentsWithStats(strip, connectivity=8)
        pts = [
            (x + w / 2, y + h)
            for x, y, w, h, area in stats[1:]
            if area > 20 and h > 6
        ]
        if len(pts) < 6:
            continue
        xs, ys = np.array(pts).T
        if np.ptp(xs) < binary.shape[1] * 0.25:
            continue
        slope, intercept = np.polyfit(xs, ys, 1)
        angles.append(np.degrees(np.arctan(slope)))
        residuals.append(np.std(ys - (slope * xs + intercept)) / max(bottom - top, 1))
    if not angles:
        return None
    angle = -float(np.median(angles))  # image y grows downward
    if np.median(residuals) > 0.22:
        return "wavy"
    if angle > 2.5:
        return "ascending"
    if angle < -2.5:
        return "descending"
    return "straight"


def _measure_margins(binary: np.ndarray) -> str | None:
    cols = np.where((binary > 0).sum(axis=0) > 2)[0]
    if len(cols) < 20:
        return None
    w = binary.shape[1]
    left, right = cols[0] / w, (w - 1 - cols[-1]) / w
    if left > 0.18 and right < 0.08:
        return "wide left"
    if right > 0.18 and left < 0.08:
        return "wide right"
    if left < 0.04 and right < 0.04:
        return "no margins"
    if left < 0.06 and right >= 0.08:
        return "narrow left"
    if right < 0.06 and left >= 0.08:
        return "narrow right"
    return "balanced"


def _measure_line_spacing(binary: np.ndarray, bands: list[tuple[int, int]]) -> str | None:
    if len(bands) < 3:
        return None
    heights = np.array([b - t for t, b in bands], dtype=float)
    gaps = np.array([bands[i + 1][0] - bands[i][1] for i in range(len(bands) - 1)], dtype=float)
    ratio = float(np.median(gaps) / max(np.median(heights), 1))
    if ratio < 0.15:
        return "narrow"
    if ratio > 0.6:
        return "wide"
    return "normal"


def measure_features(image_bytes: bytes) -> dict[str, str]:
    """Return the measurable features it can determine with confidence."""
    out: dict[str, str] = {}
    try:
        binary = _binarize(image_bytes)
        if binary is None or (binary > 0).mean() < 0.005:
            return out
        bands = _line_bands(binary)
        for name, fn in (
            ("slant", lambda: _measure_slant(binary)),
            ("baseline", lambda: _measure_baseline(binary, bands)),
            ("margin_usage", lambda: _measure_margins(binary)),
            ("line_spacing", lambda: _measure_line_spacing(binary, bands)),
        ):
            value = fn()
            if value:
                out[name] = value
    except Exception as exc:
        logger.warning("Measurement failed: %s", exc)
    return out
