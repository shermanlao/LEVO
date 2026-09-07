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

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const match = dataUrl.trim().match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) throw new Error('Invalid data URL');
  const bytes = atob(match[2].replace(/\s/g, ''));
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const mime = match[1].trim().toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].trim();
  return new File([arr], filename, { type: mime });
}
