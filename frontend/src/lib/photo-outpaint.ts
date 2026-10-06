import type { ImageFrame } from '@/lib/image-frames';
import { loadImageElement } from '@/lib/image-cutboard';
import { padImageToAspect, type PadBox } from '@/lib/sizeDrawingCropClient';
import {
  featherOriginalInto,
  sampleCeilingGrey,
  unifyCatalogCardGrey,
} from '@shared/catalog-card-grey';

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

/** Keep the fixture from the original photo; feather the ceiling into the outpaint so there is no box. */
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
  const dest = ctx.getImageData(0, 0, box.canvasW, box.canvasH);
  const origCanvas = document.createElement('canvas');
  origCanvas.width = box.canvasW;
  origCanvas.height = box.canvasH;
  const origCtx = origCanvas.getContext('2d');
  if (!origCtx) throw new Error('Canvas unavailable');
  origCtx.drawImage(padded, 0, 0, box.canvasW, box.canvasH);
  const orig = origCtx.getImageData(0, 0, box.canvasW, box.canvasH);
  const grey = sampleCeilingGrey(orig.data, orig.width, orig.height, { dx: box.dx, drawW: box.drawW });
  featherOriginalInto(dest.data, orig.data, dest.width, dest.height, { dx: box.dx, drawW: box.drawW });
  unifyCatalogCardGrey(dest.data, dest.width, dest.height, { dx: box.dx, drawW: box.drawW }, grey);
  ctx.putImageData(dest, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}
