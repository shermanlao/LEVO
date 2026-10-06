import { APPEARANCE_NA, isAppearanceNa, formatSpecValue } from './product-specs';
import {
  optionText,
  SIZE_KIND,
  valuesEqual,
  variantKindLabel,
  type SeriesOptionDto,
} from './series-options';

export { APPEARANCE_NA, isAppearanceNa };

export const APPEARANCE_KINDS = ['colour', 'trim_color', 'reflector_finish'] as const;
export type AppearanceKind = (typeof APPEARANCE_KINDS)[number];

export const PHOTO_TAG_KINDS = [...APPEARANCE_KINDS, 'size'] as const;
export type PhotoTagKind = (typeof PHOTO_TAG_KINDS)[number];

export type AppearanceCombo = {
  colour: string;
  trim_color: string;
  reflector_finish: string;
  size: string;
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

export function isPhotoTagKind(kind: string): kind is PhotoTagKind {
  return (PHOTO_TAG_KINDS as readonly string[]).includes(kind);
}

function optionKind(kind: PhotoTagKind): string {
  return kind === 'size' ? SIZE_KIND : kind;
}

function uniqueAxisValues(kind: string, list: SeriesOptionDto[]): string[] {
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
  kind: PhotoTagKind
): string[] {
  const axis = optionKind(kind);
  return uniqueAxisValues(axis, grouped[axis] || []);
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
  let rows: AppearanceCombo[] = [{ colour: '', trim_color: '', reflector_finish: '', size: '' }];
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

export function normalizeAppearanceCombo(
  input: Partial<AppearanceCombo> | Record<string, unknown>
): AppearanceCombo {
  const rec = input as Record<string, unknown>;
  const combo: AppearanceCombo = { colour: '', trim_color: '', reflector_finish: '', size: '' };
  for (const kind of PHOTO_TAG_KINDS) {
    const raw = kind === 'size' ? rec.size ?? rec.dimensions : rec[kind];
    const value = optionText(raw);
    combo[kind] = value && !isAppearanceNa(value) ? value : '';
  }
  return combo;
}

export function appearanceComboKey(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  return `${n.colour}|${n.trim_color}|${n.reflector_finish}|${n.size}`;
}

export function countPhotoTags(photo: AppearanceCombo | Record<string, unknown>): number {
  const n = normalizeAppearanceCombo(photo);
  return PHOTO_TAG_KINDS.reduce((count, kind) => count + (n[kind] ? 1 : 0), 0);
}

function fieldMatches(stored: string, wanted: string, kind: PhotoTagKind): boolean {
  const a = optionText(stored);
  const b = optionText(wanted);
  if (!a) return true;
  if (!b) return false;
  return valuesEqual(optionKind(kind), a, b);
}

export function photoTagsCompatible(
  photo: AppearanceCombo | Record<string, unknown>,
  selection: Record<string, unknown>
): boolean {
  const stored = normalizeAppearanceCombo(photo);
  const want = normalizeAppearanceCombo(selection);
  return PHOTO_TAG_KINDS.every((kind) => fieldMatches(stored[kind], want[kind], kind));
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

export function photoTagsOnSeries(
  photo: AppearanceCombo | Record<string, unknown>,
  grouped: Record<string, SeriesOptionDto[]>
): boolean {
  const tags = normalizeAppearanceCombo(photo);
  return PHOTO_TAG_KINDS.every((kind) => {
    const value = tags[kind];
    if (!value) return true;
    const values = appearanceAxisValues(grouped, kind);
    return values.some((item) => valuesEqual(optionKind(kind), item, value));
  });
}

export function unusedAppearancePhotos(
  photos: AppearancePhotoDto[] | null | undefined,
  grouped: Record<string, SeriesOptionDto[]>
): AppearancePhotoDto[] {
  return (photos || []).filter(
    (photo) => optionText(photo.main_image_A) && !photoTagsOnSeries(photo, grouped)
  );
}

export function familyAppearancePhotoRows(
  grouped: Record<string, SeriesOptionDto[]>,
  photos: AppearancePhotoDto[] | null | undefined
): Array<{ combo: AppearanceCombo; photo: AppearancePhotoDto }> {
  return (photos || [])
    .filter((photo) => optionText(photo.main_image_A) && photoTagsOnSeries(photo, grouped))
    .map((photo) => ({ combo: normalizeAppearanceCombo(photo), photo }));
}

export function rankAppearancePhotos(
  photos: AppearancePhotoDto[] | null | undefined,
  selection: Record<string, unknown>
): AppearancePhotoDto[] {
  return (photos || [])
    .filter((photo) => optionText(photo.main_image_A) && photoTagsCompatible(photo, selection))
    .sort((a, b) => {
      const tagDiff = countPhotoTags(b) - countPhotoTags(a);
      if (tagDiff) return tagDiff;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
}

export function findAppearancePhoto(
  photos: AppearancePhotoDto[] | null | undefined,
  selection: Record<string, unknown>
): AppearancePhotoDto | null {
  return rankAppearancePhotos(photos, selection)[0] || null;
}

function firstFallbackPath(fallbacks: Array<string | null | undefined>): string {
  for (const fallback of fallbacks) {
    const path = optionText(fallback);
    if (path) return path;
  }
  return '';
}

export function appearanceAiSourcePath(
  photos: AppearancePhotoDto[] | null | undefined,
  current?: AppearancePhotoDto | null,
  fallbacks: Array<string | null | undefined> = []
): string {
  const own = optionText(current?.main_image_A);
  if (own) return own;
  const other = (photos || []).find(
    (photo) => optionText(photo.main_image_A) && (current?.id == null || photo.id !== current.id)
  );
  if (other) return optionText(other.main_image_A);
  return firstFallbackPath(fallbacks);
}

export function sizeDrawingProductPhotoPath(
  photos: AppearancePhotoDto[] | null | undefined,
  sizeValue: string,
  fallbacks: Array<string | null | undefined> = []
): string {
  const ranked = rankAppearancePhotos(photos, { size: sizeValue });
  const tagged = ranked.find((photo) => optionText(photo.main_image_A));
  if (tagged) return optionText(tagged.main_image_A);
  const any = (photos || []).find((photo) => optionText(photo.main_image_A));
  if (any) return optionText(any.main_image_A);
  return firstFallbackPath(fallbacks);
}

export function appearanceComboLabel(combo: AppearanceCombo): string {
  const n = normalizeAppearanceCombo(combo);
  const parts: string[] = [];
  if (n.colour) parts.push(n.colour);
  if (n.trim_color) parts.push(`${n.trim_color} ${variantKindLabel('trim_color').toLowerCase()}`);
  if (n.reflector_finish) {
    parts.push(`${n.reflector_finish} ${variantKindLabel('reflector_finish').toLowerCase()}`);
  }
  if (n.size) parts.push(n.size);
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
  return PHOTO_TAG_KINDS.map((kind) => {
    const value = n[kind];
    if (!value) return null;
    return `${formatSpecValue(value) || value}`;
  })
    .filter(Boolean)
    .join(' / ');
}
