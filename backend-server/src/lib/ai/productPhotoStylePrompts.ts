import { fillPromptTemplate } from './sizeDrawingPrompts';

/** Always prepended so a custom template cannot turn Match catalog style into a paste of the reference fixture. */
export const PRODUCT_PHOTO_STYLE_LOCK = [
  'Edit <IMAGE_0> only. That is the PRODUCT PHOTO that must remain in the output.',
  '<IMAGE_1> is a STYLE REFERENCE of a different fixture. Do not copy, paste, clone, or substitute that product.',
].join(' ');

export const DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT = [
  'Restyle <IMAGE_0> to match the LOOK of <IMAGE_1>: lighting, background, contrast, color grade, and studio framing feel.',
  'Keep the <IMAGE_0> fixture identity, shape, finish, mounting, and camera viewpoint.',
  'Do not flatten the product into a 2D line drawing or technical elevation.',
  'Do not invent a different product, change finish colors, or add text onto the image.',
  '{{hints_line}}',
  'Output a catalog photo of the <IMAGE_0> fixture with the <IMAGE_1> look.',
].join('\n');

export function productPhotoStylePromptVars(hints?: string | null): Record<string, string> {
  const trimmed = hints?.trim() || '';
  return {
    hints: trimmed,
    hints_line: trimmed ? `Organization notes: ${trimmed}` : '',
  };
}

export function fillProductPhotoStylePrompt(template: string, hints?: string | null): string {
  return [PRODUCT_PHOTO_STYLE_LOCK, fillPromptTemplate(template, productPhotoStylePromptVars(hints))]
    .filter(Boolean)
    .join('\n');
}
