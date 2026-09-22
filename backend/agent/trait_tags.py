"""
trait_tags.py — deterministic personality trait tags (Thoughtful, Committed,
Flexible, ...) derived from the observed handwriting features.

Each trait is a set of weighted signals: feature -> observed value -> 0..1.
A trait's score is the mean over the features actually observed, so a trait is
only shown when at least MIN_EVIDENCE observed features support it. Only the
strongest few are returned, which keeps the result feeling like a natural
description rather than a checklist of all nine labels.
"""

from models import HandwritingFeatures

MIN_EVIDENCE = 2
STRONG = 0.68      # shown when at least this strong
FLOOR = 0.55       # if too few are strong, top up to MIN_SHOWN from traits above this
MIN_SHOWN = 3
MAX_SHOWN = 6
_NEUTRAL = 0.2     # observed value that doesn't point toward the trait

TRAITS: dict[str, dict] = {
    "thoughtful": {
        "label": "Thoughtful",
        "signals": {
            "writing_speed": {"slow": 1.0, "moderate": 0.6},
            "word_spacing": {"wide": 0.8, "normal": 0.6},
            "zone_emphasis": {"upper": 0.9, "balanced": 0.6},
            "slant": {"upright": 0.8},
            "connectivity": {"connected": 0.7},
            "line_spacing": {"normal": 0.7, "wide": 0.8},
        },
    },
    "committed": {
        "label": "Committed",
        "signals": {
            "baseline": {"straight": 1.0, "ascending": 0.8},
            "t_bar_length": {"long": 1.0, "medium": 0.7},
            "pressure": {"heavy": 0.9, "medium": 0.7},
            "regularity": {"consistent": 1.0},
            "connectivity": {"connected": 0.8},
        },
    },
    "flexible": {
        "label": "Flexible",
        "signals": {
            "connectivity": {"mixed": 1.0},
            "slant": {"mixed": 0.9},
            "letter_form": {"mixed": 1.0},
            "ending_strokes": {"tapering": 0.7},
            "baseline": {"wavy": 0.5},
        },
    },
    "balanced": {
        "label": "Balanced",
        "signals": {
            "baseline": {"straight": 0.9},
            "margin_usage": {"balanced": 1.0},
            "zone_emphasis": {"balanced": 1.0},
            "letter_size": {"medium": 0.9},
            "pressure": {"medium": 1.0},
            "word_spacing": {"normal": 0.9},
            "letter_spacing": {"normal": 0.9},
        },
    },
    "sensitive": {
        "label": "Sensitive",
        "signals": {
            "pressure": {"light": 1.0},
            "slant": {"right": 0.7},
            "letter_form": {"rounded": 0.8},
            "stroke_quality": {"tremulous": 0.6},
            "loop_style": {"large upper loops": 0.5},
        },
    },
    "trust_builder": {
        "label": "Trust builder",
        "signals": {
            "legibility": {"very legible": 1.0, "moderately legible": 0.6},
            "regularity": {"consistent": 0.9},
            "baseline": {"straight": 0.8},
            "margin_usage": {"balanced": 0.7},
            "ending_strokes": {"extended": 0.6},
            "letter_form": {"rounded": 0.6},
        },
    },
    "people_oriented": {
        "label": "People-oriented",
        "signals": {
            "slant": {"right": 1.0},
            "word_spacing": {"narrow": 0.9, "normal": 0.6},
            "connectivity": {"connected": 0.7},
            "letter_form": {"rounded": 0.8},
            "ending_strokes": {"extended": 0.8},
            "letter_size": {"large": 0.6},
        },
    },
    "detail_focused": {
        "label": "Detail-focused",
        "signals": {
            "letter_size": {"small": 1.0},
            "i_dot": {"close": 1.0},
            "legibility": {"very legible": 0.7},
            "regularity": {"consistent": 0.8},
            "connectivity": {"connected": 0.6},
        },
    },
    "motivator": {
        "label": "Motivator",
        "signals": {
            "baseline": {"ascending": 1.0},
            "t_bar_position": {"high": 1.0},
            "t_bar_length": {"long": 0.9},
            "writing_speed": {"fast": 0.8},
            "slant": {"right": 0.8},
            "letter_size": {"large": 0.8},
            "pressure": {"heavy": 0.7},
        },
    },
}


def compute_trait_tags(features: HandwritingFeatures) -> list[dict]:
    """Return trait tags, strongest first, each with the observed cues behind it."""
    scored: list[tuple[float, str, list[str]]] = []

    for trait in TRAITS.values():
        values: list[float] = []
        cues: list[str] = []
        for feature, mapping in trait["signals"].items():
            observed = (getattr(features, feature, "unknown") or "unknown").strip().lower()
            if observed == "unknown":
                continue
            weight = mapping.get(observed, _NEUTRAL)
            values.append(weight)
            if weight >= 0.6:
                cues.append(f"{feature.replace('_', ' ')}: {observed}")
        if len(values) < MIN_EVIDENCE:
            continue
        scored.append((sum(values) / len(values), trait["label"], cues))

    scored.sort(key=lambda item: item[0], reverse=True)
    picked = [s for s in scored if s[0] >= STRONG][:MAX_SHOWN]
    if len(picked) < MIN_SHOWN:
        picked = [s for s in scored if s[0] >= FLOOR][:MIN_SHOWN]

    return [{"label": label, "why": ", ".join(cues)} for _, label, cues in picked]
