import { compactAiImageDataUrl, resolveAiSourceImageDataUrl } from './aiImageDataUrl';
import {
  generateOrEditImage,
  PRODUCT_PHOTO_STYLE_IMAGE_PART_LABELS,
} from './aiImageGeneration';
import { fillProductPhotoStylePrompt } from './productPhotoStylePrompts';
import {
  getOrCreateAiSettings,
  getParsingHints,
  getProductPhotoStylePromptTemplate,
  requireImageAiCredentials,
} from './resolveCredentials';
import { readProductPhotoStyleDataUrl } from './aiStyleImage';

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
  const template = await getProductPhotoStylePromptTemplate();
  const result = await generateOrEditImage({
    creds,
    prompt: fillProductPhotoStylePrompt(template, hints),
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
