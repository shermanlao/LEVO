import { generateOrEditImage, SIZE_DRAWING_IMAGE_PART_LABELS } from './aiImageGeneration';
import { getOrCreateAiSettings, getParsingHints, getSizeDrawingPromptTemplates, requireImageAiCredentials } from './resolveCredentials';
import { fillSizeDrawingPrompt, SIZE_DRAWING_STYLE_LOCK, SIZE_DRAWING_VIEW_LOCK } from './sizeDrawingPrompts';
import { readSizeDrawingStyleDataUrl } from './sizeDrawingStyleImage';

export async function generateSizeDrawing(opts: {
  imageDataUrl: string;
  size: string;
  cuthole?: string | null;
  description?: string | null;
  fixtureDescription?: string | null;
  refineInstruction?: string | null;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.size?.trim()) throw new Error('Size dimensions are required');
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Cropped image data URL is required');

  const creds = await requireImageAiCredentials('size_drawing_generate');
  const hints = await getParsingHints();
  const templates = await getSizeDrawingPromptTemplates();
  const row = await getOrCreateAiSettings();
  const styleImageDataUrl = readSizeDrawingStyleDataUrl(String(row.get('size_drawing_style_image') || ''));
  const prompt = [
    styleImageDataUrl ? SIZE_DRAWING_STYLE_LOCK : SIZE_DRAWING_VIEW_LOCK,
    fillSizeDrawingPrompt(opts.refineInstruction?.trim() ? templates.refine : templates.generate, {
      size: opts.size,
      cuthole: opts.cuthole,
      hints,
      instruction: opts.refineInstruction,
      description: opts.description,
      fixtureDescription: opts.fixtureDescription,
    }),
  ].join('\n');
  const result = await generateOrEditImage({
    creds,
    prompt,
    sourceImageDataUrl: opts.imageDataUrl,
    extraImageDataUrls: styleImageDataUrl ? [styleImageDataUrl] : [],
    imagePartLabels: SIZE_DRAWING_IMAGE_PART_LABELS,
    usageCtx: {
      feature: 'size_drawing_generate',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
