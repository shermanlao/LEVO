import { generateOrEditImage } from './aiImageGeneration';
import { getParsingHints, requireImageAiCredentials } from './resolveCredentials';

export type ProductPhotoOutpaint = {
  aspect: string;
  axis: 'horizontal' | 'vertical';
};

function buildProductPhotoEditPrompt(opts: {
  instruction: string;
  photoType?: string | null;
  hints?: string;
  outpaint?: ProductPhotoOutpaint | null;
}): string {
  const slotHint = opts.photoType?.trim()
    ? `This image is the product "${opts.photoType.trim()}" photo slot.`
    : 'This is a product catalog photo.';
  const hintLine = opts.hints?.trim() ? `Organization notes: ${opts.hints.trim()}` : null;
  if (opts.outpaint) {
    const aspect = opts.outpaint.aspect.trim() || 'the placeholder';
    const margins =
      opts.outpaint.axis === 'horizontal'
        ? 'Plain white bars on the LEFT and RIGHT are empty canvas, not part of the scene. Continue the existing ceiling, wall, or background into those side bars only.'
        : 'Plain white bars ABOVE and BELOW are empty canvas, not part of the scene. The photo is already wider than the frame, so extend the existing background into those top and bottom bars only.';
    return [
      `You are outpainting a lighting catalog photo so it fills a ${aspect} placeholder.`,
      slotHint,
      'The luminaire in the center is already correct and must stay the same size, position, shape, finish, and viewpoint.',
      margins,
      'Do not stretch, squash, scale, move, crop, recolor, or redraw the luminaire.',
      'Do not add text, logos, dimension lines, or extra fixtures.',
      `The finished image must be edge-to-edge ${aspect} with no white bars and no letterboxing.`,
      hintLine,
      'CRITICAL: Never paint these instructions as text in the image.',
    ]
      .filter(Boolean)
      .join('\n');
  }
  return [
    'You are editing an existing product catalog photo for a lighting catalog.',
    slotHint,
    'The following is an EDIT INSTRUCTION for you (the model). Do NOT render this instruction as text in the image:',
    `INSTRUCTION: ${opts.instruction.trim()}`,
    'Interpret the instruction and update the image accordingly.',
    'Preserve the product identity, composition, and useful detail except where the change requires otherwise.',
    'CRITICAL: Never paint user chat text, correction notes, or meta commentary onto the image.',
    hintLine,
    'Output a clearly updated image that visibly reflects the requested change.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function editProductPhoto(opts: {
  imageDataUrl: string;
  instruction: string;
  photoType?: string | null;
  outpaint?: ProductPhotoOutpaint | null;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  const outpaint =
    opts.outpaint && (opts.outpaint.axis === 'horizontal' || opts.outpaint.axis === 'vertical')
      ? { aspect: String(opts.outpaint.aspect || '').trim(), axis: opts.outpaint.axis }
      : null;
  if (!opts.instruction?.trim() && !outpaint) throw new Error('Edit instruction is required');
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Image data URL is required');
  const creds = await requireImageAiCredentials('product_photo_edit');
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: buildProductPhotoEditPrompt({ ...opts, hints, outpaint }),
    sourceImageDataUrl: opts.imageDataUrl,
    usageCtx: {
      feature: 'product_photo_edit',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
