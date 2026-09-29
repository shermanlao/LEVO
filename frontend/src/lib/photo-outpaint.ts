import type { ImageFrame } from '@/lib/image-frames';
import { padImageToAspect } from '@/lib/sizeDrawingCropClient';

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
  return { dataUrl: data.imageDataUrl, extended: true, axis: padded.axis };
}
