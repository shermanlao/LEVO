/**
 * Trim large pure-white bars from a gallery photo.
 * Letterboxed uploads (a square fixture centered in a taller frame) otherwise
 * show as empty space above and below the fixture on a white page.
 */

export type EdgeCrop = {
  /** Fractions of the source image, each 0–1. */
  left: number;
  top: number;
  width: number;
  height: number;
  /** Content width / content height in pixels. */
  aspect: number;
};

const WHITE = 248;
const MIN_BAND = 0.04;
const MIN_KEEP = 0.35;

function isWhite(data: Uint8ClampedArray, index: number): boolean {
  return data[index] >= WHITE && data[index + 1] >= WHITE && data[index + 2] >= WHITE;
}

export function cropFromPixels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  channels = 4
): EdgeCrop | null {
  if (width < 8 || height < 8) return null;

  const rowWhite = (y: number) => {
    let white = 0;
    for (let x = 0; x < width; x++) {
      if (isWhite(data, (y * width + x) * channels)) white++;
    }
    return white / width >= 0.99;
  };
  const colWhite = (x: number) => {
    let white = 0;
    for (let y = 0; y < height; y++) {
      if (isWhite(data, (y * width + x) * channels)) white++;
    }
    return white / height >= 0.99;
  };

  let top = 0;
  while (top < height && rowWhite(top)) top++;
  let bottom = height - 1;
  while (bottom > top && rowWhite(bottom)) bottom--;
  let left = 0;
  while (left < width && colWhite(left)) left++;
  let right = width - 1;
  while (right > left && colWhite(right)) right--;

  const minX = Math.round(width * MIN_BAND);
  const minY = Math.round(height * MIN_BAND);
  if (top < minY) top = 0;
  if (height - 1 - bottom < minY) bottom = height - 1;
  if (left < minX) left = 0;
  if (width - 1 - right < minX) right = width - 1;

  if (top === 0 && bottom === height - 1 && left === 0 && right === width - 1) return null;

  const contentWidth = right - left + 1;
  const contentHeight = bottom - top + 1;
  if (contentWidth < width * MIN_KEEP || contentHeight < height * MIN_KEEP) return null;

  return {
    left: left / width,
    top: top / height,
    width: contentWidth / width,
    height: contentHeight / height,
    aspect: contentWidth / contentHeight,
  };
}

/** Measure letterbox bars. Returns null when the photo already fills the frame or the canvas is tainted. */
export function measureNearWhiteEdgeCrop(img: HTMLImageElement): EdgeCrop | null {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (!naturalWidth || !naturalHeight) return null;

  const maxEdge = 480;
  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, width, height);
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    return cropFromPixels(imageData.data, width, height, 4);
  } catch {
    return null;
  }
}
