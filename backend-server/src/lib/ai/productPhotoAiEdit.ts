import { generateOrEditImage } from './aiImageGeneration';
import { getParsingHints, resolveImageAiCredentials } from './resolveCredentials';

function buildProductPhotoEditPrompt(opts: {
  instruction: string;
  photoType?: string | null;
  hints?: string;
}): string {
  const slotHint = opts.photoType?.trim()
    ? `This image is the product "${opts.photoType.trim()}" photo slot.`
    : 'This is a product catalog photo.';
  const hintLine = opts.hints?.trim() ? `Organization notes: ${opts.hints.trim()}` : null;
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
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.instruction?.trim()) throw new Error('Edit instruction is required');
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Image data URL is required');
  const creds = await resolveImageAiCredentials('product_photo_edit');
  if (!creds) throw new Error('AI is not configured');
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: buildProductPhotoEditPrompt({ ...opts, hints }),
    sourceImageDataUrl: opts.imageDataUrl,
    usageCtx: {
      feature: 'product_photo_edit',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
