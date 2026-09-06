import {
  generateOrEditImage,
  PRODUCT_PHOTO_STYLE_IMAGE_PART_LABELS,
} from './aiImageGeneration';
import { getOrCreateAiSettings, getParsingHints, resolveImageAiCredentials } from './resolveCredentials';
import { readProductPhotoStyleDataUrl } from './aiStyleImage';

function buildProductPhotoStylePrompt(hints?: string): string {
  const hintLine = hints?.trim() ? `Organization notes: ${hints.trim()}` : null;
  return [
    'You are restyling an existing product catalog photo for a lighting catalog.',
    'The first image is a STYLE REFERENCE. Copy only its look: lighting, background, contrast, color grade, and studio framing feel.',
    'The second image is the PRODUCT PHOTO to keep. Preserve this fixture identity, shape, finish, mounting, and camera viewpoint.',
    'Do not flatten the product into a 2D line drawing or technical elevation.',
    'Do not invent a different product, change finish colors, or add text onto the image.',
    hintLine,
    'Output a catalog photo of the same fixture that matches the style reference look.',
  ]
    .filter(Boolean)
    .join('\n');
}

export async function stylizeProductPhoto(opts: {
  imageDataUrl: string;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Image data URL is required');
  const creds = await resolveImageAiCredentials('product_photo_edit');
  if (!creds) throw new Error('AI is not configured');
  const row = await getOrCreateAiSettings();
  const styleImageDataUrl = readProductPhotoStyleDataUrl(String(row.get('product_photo_style_image') || ''));
  if (!styleImageDataUrl) throw new Error('Catalog photo style reference is required');
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: buildProductPhotoStylePrompt(hints),
    sourceImageDataUrl: opts.imageDataUrl,
    extraImageDataUrls: [styleImageDataUrl],
    imagePartLabels: PRODUCT_PHOTO_STYLE_IMAGE_PART_LABELS,
    usageCtx: {
      feature: 'product_photo_style',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
