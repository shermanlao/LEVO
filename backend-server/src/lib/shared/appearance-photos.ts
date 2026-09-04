import { APPEARANCE_NA, isAppearanceNa, formatSpecValue } from './product-specs';
import {
  optionText,
  valuesEqual,
  variantKindLabel,
  type SeriesOptionDto,
} from './series-options';

export { APPEARANCE_NA, isAppearanceNa };

export const APPEARANCE_KINDS = ['colour', 'trim_color', 'reflector_finish'] as const;
export type AppearanceKind = (typeof APPEARANCE_KINDS)[number];

export type AppearanceCombo = {
  colour: string;
  trim_color: string;
  reflector_finish: string;
};

export type AppearancePhotoDto = AppearanceCombo & {
  id?: number;
  series_id?: number;
  main_image_A: string;
  source_product_id?: number | null;
  generated_by_ai?: boolean;
};

const PROMPT_PART: Record<AppearanceKind, string> = {
  colour: 'Housing/body finish',
  trim_color: 'Trim/bezel',
  reflector_finish: 'Inner reflector',
};

export function isAppearanceKind(kind: string): boolean {
  return (APPEARANCE_KINDS as readonly string[]).includes(kind);
}

function uniqueAxisValues(kind: AppearanceKind, list: SeriesOptionDto[]): string[] {
  const unique: string[] = [];
  for (const option of list) {
    const value = optionText(option.value);
    if (!value || isAppearanceNa(value)) continue;
    if (unique.some((item) => valuesEqual(kind, item, value))) continue;
    unique.push(value);
  }
  return unique;
}

export function appearanceAxisValues(
  grouped: Record<string, SeriesOptionDto[]>,
  kind: AppearanceKind
): string[] {
  return uniqueAxisValues(kind, grouped[kind] || []);
}

export function appearanceKindInUse(
  grouped: Record<string, SeriesOptionDto[]>,
  kind: AppearanceKind
): boolean {
  return appearanceAxisValues(grouped, kind).length > 0;
}

export function appearanceComboRows(grouped: Record<string, SeriesOptionDto[]>): AppearanceCombo[] {
  const axes = APPEARANCE_KINDS.filter((kind) => appearanceKindInUse(grouped, kind));
  if (!axes.length) return [];
  let rows: AppearanceCombo[] = [{ colour: '', trim_color: '', reflector_finish: '' }];
  for (const kind of axes) {
    const values = appearanceAxisValues(grouped, kind);
    const next: AppearanceCombo[] = [];
    for (const row of rows) {
      for (const value of values) {
        next.push({ ...row, [kind]: value });
      }
    }
    rows = next;
  }
  return rows;
}

export function normalizeAppearanceCombo(input: Partial<AppearanceCombo> | Record<string, unknown>): AppearanceCombo {
  const combo: AppearanceCombo = { colour: '', trim_color: '', reflector_finish: '' };
  for (const kind of APPEARANCE_KINDS) {
    const value = optionText((input as Record<string, unknown>)[kind]);
    combo[kind] = value && !isAppearanceNa(value) ? value : '';
  }
  return combo;
}

export function appearanceComboKey(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  return `${n.colour}|${n.trim_color}|${n.reflector_finish}`;
}

function fieldMatches(stored: string, wanted: string, kind: AppearanceKind): boolean {
  const a = optionText(stored);
  const b = optionText(wanted);
  if (!a && !b) return true;
  if (!a || !b) return false;
  return valuesEqual(kind, a, b);
}

export function findExactAppearancePhoto(
  photos: AppearancePhotoDto[] | null | undefined,
  combo: AppearanceCombo | Record<string, unknown>
): AppearancePhotoDto | null {
  const key = appearanceComboKey(combo as AppearanceCombo);
  return (
    (photos || []).find(
      (photo) => optionText(photo.main_image_A) && appearanceComboKey(photo) === key
    ) || null
  );
}

export function unusedAppearancePhotos(
  photos: AppearancePhotoDto[] | null | undefined,
  combos: AppearanceCombo[]
): AppearancePhotoDto[] {
  const keys = new Set(combos.map((combo) => appearanceComboKey(combo)));
  return (photos || []).filter(
    (photo) => optionText(photo.main_image_A) && !keys.has(appearanceComboKey(photo))
  );
}

export function familyAppearancePhotoRows(
  grouped: Record<string, SeriesOptionDto[]>,
  photos: AppearancePhotoDto[] | null | undefined
): Array<{ combo: AppearanceCombo; photo: AppearancePhotoDto }> {
  return appearanceComboRows(grouped)
    .map((combo) => {
      const photo = findExactAppearancePhoto(photos, combo);
      return photo ? { combo, photo } : null;
    })
    .filter((row): row is { combo: AppearanceCombo; photo: AppearancePhotoDto } => Boolean(row));
}

export function findAppearancePhoto(
  photos: AppearancePhotoDto[] | null | undefined,
  selection: Record<string, unknown>
): AppearancePhotoDto | null {
  const list = (photos || []).filter((photo) => optionText(photo.main_image_A));
  if (!list.length) return null;
  const want = normalizeAppearanceCombo(selection);

  const matchKeys = (keys: AppearanceKind[]) =>
    list.find((photo) => keys.every((kind) => fieldMatches(photo[kind], want[kind], kind))) || null;

  const exact = matchKeys([...APPEARANCE_KINDS]);
  if (exact) return exact;
  const noReflector = matchKeys(['colour', 'trim_color']);
  if (noReflector) return noReflector;
  if (want.colour) {
    const finishOnly = list.find((photo) => fieldMatches(photo.colour, want.colour, 'colour'));
    if (finishOnly) return finishOnly;
  }
  if (want.trim_color) {
    const trimOnly = list.find((photo) => fieldMatches(photo.trim_color, want.trim_color, 'trim_color'));
    if (trimOnly) return trimOnly;
  }
  return null;
}

export function appearanceComboLabel(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  const parts: string[] = [];
  if (n.colour) parts.push(n.colour);
  if (n.trim_color) parts.push(`${n.trim_color} ${variantKindLabel('trim_color').toLowerCase()}`);
  if (n.reflector_finish) {
    parts.push(`${n.reflector_finish} ${variantKindLabel('reflector_finish').toLowerCase()}`);
  }
  return parts.join(' · ') || 'Appearance';
}

export function appearancePromptInstruction(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  const lines = APPEARANCE_KINDS.map((kind) => {
    const value = n[kind];
    if (!value) return null;
    return `- ${PROMPT_PART[kind]}: ${value}`;
  }).filter((line): line is string => Boolean(line));
  if (!lines.length) return '';
  return [
    'Keep the camera angle, background, glass, chrome, and product identity.',
    'Change only the listed appearance parts of this lighting fixture:',
    ...lines,
    'Do not change product size, add text, or invent extra parts.',
  ].join('\n');
}

export function appearancePromptPreview(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  return APPEARANCE_KINDS.map((kind) => {
    const value = n[kind];
    if (!value) return null;
    return `${formatSpecValue(value) || value}`;
  })
    .filter(Boolean)
    .join(' / ');
}
