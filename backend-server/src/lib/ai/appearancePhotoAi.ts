import { generateOrEditImage } from './aiImageGeneration';
import { getParsingHints, resolveImageAiCredentials } from './resolveCredentials';
import { appearancePromptInstruction, normalizeAppearanceCombo } from '../shared/appearance-photos';

export async function generateAppearancePhoto(opts: {
  imageDataUrl: string;
  colour?: string | null;
  trim_color?: string | null;
  reflector_finish?: string | null;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.imageDataUrl?.startsWith('data:')) throw new Error('Image data URL is required');
  const combo = normalizeAppearanceCombo({
    colour: opts.colour,
    trim_color: opts.trim_color,
    reflector_finish: opts.reflector_finish,
  });
  const instruction = appearancePromptInstruction(combo);
  if (!instruction) throw new Error('Finish, trim, or reflector is required');
  const creds = await resolveImageAiCredentials('appearance_photo_generate');
  if (!creds) throw new Error('AI is not configured');
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: [
      'You are editing an existing product catalog photo for a lighting catalog.',
      'The following is an EDIT INSTRUCTION for you (the model). Do NOT render this instruction as text in the image:',
      `INSTRUCTION: ${instruction}`,
      hints.trim() ? `Organization notes: ${hints.trim()}` : '',
      'CRITICAL: Never paint user chat text, correction notes, or meta commentary onto the image.',
      'Output a clearly updated image that visibly reflects the requested appearance change.',
    ]
      .filter(Boolean)
      .join('\n'),
    sourceImageDataUrl: opts.imageDataUrl,
    usageCtx: {
      feature: 'appearance_photo_generate',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
