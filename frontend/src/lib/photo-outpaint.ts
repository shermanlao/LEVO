import type { ImageFrame } from '@/lib/image-frames';
import { loadImageElement } from '@/lib/image-cutboard';
import { padImageToAspect, type PadBox } from '@/lib/sizeDrawingCropClient';

export type OutpaintResult = {
  dataUrl: string;
  /** True when the model was asked to continue the background into a new frame. */
  extended: boolean;
  axis: 'horizontal' | 'vertical' | 'none';
};

/** Fit a photo into a location frame by extending the background. The fixture is not stretched. */
export async function outpaintToFrame(
  imageUrl: string,
  frame: ImageFrame,
  opts?: { horizontalOnly?: boolean }
): Promise<OutpaintResult> {
  const padded = await padImageToAspect(imageUrl, frame.ratio, frame.maxEdge, opts);
  if (padded.axis === 'none') {
    return { dataUrl: padded.dataUrl, extended: false, axis: 'none' };
  }
  const res = await fetch('/api/admin/ai/edit-product-photo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageDataUrl: padded.dataUrl,
      instruction: '',
      photoType: frame.label,
      outpaint: { aspect: frame.label, axis: padded.axis },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string; imageDataUrl?: string };
  if (!res.ok) throw new Error(data.error || 'Extend failed');
  if (!data.imageDataUrl) throw new Error('Extend returned no image');
  const dataUrl =
    opts?.horizontalOnly && padded.box
      ? await keepOriginalPhoto(data.imageDataUrl, padded.dataUrl, padded.box)
      : data.imageDataUrl;
  return { dataUrl, extended: true, axis: padded.axis };
}

/** Paste the series photo back so only the side fill remains. Top and bottom stay unchanged. */
async function keepOriginalPhoto(extendedDataUrl: string, paddedDataUrl: string, box: PadBox): Promise<string> {
  const [extended, padded] = await Promise.all([
    loadImageElement(extendedDataUrl),
    loadImageElement(paddedDataUrl),
  ]);
  const canvas = document.createElement('canvas');
  canvas.width = box.canvasW;
  canvas.height = box.canvasH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(extended, 0, 0, box.canvasW, box.canvasH);
  matchSideColor(ctx, padded, box);
  ctx.drawImage(padded, box.dx, box.dy, box.drawW, box.drawH, box.dx, box.dy, box.drawW, box.drawH);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/** Shift each side strip so the pixels next to the photo match that edge, row by row. */
function matchSideColor(
  ctx: CanvasRenderingContext2D,
  padded: HTMLImageElement,
  box: PadBox
): void {
  const { canvasW, canvasH, dx, drawW } = box;
  const rightX = dx + drawW;
  if (dx < 2 && canvasW - rightX < 2) return;
  const source = document.createElement('canvas');
  source.width = canvasW;
  source.height = canvasH;
  const sourceCtx = source.getContext('2d');
  if (!sourceCtx) return;
  sourceCtx.drawImage(padded, 0, 0);
  const src = sourceCtx.getImageData(0, 0, canvasW, canvasH);
  const dst = ctx.getImageData(0, 0, canvasW, canvasH);
  const sample = Math.min(8, Math.max(1, drawW));
  if (dx >= 2) {
    shiftSide(dst.data, src.data, canvasW, canvasH, 0, dx, dx, dx + sample);
  }
  if (canvasW - rightX >= 2) {
    shiftSide(dst.data, src.data, canvasW, canvasH, rightX, canvasW, rightX - sample, rightX);
  }
  ctx.putImageData(dst, 0, 0);
}

function shiftSide(
  dst: Uint8ClampedArray,
  src: Uint8ClampedArray,
  width: number,
  height: number,
  sideX0: number,
  sideX1: number,
  edgeX0: number,
  edgeX1: number
): void {
  const seamW = Math.min(8, sideX1 - sideX0);
  const seamX0 = sideX0 === 0 ? sideX1 - seamW : sideX0;
  for (let y = 0; y < height; y++) {
    const edge = meanRgb(src, width, edgeX0, edgeX1, y);
    const seam = meanRgb(dst, width, seamX0, seamX0 + seamW, y);
    const dr = edge[0] - seam[0];
    const dg = edge[1] - seam[1];
    const db = edge[2] - seam[2];
    if (Math.abs(dr) < 1 && Math.abs(dg) < 1 && Math.abs(db) < 1) continue;
    for (let x = sideX0; x < sideX1; x++) {
      const i = (y * width + x) * 4;
      dst[i] = clampByte(dst[i] + dr);
      dst[i + 1] = clampByte(dst[i + 1] + dg);
      dst[i + 2] = clampByte(dst[i + 2] + db);
    }
  }
}

function meanRgb(data: Uint8ClampedArray, width: number, x0: number, x1: number, y: number): [number, number, number] {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let x = x0; x < x1; x++) {
    const i = (y * width + x) * 4;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n += 1;
  }
  if (!n) return [0, 0, 0];
  return [r / n, g / n, b / n];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
