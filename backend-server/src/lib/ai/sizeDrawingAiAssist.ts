import { generateOrEditImage } from './aiImageGeneration';
import { getOrCreateAiSettings, getParsingHints, getSizeDrawingPromptTemplates, resolveImageAiCredentials } from './resolveCredentials';
import { fillPromptTemplate, SIZE_DRAWING_STYLE_LOCK, SIZE_DRAWING_VIEW_LOCK, sizeDrawingPromptVars } from './sizeDrawingPrompts';
import { readSizeDrawingStyleDataUrl } from './sizeDrawingStyleImage';

export async function generateSizeDrawing(opts: {
  imageDataUrl: string;
  size: string;
  cuthole?: string | null;
  refineInstruction?: string | null;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.size?.trim()) throw new Error('Size dimensions are required');
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Cropped image data URL is required');

  const creds = await resolveImageAiCredentials('size_drawing_generate');
  if (!creds) throw new Error('AI is not configured');
  const hints = await getParsingHints();
  const templates = await getSizeDrawingPromptTemplates();
  const row = await getOrCreateAiSettings();
  const styleImageDataUrl = readSizeDrawingStyleDataUrl(String(row.get('size_drawing_style_image') || ''));
  const prompt = [
    styleImageDataUrl ? SIZE_DRAWING_STYLE_LOCK : SIZE_DRAWING_VIEW_LOCK,
    fillPromptTemplate(
      opts.refineInstruction?.trim() ? templates.refine : templates.generate,
      sizeDrawingPromptVars({
        size: opts.size,
        cuthole: opts.cuthole,
        hints,
        instruction: opts.refineInstruction,
      })
    ),
  ].join('\n');
  const result = await generateOrEditImage({
    creds,
    prompt,
    sourceImageDataUrl: opts.imageDataUrl,
    extraImageDataUrls: styleImageDataUrl ? [styleImageDataUrl] : [],
    usageCtx: {
      feature: 'size_drawing_generate',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
