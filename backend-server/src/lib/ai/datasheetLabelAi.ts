import { generateOrEditImage } from './aiImageGeneration';
import { getParsingHints, resolveImageAiCredentials } from './resolveCredentials';

function buildDatasheetLabelPrompt(opts: {
  text: string;
  instruction?: string | null;
  hints?: string;
}): string {
  const copy = opts.text.trim();
  const refine = opts.instruction?.trim();
  const hintLine = opts.hints?.trim() ? `Organization notes: ${opts.hints.trim()}` : null;
  return [
    'Create a square lighting-catalog datasheet badge icon.',
    'Solid black square fill, sharp corners, no border, no shadow, no rounded corners, no 3D.',
    'White bold condensed sans-serif text centered in the square.',
    `The badge text must be exactly: ${copy}`,
    'If the text is long or naturally two lines (for example 220-240V AC), stack it on two centered lines.',
    'No extra symbols, no product photo, no QR code, no logo, no background around the square.',
    'Output a perfectly square graphic matching manufacturer datasheet rating badges.',
    refine ? `Edit instruction (do not paint this text onto the image): ${refine}` : null,
    hintLine,
  ]
    .filter(Boolean)
    .join('\n');
}

export async function generateDatasheetLabel(opts: {
  text: string;
  instruction?: string | null;
  imageDataUrl?: string | null;
}): Promise<{ imageDataUrl: string; mimeType: string }> {
  if (!opts.text?.trim()) throw new Error('Label text is required');
  const source = opts.imageDataUrl?.startsWith('data:') ? opts.imageDataUrl : null;
  const creds = await resolveImageAiCredentials('datasheet_label_generate');
  if (!creds) throw new Error('AI is not configured');
  const hints = await getParsingHints();
  const result = await generateOrEditImage({
    creds,
    prompt: buildDatasheetLabelPrompt({ text: opts.text, instruction: opts.instruction, hints }),
    sourceImageDataUrl: source,
    usageCtx: {
      feature: 'datasheet_label_generate',
      provider: creds.provider,
      modelId: creds.modelId,
    },
  });
  return { imageDataUrl: result.dataUrl, mimeType: result.mimeType };
}
