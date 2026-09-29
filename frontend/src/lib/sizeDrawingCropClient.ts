import { loadImageElement } from '@/lib/image-cutboard';

export type NormalizedBbox = { x: number; y: number; width: number; height: number };

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:')) return imageUrl;
  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Failed to load image (${res.status})`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(blob);
  });
}

export async function imageUrlToJpegDataUrl(
  imageUrl: string,
  maxEdge = 1600,
  quality = 0.85
): Promise<string> {
  const dataUrl = await imageUrlToDataUrl(imageUrl);
  const img = await loadImageElement(dataUrl);
  const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth, img.naturalHeight, 1));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function cropImageUrlToDataUrl(
  imageUrl: string,
  bbox: NormalizedBbox,
  maxEdge = 1600
): Promise<string> {
  const dataUrl = await imageUrlToDataUrl(imageUrl);
  const img = await loadImageElement(dataUrl);
  const sx = Math.floor(bbox.x * img.naturalWidth);
  const sy = Math.floor(bbox.y * img.naturalHeight);
  const sw = Math.max(1, Math.ceil(bbox.width * img.naturalWidth));
  const sh = Math.max(1, Math.ceil(bbox.height * img.naturalHeight));
  const scale = Math.min(1, maxEdge / Math.max(sw, sh));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

export type PadBox = {
  canvasW: number;
  canvasH: number;
  drawW: number;
  drawH: number;
  dx: number;
  dy: number;
};

export type PaddedFrame = {
  dataUrl: string;
  /** `horizontal` = blank canvas on the left and right. `vertical` = above and below. */
  axis: 'horizontal' | 'vertical' | 'none';
  /** Where the original photo sits inside `dataUrl`. */
  box?: PadBox;
};

/**
 * Fit the photo inside a target width/height ratio without scaling it non-uniformly.
 * The fixture stays centered at its own aspect. Blank canvas is only the short axis,
 * so a later outpaint can extend the background to the placeholder.
 */
export async function padImageToAspect(
  imageUrl: string,
  ratio: number,
  maxEdge = 1600,
  opts?: { horizontalOnly?: boolean }
): Promise<PaddedFrame> {
  if (!(ratio > 0)) throw new Error('Frame ratio is required');
  const dataUrl = await imageUrlToDataUrl(imageUrl);
  const img = await loadImageElement(dataUrl);
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  if (!srcW || !srcH) throw new Error('Image has no size');
  const srcRatio = srcW / srcH;
  if (Math.abs(srcRatio - ratio) / ratio < 0.015) {
    return { dataUrl, axis: 'none' };
  }
  if (opts?.horizontalOnly) {
    if (srcRatio > ratio) return { dataUrl, axis: 'none' };
    return drawPaddedFrame(img, dataUrl, fitHorizontalFrame(srcW, srcH, ratio, maxEdge));
  }

  let canvasW: number;
  let canvasH: number;
  if (srcRatio < ratio) {
    canvasH = Math.min(srcH, maxEdge);
    canvasW = Math.max(1, Math.round(canvasH * ratio));
    if (canvasW > maxEdge) {
      canvasW = maxEdge;
      canvasH = Math.max(1, Math.round(canvasW / ratio));
    }
  } else {
    canvasW = Math.min(srcW, maxEdge);
    canvasH = Math.max(1, Math.round(canvasW / ratio));
    if (canvasH > maxEdge) {
      canvasH = maxEdge;
      canvasW = Math.max(1, Math.round(canvasH * ratio));
    }
  }

  const scale = Math.min(canvasW / srcW, canvasH / srcH);
  const drawW = Math.max(1, Math.round(srcW * scale));
  const drawH = Math.max(1, Math.round(srcH * scale));
  const dx = Math.round((canvasW - drawW) / 2);
  const dy = Math.round((canvasH - drawH) / 2);
  return drawPaddedFrame(img, dataUrl, { canvasW, canvasH, drawW, drawH, dx, dy });
}

/** Keep the photo's full height and add blank canvas only on the left and right. */
function fitHorizontalFrame(srcW: number, srcH: number, ratio: number, maxEdge: number) {
  let canvasH = Math.min(srcH, maxEdge);
  let canvasW = Math.max(1, Math.round(canvasH * ratio));
  if (canvasW > maxEdge) {
    canvasW = maxEdge;
    canvasH = Math.max(1, Math.round(canvasW / ratio));
  }
  const scale = canvasH / srcH;
  const drawH = canvasH;
  const drawW = Math.max(1, Math.round(srcW * scale));
  const dx = Math.round((canvasW - drawW) / 2);
  return { canvasW, canvasH, drawW, drawH, dx, dy: 0 };
}

function drawPaddedFrame(img: HTMLImageElement, sourceDataUrl: string, box: PadBox): PaddedFrame {
  const axis: PaddedFrame['axis'] = box.dx > 1 ? 'horizontal' : box.dy > 1 ? 'vertical' : 'none';
  if (axis === 'none') return { dataUrl: sourceDataUrl, axis };
  const canvas = document.createElement('canvas');
  canvas.width = box.canvasW;
  canvas.height = box.canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, box.canvasW, box.canvasH);
  ctx.drawImage(img, box.dx, box.dy, box.drawW, box.drawH);
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), axis, box };
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const match = dataUrl.trim().match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) throw new Error('Invalid data URL');
  const bytes = atob(match[2].replace(/\s/g, ''));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const mime = match[1].trim().toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].trim();
  return new File([arr], filename, { type: mime });
}
