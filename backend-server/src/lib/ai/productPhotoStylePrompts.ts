import { fillPromptTemplate } from './sizeDrawingPrompts';

/** Always prepended so a custom template cannot turn Match catalog style into a paste of the reference fixture. */
export const PRODUCT_PHOTO_STYLE_LOCK = [
  '<IMAGE_0> is the ORIGINAL PHOTO of this fixture. Keep that product’s true identity.',
  '<IMAGE_1> is the REFERENCE PHOTO of a different fixture. Copy website style only.',
  'Do not copy, paste, clone, or substitute the reference product.',
].join(' ');

/** Previous default. Stored copies are treated as empty so staff get the 3-step prompt. */
export const LEGACY_PRODUCT_PHOTO_STYLE_PROMPT = [
  'Restyle <IMAGE_0> to match the LOOK of <IMAGE_1>: lighting, background, contrast, color grade, and studio framing feel.',
  'Keep the <IMAGE_0> fixture identity, shape, finish, mounting, and camera viewpoint.',
  'Do not flatten the product into a 2D line drawing or technical elevation.',
  'Do not invent a different product, change finish colors, or add text onto the image.',
  '{{hints_line}}',
  'Use the physical description to keep this fixture’s type, size, trim, finish, and mounting.',
  'Output a catalog photo of the <IMAGE_0> fixture with the <IMAGE_1> look.',
].join('\n');

/** Same square frame as Main A / Main B (`IMAGE_FRAMES.product` on the frontend). */
export const PRODUCT_PHOTO_PLACEHOLDER = {
  aspect: '1:1',
  width: 1600,
  height: 1600,
  label: 'square catalog photo slot (Main A / Main B)',
} as const;

export function formatProductPhotoPlaceholderSize(size?: {
  aspect?: string;
  width?: number;
  height?: number;
  label?: string;
} | null): string {
  const aspect = String(size?.aspect || PRODUCT_PHOTO_PLACEHOLDER.aspect).trim() || PRODUCT_PHOTO_PLACEHOLDER.aspect;
  const width = Number(size?.width) > 0 ? Math.round(Number(size?.width)) : PRODUCT_PHOTO_PLACEHOLDER.width;
  const height = Number(size?.height) > 0 ? Math.round(Number(size?.height)) : PRODUCT_PHOTO_PLACEHOLDER.height;
  const label = String(size?.label || PRODUCT_PHOTO_PLACEHOLDER.label).trim() || PRODUCT_PHOTO_PLACEHOLDER.label;
  return `${width}×${height} px, ${aspect}, ${label}`;
}

/** 3-step prompt before placeholder size was included. Stored copies get the new default. */
export const LEGACY_THREE_STEP_PRODUCT_PHOTO_STYLE_PROMPT = [
  'You will receive:',
  '1) ORIGINAL PHOTO — <IMAGE_0> — the product shot of the fixture',
  '2) REFERENCE PHOTO — <IMAGE_1> — the target website style (installed look, framing, ceiling, lighting mood)',
  '3) FIXTURE DESCRIPTION — short product text for the original (finish, form, optics, IP, etc.)',
  '4) ORIGINAL PHOTO DESCRIPTION — a look at <IMAGE_0> written before this edit',
  '',
  'Goal: produce one website-ready image in the SAME STYLE as the reference, while keeping the ORIGINAL fixture’s true identity (shape, proportions, details from the original + descriptions).',
  '',
  'Before STEP 1, read the ORIGINAL PHOTO DESCRIPTION. If it is missing, first describe <IMAGE_0> yourself (visible face, angle, materials, trim/reflector, optics, hidden hardware to remove), then continue.',
  '',
  'Follow these 3 steps in order:',
  '',
  'STEP 1 — Remove hidden parts + cutout',
  '- From the ORIGINAL only, remove parts that would be hidden after install (springs, clips, upper housing, junction box, packaging, stands, etc.).',
  '- Keep the visible installed face of the fixture.',
  '- Remove studio background → clean transparent cutout.',
  '- Preserve original silhouette, diameter/scale, and viewing angle. Do not enlarge or reshape.',
  '',
  'STEP 2 — Polish the cutout only (no scene yet)',
  '- Beautify lighting and color only; do not redesign the product.',
  '- Match the FIXTURE DESCRIPTION (materials, trim/reflector language, optics).',
  '- If trim and reflector/housing are meant to read as one continuous form, keep that seamless (no fake extra rings, steps, or hard lips).',
  '- Keep only real product details from the original (e.g. a real inner ring at the lamp if present).',
  '- Crisp outer cutout edge; no jagged mask, no fringing.',
  '- Do NOT add springs/housing, ceiling, drop shadows under the product, or sticker/paste artifacts.',
  '',
  'STEP 3 — Place into the reference-style surround',
  '- Composite/render the polished cutout into a scene matching the REFERENCE PHOTO style (ceiling/wall material, camera distance, ambient light, grading).',
  '- Keep the fixture’s compact real-world scale vs the surround (same relative size language as a real install; do not blow up diameter).',
  '- Natural join where the fixture meets the surround (subtle real contact shadow OK).',
  '- No checkerboard, no cutout box, no colored fringe, no soft Photoshop halo.',
  '- Nothing that should be behind the finish surface may remain visible.',
  '',
  'Success criteria:',
  '- Looks like the REFERENCE style for the website',
  '- Still clearly the SAME fixture as the ORIGINAL + DESCRIPTION',
  '- Clean enough for product web use',
  '',
  '{{hints_line}}',
].join('\n');

export const DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT = [
  'You will receive:',
  '1) ORIGINAL PHOTO — <IMAGE_0> — the product shot of the fixture',
  '2) REFERENCE PHOTO — <IMAGE_1> — the target website style (installed look, framing, ceiling, lighting mood)',
  '3) FIXTURE DESCRIPTION — short product text for the original (finish, form, optics, IP, etc.)',
  '4) ORIGINAL PHOTO DESCRIPTION — a look at <IMAGE_0> written before this edit',
  '5) PLACEHOLDER SIZE — the website photo box this output must fill ({{placeholder_size}})',
  '',
  'Goal: produce one website-ready image in the SAME STYLE as the reference, while keeping the ORIGINAL fixture’s true identity (shape, proportions, details from the original + descriptions).',
  '',
  'Before STEP 1, read the ORIGINAL PHOTO DESCRIPTION. If it is missing, first describe <IMAGE_0> yourself (visible face, angle, materials, trim/reflector, optics, hidden hardware to remove), then continue.',
  '',
  'Follow these 3 steps in order:',
  '',
  'STEP 1 — Remove hidden parts + cutout',
  '- From the ORIGINAL only, remove parts that would be hidden after install (springs, clips, upper housing, junction box, packaging, stands, etc.).',
  '- Keep the visible installed face of the fixture.',
  '- Remove studio background → clean transparent cutout.',
  '- Preserve original silhouette, diameter/scale, and viewing angle. Do not enlarge or reshape.',
  '',
  'STEP 2 — Polish the cutout only (no scene yet)',
  '- Beautify lighting and color only; do not redesign the product.',
  '- Match the FIXTURE DESCRIPTION (materials, trim/reflector language, optics).',
  '- If trim and reflector/housing are meant to read as one continuous form, keep that seamless (no fake extra rings, steps, or hard lips).',
  '- Keep only real product details from the original (e.g. a real inner ring at the lamp if present).',
  '- Crisp outer cutout edge; no jagged mask, no fringing.',
  '- Do NOT add springs/housing, ceiling, drop shadows under the product, or sticker/paste artifacts.',
  '',
  'STEP 3 — Place into the reference-style surround',
  '- Composite/render the polished cutout into a scene matching the REFERENCE PHOTO style (ceiling/wall material, camera distance, ambient light, grading).',
  '- Output a square image that fills the catalog placeholder: {{placeholder_size}}. Do not letterbox, pad with empty bars, or stretch.',
  '- Keep the fixture’s compact real-world scale vs the surround (same relative size language as a real install; do not blow up diameter).',
  '- Natural join where the fixture meets the surround (subtle real contact shadow OK).',
  '- No checkerboard, no cutout box, no colored fringe, no soft Photoshop halo.',
  '- Nothing that should be behind the finish surface may remain visible.',
  '',
  'Success criteria:',
  '- Looks like the REFERENCE style for the website',
  '- Still clearly the SAME fixture as the ORIGINAL + DESCRIPTION',
  '- Clean enough for product web use',
  '',
  '{{hints_line}}',
].join('\n');

function normalizePromptText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function isLegacyProductPhotoStylePrompt(template: string): boolean {
  const stored = normalizePromptText(template);
  if (!stored) return false;
  return [LEGACY_PRODUCT_PHOTO_STYLE_PROMPT, LEGACY_THREE_STEP_PRODUCT_PHOTO_STYLE_PROMPT].some(
    (legacy) => stored === normalizePromptText(legacy)
  );
}

export function resolveProductPhotoStylePromptTemplate(stored: unknown): string {
  const raw = String(stored || '').trim();
  if (!raw || isLegacyProductPhotoStylePrompt(raw)) return DEFAULT_PRODUCT_PHOTO_STYLE_PROMPT;
  return raw;
}

export function productPhotoStylePromptVars(
  hints?: string | null,
  phrase?: string | null,
  photoDescription?: string | null,
  placeholderSize?: {
    aspect?: string;
    width?: number;
    height?: number;
    label?: string;
  } | null
): Record<string, string> {
  const trimmed = hints?.trim() || '';
  const description = phrase?.trim() || '';
  const seen = photoDescription?.trim() || '';
  const placeholder = formatProductPhotoPlaceholderSize(placeholderSize);
  return {
    hints: trimmed,
    hints_line: trimmed ? `Organization notes: ${trimmed}` : '',
    phrase: description,
    phrase_line: description
      ? `FIXTURE DESCRIPTION (from the series phrase template): ${description}`
      : '',
    photo_description: seen,
    photo_description_line: seen
      ? `ORIGINAL PHOTO DESCRIPTION (written from <IMAGE_0> before this edit): ${seen}`
      : 'ORIGINAL PHOTO DESCRIPTION: not available. Describe <IMAGE_0> yourself before STEP 1.',
    placeholder_size: placeholder,
    placeholder_size_line: `PLACEHOLDER SIZE — ${placeholder}. Fill this frame. Do not letterbox or stretch.`,
  };
}

export function fillProductPhotoStylePrompt(
  template: string,
  hints?: string | null,
  phrase?: string | null,
  photoDescription?: string | null,
  placeholderSize?: {
    aspect?: string;
    width?: number;
    height?: number;
    label?: string;
  } | null
): string {
  const vars = productPhotoStylePromptVars(hints, phrase, photoDescription, placeholderSize);
  const body = fillPromptTemplate(template, {
    ...vars,
    phrase_line: '',
    photo_description_line: '',
    placeholder_size_line: '',
  });
  return [
    PRODUCT_PHOTO_STYLE_LOCK,
    vars.phrase_line,
    vars.photo_description_line,
    vars.placeholder_size_line,
    body,
  ]
    .filter(Boolean)
    .join('\n');
}
