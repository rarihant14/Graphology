/**
 * imagePreprocessing.js — Client-side image cleanup before a handwriting
 * sample is sent to the Gemini vision model.
 *
 * Goal: make the features the model has to read (slant, baseline, pressure,
 * letter/word spacing, loop style) as visually unambiguous as possible before
 * the image ever leaves the browser. Runs entirely on <canvas>, no deps.
 *
 * Pipeline:
 *   1. Decode with EXIF orientation applied (phone photos are often rotated).
 *   2. Downscale to a max dimension — normalizes wildly different camera
 *      resolutions and keeps the next two steps fast.
 *   3. Per-channel auto-levels (percentile-clipped contrast stretch) — fixes
 *      dim/washed-out photos and paper color cast (cream/yellow pages).
 *   4. Light unsharp mask — crisps up stroke edges softened by camera blur.
 *
 * Any failure at any step falls back to returning the original file
 * untouched — this is an enhancement, not a requirement for analysis.
 */

const MAX_DIMENSION = 1800;
const JPEG_QUALITY = 0.92;
const CLIP_PERCENT = 0.01; // clip 1% of pixels at each histogram tail
const SHARPEN_AMOUNT = 0.35; // 0 = off, 1 = full unsharp-mask strength

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function preprocessImage(file) {
  if (!file || !file.type?.startsWith("image/")) return file;

  try {
    const source = await loadDecodedImage(file);
    const { canvas, ctx } = drawScaled(source, MAX_DIMENSION);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyAutoLevels(imageData);
    applySharpen(imageData, canvas.width, canvas.height, SHARPEN_AMOUNT);
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
    if (!blob) return file;

    return new File([blob], toJpegName(file.name), { type: "image/jpeg" });
  } catch (err) {
    console.warn("Image preprocessing failed — using original file.", err);
    return file;
  }
}

// ---------------------------------------------------------------------------
// Decoding — prefers createImageBitmap (auto EXIF rotation), falls back
// to a plain <img> element for browsers that lack it.
// ---------------------------------------------------------------------------

async function loadDecodedImage(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img>-based decoding below
    }
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Scaling — draws the decoded image onto a canvas capped at maxDimension
// on its longest edge, preserving aspect ratio.
// ---------------------------------------------------------------------------

function drawScaled(source, maxDimension) {
  const width = source.width;
  const height = source.height;
  const scale = Math.min(1, maxDimension / Math.max(width, height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);

  const ctx = canvas.getContext("2d");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

  return { canvas, ctx };
}

// ---------------------------------------------------------------------------
// Auto-levels — per-channel percentile-clipped contrast stretch.
// Fixes flat/dim lighting and mild paper color cast without discarding
// stroke-pressure information (unlike a flat grayscale conversion would).
// ---------------------------------------------------------------------------

function applyAutoLevels(imageData) {
  const { data } = imageData;
  const pixelCount = data.length / 4;

  for (let channel = 0; channel < 3; channel++) {
    const histogram = new Uint32Array(256);
    for (let i = channel; i < data.length; i += 4) {
      histogram[data[i]]++;
    }

    const clipCount = Math.floor(pixelCount * CLIP_PERCENT);

    let low = 0;
    let seen = 0;
    for (; low < 255; low++) {
      seen += histogram[low];
      if (seen > clipCount) break;
    }

    let high = 255;
    seen = 0;
    for (; high > 0; high--) {
      seen += histogram[high];
      if (seen > clipCount) break;
    }

    // Degenerate/near-flat channel (e.g. a solid color) — nothing to stretch
    if (high <= low) continue;

    const range = high - low;
    for (let i = channel; i < data.length; i += 4) {
      const value = ((data[i] - low) * 255) / range;
      data[i] = value < 0 ? 0 : value > 255 ? 255 : value;
    }
  }
}

// ---------------------------------------------------------------------------
// Sharpen — light unsharp mask (3x3 blur kernel subtracted from original,
// blended in at `amount` strength) to crisp up pen-stroke edges.
// ---------------------------------------------------------------------------

function applySharpen(imageData, width, height, amount) {
  if (amount <= 0) return;

  const { data } = imageData;
  const original = new Uint8ClampedArray(data);

  const at = (x, y, c) => original[(y * width + x) * 4 + c];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;
      for (let c = 0; c < 3; c++) {
        const blur =
          (at(x - 1, y, c) + at(x + 1, y, c) + at(x, y - 1, c) + at(x, y + 1, c)) / 4;
        const sharpened = at(x, y, c) + (at(x, y, c) - blur) * amount;
        data[idx + c] = sharpened < 0 ? 0 : sharpened > 255 ? 255 : sharpened;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

function toJpegName(originalName) {
  const base = (originalName || "handwriting").replace(/\.[^./\\]+$/, "");
  return `${base}.jpg`;
}
