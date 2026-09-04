import type { ImageFrame } from '@/lib/image-frames';

export type CutboardTransform = {
  /** 1 = contain (whole photo visible); higher zooms in */
  zoom: number;
  /** Frame-pixel offset of the image top-left */
  offsetX: number;
  offsetY: number;
};

export async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image for crop'));
    img.src = src;
  });
  return img;
}

export function containScale(imgW: number, imgH: number, frameW: number, frameH: number): number {
  return Math.min(frameW / imgW, frameH / imgH);
}

export function coverScale(imgW: number, imgH: number, frameW: number, frameH: number): number {
  return Math.max(frameW / imgW, frameH / imgH);
}

export function displayScale(
  zoom: number,
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number
): number {
  return containScale(imgW, imgH, frameW, frameH) * zoom;
}

export function coverZoom(imgW: number, imgH: number, frameW: number, frameH: number): number {
  const contain = containScale(imgW, imgH, frameW, frameH);
  if (!contain) return 1;
  return coverScale(imgW, imgH, frameW, frameH) / contain;
}

export function maxCutboardZoom(imgW: number, imgH: number, frameW: number, frameH: number): number {
  return Math.max(4, coverZoom(imgW, imgH, frameW, frameH) * 3);
}

export function centeredContainOffset(
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number
): { offsetX: number; offsetY: number } {
  const scale = containScale(imgW, imgH, frameW, frameH);
  return {
    offsetX: (frameW - imgW * scale) / 2,
    offsetY: (frameH - imgH * scale) / 2,
  };
}

export function clampOffset(
  zoom: number,
  offsetX: number,
  offsetY: number,
  imgW: number,
  imgH: number,
  frameW: number,
  frameH: number
): { offsetX: number; offsetY: number } {
  const scale = displayScale(zoom, imgW, imgH, frameW, frameH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const clampAxis = (size: number, frame: number, value: number) => {
    if (size >= frame) {
      const min = frame - size;
      return Math.min(0, Math.max(min, value));
    }
    return Math.min(frame - size, Math.max(0, value));
  };
  return {
    offsetX: clampAxis(drawW, frameW, offsetX),
    offsetY: clampAxis(drawH, frameH, offsetY),
  };
}

function croppedFileName(original: string, mime: string): string {
  const base = original.replace(/\.[^.]+$/, '') || 'image';
  const ext = mime === 'image/png' ? 'png' : 'jpg';
  return `${base}.${ext}`;
}

export async function cropImageToFrameFile(
  imageSrc: string,
  frame: ImageFrame,
  transform: CutboardTransform,
  frameW: number,
  frameH: number,
  originalName = 'image.jpg'
): Promise<File> {
  const img = await loadImageElement(imageSrc);
  const outScale = Math.min(1, frame.maxEdge / Math.max(frameW, frameH));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(frameW * outScale));
  canvas.height = Math.max(1, Math.round(frameH * outScale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  if (frame.mime === 'image/jpeg') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  const scale = displayScale(transform.zoom, img.naturalWidth, img.naturalHeight, frameW, frameH);
  const k = canvas.width / frameW;
  ctx.drawImage(
    img,
    transform.offsetX * k,
    transform.offsetY * k,
    img.naturalWidth * scale * k,
    img.naturalHeight * scale * k
  );
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (next) => (next ? resolve(next) : reject(new Error('Failed to crop image'))),
      frame.mime,
      frame.mime === 'image/jpeg' ? 0.92 : undefined
    );
  });
  return new File([blob], croppedFileName(originalName, frame.mime), { type: frame.mime });
}
