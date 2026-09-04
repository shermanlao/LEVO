/** Always prepended so a 3D product photo cannot override a weak “2D” line in the template. */
export const SIZE_DRAWING_VIEW_LOCK = [
  'OUTPUT: flat 2D orthographic elevation (manufacturer cut-sheet), NOT a 3D picture.',
  'The attached image is a 3D product PHOTO for outline identity only. Do NOT copy its camera angle, perspective, isometric look, pictorial depth, or 3D shading.',
  'Forbidden views: 3D, isometric, axonometric, perspective, vanishing points, foreshortening, tilted/oblique pictorial.',
  'Draw a true side elevation: simple 2D outlines on white, with dimension arrows. Flatten heat-sink fins and the rim to a 2D profile.',
].join(' ');

export const SIZE_DRAWING_STYLE_LOCK = [
  'A STYLE REFERENCE drawing is attached as the first image (<IMAGE_0>). Copy its 2D line weight, dimension-arrow style, and white background only — do not copy that fixture.',
  'The product photograph is the second image (<IMAGE_1>). Flatten that product to a 2D orthographic elevation in the style of <IMAGE_0>.',
  'OUTPUT: flat 2D manufacturer cut-sheet. Forbidden: 3D, isometric, axonometric, perspective, vanishing points, foreshortening.',
].join(' ');

export const DEFAULT_SIZE_DRAWING_PROMPT = [
  'Create a clean 2D technical size / dimension drawing of this lighting fixture.',
  'This must look like a datasheet elevation (front/side profile), not a sketch of the photograph.',
  'Use ONLY the dimensions provided below — do not invent extra measurements or labels.',
  'Simple orthographic product outline with dimension arrows for the provided sizes.',
  'CRITICAL: Never paint user chat text, correction notes, or meta commentary onto the image.',
  'Forbidden examples of on-image text: "labelled incorrectly", "include the…", "fix", "also", or any sentence that is an instruction.',
  'Dimension callouts must be short technical labels only (e.g. Dia500mm, H80mm, W300mm) taken from the canonical size list — never paraphrase the edit request.',
  'Keep a plain white or transparent background. No lifestyle scenes, shadows, logos, or marketing copy.',
  'Canonical size dimensions (these are the ONLY measurement strings allowed on the drawing): {{size}}',
  '{{cuthole_line}}',
  '{{hints_line}}',
].join('\n');

export const DEFAULT_SIZE_DRAWING_REFINE_PROMPT = [
  'You are editing an existing technical size drawing of a lighting fixture.',
  'Keep (or convert to) a flat 2D orthographic elevation. If the current image is 3D, isometric, or perspective, flatten it to a 2D side elevation — do not preserve pictorial depth.',
  'The following is an EDIT INSTRUCTION for you (the model). Do NOT render this instruction as text in the image:',
  'INSTRUCTION: {{instruction}}',
  'Interpret the instruction and update the drawing accordingly.',
  'Preserve the 2D outline except where the change requires otherwise.',
  'Do not invent extra measurements beyond what is already shown or listed below.',
  'CRITICAL: Never paint user chat text, correction notes, or meta commentary onto the image.',
  'Forbidden examples of on-image text: "labelled incorrectly", "include the…", "fix", "also", or any sentence that is an instruction.',
  'Dimension callouts must be short technical labels only (e.g. Dia500mm, H80mm, W300mm) taken from the canonical size list — never paraphrase the edit request.',
  'Keep a plain white or transparent background. No lifestyle scenes, shadows, logos, or marketing copy.',
  'Canonical size dimensions (these are the ONLY measurement strings allowed on the drawing): {{size}}',
  '{{cuthole_line}}',
  '{{hints_line}}',
  'Output a clearly updated 2D elevation that visibly reflects the requested change, with correct dimension labels only.',
].join('\n');

export function fillPromptTemplate(template: string, vars: Record<string, string>): string {
  return template
    .replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function sizeDrawingPromptVars(opts: {
  size: string;
  cuthole?: string | null;
  hints?: string | null;
  instruction?: string | null;
}): Record<string, string> {
  const cuthole = opts.cuthole?.trim() || '';
  const hints = opts.hints?.trim() || '';
  return {
    size: opts.size.trim(),
    cuthole,
    cuthole_line: cuthole ? `Cut hole size (keep accurate if shown): ${cuthole}` : '',
    hints,
    hints_line: hints ? `Organization notes: ${hints}` : '',
    instruction: opts.instruction?.trim() || '',
  };
}
