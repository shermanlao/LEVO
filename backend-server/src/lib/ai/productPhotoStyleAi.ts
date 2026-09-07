import { compactAiImageDataUrl, resolveAiSourceImageDataUrl } from './aiImageDataUrl';
import {
  generateOrEditImage,
  PRODUCT_PHOTO_STYLE_IMAGE_PART_LABELS,
} from './aiImageGeneration';
import { getOrCreateAiSettings, getParsingHints, requireImageAiCredentials } from './resolveCredentials';
import { readProductPhotoStyleDataUrl } from './aiStyleImage';

function buildProductPhotoStylePrompt(hints?: string): string {
  const hintLine = hints?.trim() ? `Organization notes: ${hints.trim()}` : null;
  return [
    'Edit <IMAGE_0> only. That is the PRODUCT PHOTO that must remain in the output.',
    'Restyle <IMAGE_0> to match the LOOK of <IMAGE_1>: lighting, background, contrast, color grade, and studio framing feel.',
    '<IMAGE_1> is a STYLE REFERENCE of a different fixture. Do not copy, paste, clone, or substitute that product.',
    'Keep the <IMAGE_0> fixture identity, shape, finish, mounting, and camera viewpoint.',
    'Do not flatten the product into a 2D line drawing or technical elevation.',
    'Do not invent a different product, change finish colors, or add text onto the image.',
    hintLine,
    'Output a catalog photo of the <IMAGE_0> fixture with the <IMAGE_1> look.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function stylizeProductPhoto(opts: {
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  const sourceImageDataUrl = await resolveAiSourceImageDataUrl(opts);
  const creds = await requireImageAiCredentials('product_photo_edit');
  const row = await getOrCreateAiSettings();
  const styleRaw = readProductPhotoStyleDataUrl(String(row.get('product_photo_style_image') || ''));
  if (!styleRaw) throw new Error('Catalog photo style reference is required');
  const styleImageDataUrl = await compactAiImageDataUrl(styleRaw);
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: buildProductPhotoStylePrompt(hints),
    sourceImageDataUrl,
    extraImageDataUrls: [styleImageDataUrl],
    imagePartLabels: PRODUCT_PHOTO_STYLE_IMAGE_PART_LABELS,
    sourceFirst: true,
    usageCtx: {
      feature: 'product_photo_style',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
