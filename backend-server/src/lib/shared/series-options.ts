import {
  PHYSICAL_SPEC_FIELDS,
  TECHNICAL_SPEC_FIELDS,
  formatSpecValue,
  isAppearanceNa,
  type SpecField,
} from './product-specs';

export const SIZE_KIND = 'size';

export const PACKAGED_INTO_SIZE = new Set(['dimensions', 'cutout_size']);
export const DERIVED_NOT_VARIANT = new Set(['lumen', 'system_lumen', 'efficacy']);

/** Core visitor selector kinds with dedicated help tips. Display order is `VARIANT_KIND_DISPLAY_ORDER`. */
export const ALWAYS_VISIBLE_KINDS = ['wattage', SIZE_KIND, 'cct', 'beam_angle', 'dimming'] as const;

export type SeriesOptionDto = {
  id?: number;
  kind: string;
  value: string;
  sort_order: number;
  lumen?: number | null;
  system_lumen?: number | null;
  dimensions?: string | null;
  cutout_size?: string | null;
  /** Catalog SKU segment; stored on variant_option_catalog, not series_options. */
  code?: string | null;
  /** Datasheet badge image from variant_option_catalog. */
  label_image?: string | null;
};

export type VariantCatalogOption = {
  id?: number;
  kind: string;
  value: string;
  code: string;
  sort_order: number;
  label_image?: string | null;
};

/** Visitor table and SKU coding: physical, then electrical, then optic, then control. */
export const PHYSICAL_VARIANT_KINDS = [
  SIZE_KIND,
  'colour',
  'trim_color',
  'reflector_finish',
  'mounting_type',
  'material',
  'orientation',
  'ip_rating',
  'lifetime',
  'warranty',
  'operating_temperature',
] as const;

export const ELECTRICAL_VARIANT_KINDS = [
  'wattage',
  'driver_type',
  'input_voltage',
  'power_factor',
  'lamp_source',
] as const;

export const OPTIC_VARIANT_KINDS = [
  'cct',
  'beam_angle',
  'cri',
  'optic',
  'lumen',
  'system_lumen',
  'efficacy',
] as const;

export const CONTROL_VARIANT_KINDS = ['dimming'] as const;

export const VARIANT_KIND_DISPLAY_ORDER = [
  ...PHYSICAL_VARIANT_KINDS,
  ...ELECTRICAL_VARIANT_KINDS,
  ...OPTIC_VARIANT_KINDS,
  ...CONTROL_VARIANT_KINDS,
] as const;

/** Printed SKU and family coding grid: Model, physical (finish/trim/reflector), electrical (wattage), optic (CCT/beam/CRI), control. */
export const ORDER_CODE_SEGMENTS: Array<{
  label: string;
  kind: string;
  fallbackKind?: string;
  suffix?: string;
}> = [
  { label: 'Model', kind: 'model' },
  { label: 'Finish', kind: 'colour' },
  { label: 'Trim', kind: 'trim_color' },
  { label: 'Reflector', kind: 'reflector_finish' },
  { label: 'Wattage', kind: 'wattage' },
  { label: 'CCT', kind: 'cct' },
  { label: 'Beam Angle', kind: 'beam_angle', suffix: '°' },
  { label: 'CRI', kind: 'cri' },
  { label: 'Control', kind: 'dimming' },
];

export function optionText(value: unknown): string {
  if (value == null || value === '') return '';
  return String(value).trim();
}

export function wattageOptionValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Number.isInteger(value) ? String(value) : String(value);
  }
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  if (Number.isFinite(n)) return Number.isInteger(n) ? String(n) : String(n);
  return String(value).trim();
}

export function parseOptionNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

/** Ascending numeric / natural order for visitor filters and combo rows (10W, 12W, 15W). */
export function compareOptionValues(_kind: string, left: unknown, right: unknown): number {
  const a = optionText(left);
  const b = optionText(right);
  const na = parseOptionNumber(a);
  const nb = parseOptionNumber(b);
  if (na != null && nb != null && na !== nb) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

export function sizeLabel(dimensions: unknown, cutout?: unknown): string {
  const dim = optionText(dimensions);
  const cut = optionText(cutout);
  if (dim && cut) return `${dim} / cutout ${cut}`;
  return dim || cut;
}

export function variantSpecFields(): SpecField[] {
  const sizeField: SpecField = { label: 'Size', key: SIZE_KIND };
  const rest = [...PHYSICAL_SPEC_FIELDS, ...TECHNICAL_SPEC_FIELDS].filter(
    (field) => !PACKAGED_INTO_SIZE.has(field.key) && !DERIVED_NOT_VARIANT.has(field.key)
  );
  const byKey = new Map(rest.map((field) => [field.key, field]));
  const ordered: SpecField[] = [];
  const used = new Set<string>();
  for (const key of VARIANT_KIND_DISPLAY_ORDER) {
    if (PACKAGED_INTO_SIZE.has(key) || DERIVED_NOT_VARIANT.has(key)) continue;
    if (key === SIZE_KIND) {
      ordered.push(sizeField);
      used.add(SIZE_KIND);
      continue;
    }
    const field = byKey.get(key);
    if (field) {
      ordered.push(field);
      used.add(key);
    }
  }
  for (const field of rest) {
    if (!used.has(field.key)) ordered.push(field);
  }
  return ordered;
}

/** Spec kinds edited on `/admin/variant-options`. Size stays series-specific. */
export function catalogVariantFields(): SpecField[] {
  return variantSpecFields().filter((field) => field.key !== SIZE_KIND);
}

export function variantKindLabel(kind: string): string {
  if (kind === SIZE_KIND) return 'Size';
  const field = variantSpecFields().find((item) => item.key === kind);
  return field?.label || kind.replace(/_/g, ' ');
}

/** Collapse catalog spelling variants so `120` and `120°` (or `IP20` and `20`) compare equal. */
export function optionCompareKey(kind: string, value: unknown): string {
  const text = optionText(value);
  if (!text) return '';
  const lower = text.toLowerCase();
  if (kind === 'wattage') {
    const n = parseOptionNumber(lower);
    return n != null ? String(n) : lower;
  }
  if (kind === 'beam_angle') {
    return lower.replace(/degrees?|deg/g, '').replace(/°/g, '').replace(/\s+/g, '');
  }
  if (kind === 'ip_rating') {
    return lower.replace(/^ip\s*/, '').replace(/\s+/g, '');
  }
  if (kind === 'cct') {
    return lower.replace(/k$/, '').replace(/\s+/g, '');
  }
  return lower;
}

export function valuesEqual(kind: string, left: unknown, right: unknown): boolean {
  const a = optionCompareKey(kind, left);
  const b = optionCompareKey(kind, right);
  if (!a || !b) return false;
  return a === b;
}

function optionDisplayRank(kind: string, value: string): number {
  if (kind === 'beam_angle') {
    if (value.includes('°')) return 2;
    if (/deg/i.test(value)) return 1;
    return 0;
  }
  if (kind === 'ip_rating' && /^ip/i.test(value.trim())) return 1;
  if (kind === 'cct' && /k$/i.test(value.trim())) return 1;
  return 0;
}

function mergeOption(keep: SeriesOptionDto, extra: SeriesOptionDto): SeriesOptionDto {
  return {
    ...keep,
    lumen: keep.lumen ?? extra.lumen,
    system_lumen: keep.system_lumen ?? extra.system_lumen,
    dimensions: keep.dimensions || extra.dimensions,
    cutout_size: keep.cutout_size || extra.cutout_size,
  };
}

function preferOption(kind: string, current: SeriesOptionDto, candidate: SeriesOptionDto): SeriesOptionDto {
  const merged = mergeOption(current, candidate);
  if (optionDisplayRank(kind, candidate.value) > optionDisplayRank(kind, current.value)) {
    return { ...merged, value: candidate.value };
  }
  return merged;
}

export function uniqueOptionsForKind(kind: string, list: SeriesOptionDto[]): SeriesOptionDto[] {
  const sorted = [...list].sort(
    (a, b) =>
      compareOptionValues(kind, a.value, b.value) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const unique: SeriesOptionDto[] = [];
  for (const option of sorted) {
    const index = unique.findIndex((item) => valuesEqual(kind, item.value, option.value));
    if (index < 0) {
      unique.push(option);
      continue;
    }
    unique[index] = preferOption(kind, unique[index], option);
  }
  return unique;
}

export function groupOptionsByKind(options: SeriesOptionDto[]): Record<string, SeriesOptionDto[]> {
  const grouped: Record<string, SeriesOptionDto[]> = {};
  for (const option of options) {
    if (!option?.kind || !option.value) continue;
    if (!grouped[option.kind]) grouped[option.kind] = [];
    grouped[option.kind].push(option);
  }
  for (const [kind, list] of Object.entries(grouped)) {
    grouped[kind] = uniqueOptionsForKind(kind, list);
  }
  return grouped;
}

export function realOptionsForKind(kind: string, list: SeriesOptionDto[]): SeriesOptionDto[] {
  return (list || []).filter((option) => !isAppearanceNa(option.value));
}

export function visibleSelectorKinds(grouped: Record<string, SeriesOptionDto[]>): SpecField[] {
  return variantSpecFields().filter(
    (field) => realOptionsForKind(field.key, grouped[field.key] || []).length >= 2
  );
}

export function findSizeOption(
  grouped: Record<string, SeriesOptionDto[]>,
  selected: string
): SeriesOptionDto | null {
  const list = grouped[SIZE_KIND] || [];
  return list.find((option) => valuesEqual(SIZE_KIND, option.value, selected)) || null;
}

export function productMatchesSize(
  product: Record<string, unknown>,
  option: SeriesOptionDto
): boolean {
  const dim = optionText(product.dimensions);
  const cut = optionText(product.cutout_size);
  const label = sizeLabel(dim, cut);
  if (valuesEqual(SIZE_KIND, option.value, label) || valuesEqual(SIZE_KIND, option.value, dim)) {
    return true;
  }
  const optionDim = optionText(option.dimensions) || option.value;
  if (optionDim && dim && valuesEqual('dimensions', dim, optionDim)) {
    const optionCut = optionText(option.cutout_size);
    if (!optionCut || !cut || valuesEqual('cutout_size', cut, optionCut)) return true;
  }
  return false;
}

export function productMatchesSelection(
  product: Record<string, unknown>,
  selection: Record<string, string>,
  grouped: Record<string, SeriesOptionDto[]>
): boolean {
  for (const [kind, selected] of Object.entries(selection)) {
    if (!selected) continue;
    if (kind === SIZE_KIND) {
      const option = findSizeOption(grouped, selected);
      if (!option) return false;
      if (!productMatchesSize(product, option)) return false;
      continue;
    }
    if (kind === 'wattage') {
      if (!valuesEqual('wattage', product.wattage, selected)) return false;
      continue;
    }
    if (!valuesEqual(kind, product[kind], selected)) return false;
  }
  return true;
}

export function seriesOrderingCode(seriesSlug: string, spec: Record<string, unknown>): string {
  const parts = [optionText(seriesSlug) || 'series'];
  const size = optionText(spec.size) || optionText(spec.dimensions);
  if (size) parts.push(size.replace(/\s+/g, ''));
  const wattage = wattageOptionValue(spec.wattage);
  if (wattage) parts.push(`${wattage}W`);
  const cct = optionText(spec.cct);
  if (cct) parts.push(cct);
  const beam = optionText(spec.beam_angle);
  if (beam) parts.push(beam.replace(/°/g, '').replace(/\s+/g, ''));
  const dimming = optionText(spec.dimming);
  if (dimming) parts.push(dimming.replace(/[^\w]+/g, ''));
  return parts.join('-').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'series';
}

export function catalogQueryString(selection: Record<string, string>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(selection)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

export function selectionFromSpec(spec: Record<string, unknown>): Record<string, string> {
  const selection: Record<string, string> = {};
  for (const field of variantSpecFields()) {
    let value = '';
    if (field.key === 'wattage') value = wattageOptionValue(spec.wattage);
    else if (field.key === SIZE_KIND) {
      value = optionText(spec.size) || sizeLabel(spec.dimensions, spec.cutout_size);
    } else {
      value = optionText(spec[field.key]);
    }
    if (value) selection[field.key] = value;
  }
  return selection;
}

export function seriesPageHref(
  typeSlug: string,
  seriesSlug: string,
  selection: Record<string, string>,
  extra?: Record<string, string>
): string {
  const query = catalogQueryString({ ...selection, ...extra });
  const path = `/products/${encodeURIComponent(typeSlug)}/${encodeURIComponent(seriesSlug)}`;
  return query ? `${path}?${query}` : path;
}

export type SeriesComboRow = {
  id: string;
  selection: Record<string, string>;
  optionsByKind: Record<string, SeriesOptionDto>;
};

export function comboRowId(selection: Record<string, string>): string {
  return Object.keys(selection)
    .sort()
    .map((kind) => `${kind}:${optionCompareKey(kind, selection[kind]) || optionText(selection[kind])}`)
    .join('|');
}

export function comboCount(grouped: Record<string, SeriesOptionDto[]>): number {
  const axes = visibleSelectorKinds(grouped);
  if (axes.length === 0) {
    return Object.keys(grouped).some((kind) => realOptionsForKind(kind, grouped[kind] || []).length > 0)
      ? 1
      : 0;
  }
  return axes.reduce(
    (total, field) => total * Math.max(realOptionsForKind(field.key, grouped[field.key] || []).length, 1),
    1
  );
}

export function filledSelection(
  grouped: Record<string, SeriesOptionDto[]>,
  selection: Record<string, string>
): Record<string, string> {
  const filled = { ...selection };
  for (const [kind, list] of Object.entries(grouped)) {
    const real = realOptionsForKind(kind, list);
    if (real.length === 1 && !filled[kind]) filled[kind] = real[0].value;
  }
  return filled;
}

export function specFromCombo(
  grouped: Record<string, SeriesOptionDto[]>,
  selection: Record<string, string>
): Record<string, unknown> {
  const spec: Record<string, unknown> = {};
  const filled = filledSelection(grouped, selection);
  for (const [kind, list] of Object.entries(grouped)) {
    const selected = filled[kind];
    const option =
      kind === SIZE_KIND
        ? findSizeOption(grouped, selected || (list[0]?.value || ''))
        : selected
          ? list.find((item) => valuesEqual(kind, item.value, selected)) || null
          : list.length === 1
            ? list[0]
            : null;
    if (!option || isAppearanceNa(option.value)) continue;
    if (kind === SIZE_KIND) {
      spec.size = option.value;
      spec.dimensions = optionText(option.dimensions) || option.value;
      if (option.cutout_size) spec.cutout_size = option.cutout_size;
      continue;
    }
    if (kind === 'wattage') {
      const n = parseOptionNumber(option.value);
      spec.wattage = n != null ? n : option.value;
      if (option.lumen != null && Number.isFinite(Number(option.lumen))) spec.lumen = Number(option.lumen);
      if (option.system_lumen != null && Number.isFinite(Number(option.system_lumen))) {
        spec.system_lumen = Number(option.system_lumen);
      }
      continue;
    }
    spec[kind] = option.value;
  }
  return spec;
}

export function cartesianComboRows(grouped: Record<string, SeriesOptionDto[]>): SeriesComboRow[] {
  const axes = visibleSelectorKinds(grouped);
  if (axes.length === 0) {
    const hasAny = Object.values(grouped).some((list) => list.length > 0);
    return hasAny ? [{ id: 'default', selection: {}, optionsByKind: {} }] : [];
  }
  let rows: SeriesComboRow[] = [{ id: '', selection: {}, optionsByKind: {} }];
  for (const field of axes) {
    const list = realOptionsForKind(field.key, grouped[field.key] || []);
    if (list.length === 0) continue;
    const next: SeriesComboRow[] = [];
    for (const row of rows) {
      for (const option of list) {
        const selection = { ...row.selection, [field.key]: option.value };
        next.push({
          id: comboRowId(selection),
          selection,
          optionsByKind: { ...row.optionsByKind, [field.key]: option },
        });
      }
    }
    rows = next;
  }
  return rows;
}

export function comboMatchesSelection(
  combo: Record<string, string>,
  selection: Record<string, string>
): boolean {
  for (const [kind, selected] of Object.entries(selection)) {
    if (!selected) continue;
    if (!valuesEqual(kind, combo[kind], selected)) return false;
  }
  return true;
}

export function findSizePack(
  products: Array<Record<string, unknown>>,
  sizeValue: string | undefined,
  grouped: Record<string, SeriesOptionDto[]>
): Record<string, unknown> | null {
  if (sizeValue) {
    const option = findSizeOption(grouped, sizeValue);
    if (option) {
      const hit = products.find((product) => productMatchesSize(product, option));
      if (hit) return hit;
    }
  }
  const sizes = grouped[SIZE_KIND] || [];
  if (sizes.length === 1) {
    const hit = products.find((product) => productMatchesSize(product, sizes[0]));
    if (hit) return hit;
  }
  return (
    products.find((product) => optionText(product.main_image_A) || optionText(product.size_image)) ||
    products[0] ||
    null
  );
}

export function selectionFromSearchParams(
  search: Record<string, string | string[] | undefined> | URLSearchParams
): Record<string, string> {
  const selection: Record<string, string> = {};
  const kinds = new Set(variantSpecFields().map((field) => field.key));
  const get = (key: string): string => {
    if (search instanceof URLSearchParams) return search.get(key) || '';
    const raw = search[key];
    if (Array.isArray(raw)) return raw[0] || '';
    return raw || '';
  };
  for (const kind of kinds) {
    const value = optionText(get(kind));
    if (value) selection[kind] = value;
  }
  return selection;
}

export function groupCatalogByKind(options: VariantCatalogOption[]): Record<string, VariantCatalogOption[]> {
  const grouped: Record<string, VariantCatalogOption[]> = {};
  for (const option of options) {
    if (!option?.kind || !option.value) continue;
    if (!grouped[option.kind]) grouped[option.kind] = [];
    grouped[option.kind].push(option);
  }
  for (const [kind, list] of Object.entries(grouped)) {
    grouped[kind] = uniqueCatalogForKind(kind, list);
  }
  return grouped;
}

export function uniqueCatalogForKind(kind: string, list: VariantCatalogOption[]): VariantCatalogOption[] {
  const sorted = [...list].sort(
    (a, b) =>
      compareOptionValues(kind, a.value, b.value) || (a.sort_order ?? 0) - (b.sort_order ?? 0)
  );
  const unique: VariantCatalogOption[] = [];
  for (const option of sorted) {
    const index = unique.findIndex((item) => valuesEqual(kind, item.value, option.value));
    if (index < 0) {
      unique.push(option);
      continue;
    }
    const keep = unique[index];
    const preferCode = optionText(option.code) && !optionText(keep.code);
    const preferDisplay = optionDisplayRank(kind, option.value) > optionDisplayRank(kind, keep.value);
    unique[index] = {
      ...keep,
      value: preferDisplay ? option.value : keep.value,
      code: preferCode ? option.code : keep.code || option.code || '',
      label_image: optionText(keep.label_image) || optionText(option.label_image) || null,
      id: keep.id ?? option.id,
    };
  }
  return unique;
}

export function lookupCatalogCode(
  catalog: VariantCatalogOption[],
  kind: string,
  value: unknown
): string {
  const text = optionText(value);
  if (!text || !kind) return '';
  const match = catalog.find((row) => row.kind === kind && valuesEqual(kind, row.value, text));
  return optionText(match?.code);
}

export function lookupCatalogLabel(
  catalog: VariantCatalogOption[],
  kind: string,
  value: unknown
): string {
  const text = optionText(value);
  if (!text || !kind) return '';
  const match = catalog.find((row) => row.kind === kind && valuesEqual(kind, row.value, text));
  return optionText(match?.label_image);
}

/** Compact SKU segment: never keep `>` / `<` (hyphen-join would look like an arrow, e.g. `60->90`). */
export function skuSegmentText(kind: string, value: unknown, suffix?: string): string {
  const display = formatSpecValue(value, suffix) || optionText(value);
  if (!display || display === 'None' || display === '—' || isAppearanceNa(display)) return '';
  let text = display;
  if (kind === 'beam_angle') {
    text = text.replace(/degrees?|deg/gi, '').replace(/°/g, '').replace(/\s+/g, '');
  }
  if (kind === 'cri') {
    text = text.replace(/[><+]/g, '').replace(/\s+/g, '');
  }
  return text.replace(/[><]/g, '').trim();
}

function reflectorSkuCode(text: string): string {
  const words = text
    .split(/[\s\-/]+/)
    .map((word) => word.replace(/[^a-zA-Z0-9]/g, ''))
    .filter(Boolean);
  if (words.length >= 2) return words.map((word) => word[0].toUpperCase()).join('');
  return skuSegmentText('reflector_finish', text);
}

/** Lighting-catalog fallback when variant-options has no `code` yet (2700K → 27K, 24° → 24D). */
export function compactSkuCode(kind: string, value: unknown): string {
  const text = optionText(value);
  if (!text || text === '—') return '';
  if (kind === 'wattage') {
    const watts = wattageOptionValue(text);
    return watts ? `${watts}W` : '';
  }
  if (kind === 'cct') {
    const kelvin = text.match(/(\d{4})\s*k/i);
    if (kelvin) return `${kelvin[1].slice(0, 2)}K`;
    const short = text.match(/(\d{2})\s*k/i);
    if (short) return `${short[1]}K`;
  }
  if (kind === 'beam_angle') {
    const degrees = text.replace(/degrees?|deg/gi, '').replace(/°/g, '').replace(/\s+/g, '');
    if (degrees && /^\d+(\.\d+)?$/.test(degrees)) return `${degrees}D`;
  }
  if (kind === 'cri') return skuSegmentText(kind, text);
  if (kind === 'dimming') {
    const lower = text.toLowerCase();
    if (/non[-\s]?dim/.test(lower) || lower === 'none' || lower === 'nd') return 'ND';
    if (/0\s*-?\s*10/.test(lower)) return '010';
    if (/dali/.test(lower)) return 'DALI';
    if (/dmx/.test(lower)) return 'DMX';
    if (/triac/.test(lower)) return 'TRI';
    if (/phase/.test(lower)) return 'PC';
    if (text === 'None') return 'ND';
  }
  if (text === 'None' || isAppearanceNa(text)) return '';
  if (kind === 'trim_color' || kind === 'colour') {
    const lower = text.toLowerCase();
    if (lower === 'white' || lower === 'wh') return 'WH';
    if (lower === 'black' || lower === 'bk') return 'BK';
    if (lower === 'silver' || lower === 'sv') return 'SV';
  }
  if (kind === 'reflector_finish') return reflectorSkuCode(text);
  return skuSegmentText(kind, text);
}

export function resolvedSkuSegment(
  catalog: VariantCatalogOption[],
  kind: string,
  value: unknown,
  opts?: { fallbackKind?: string; suffix?: string }
): string {
  const fromCatalog =
    lookupCatalogCode(catalog, kind, value) ||
    (opts?.fallbackKind ? lookupCatalogCode(catalog, opts.fallbackKind, value) : '');
  if (fromCatalog) return skuSegmentText(kind, fromCatalog);
  return compactSkuCode(kind, value) || skuSegmentText(kind, value, opts?.suffix);
}

export type FamilySkuCodingOption = {
  code: string;
  description: string;
};

export type FamilySkuCodingColumn = {
  label: string;
  kind: string;
  options: FamilySkuCodingOption[];
};

function familyCodingOptionsForSegment(
  seg: (typeof ORDER_CODE_SEGMENTS)[number],
  grouped: Record<string, SeriesOptionDto[]>,
  catalog: VariantCatalogOption[]
): FamilySkuCodingOption[] {
  const list = realOptionsForKind(
    seg.kind,
    grouped[seg.kind]?.length
      ? grouped[seg.kind]
      : seg.fallbackKind && grouped[seg.fallbackKind]?.length
        ? grouped[seg.fallbackKind]
        : []
  );
  const options: FamilySkuCodingOption[] = [];
  const seen = new Set<string>();
  for (const option of list) {
    const code = resolvedSkuSegment(catalog, seg.kind, option.value, {
      fallbackKind: seg.fallbackKind,
      suffix: seg.suffix,
    });
    if (!code || seen.has(code)) continue;
    seen.add(code);
    options.push({
      code,
      description:
        formatSpecValue(option.value, seg.kind === 'wattage' ? 'W' : seg.suffix) ||
        optionText(option.value),
    });
  }
  return options;
}

/**
 * SKU segment kinds that distinguish combinations. Model always stays.
 * Other kinds are omitted when the series has fewer than two real option codes.
 */
export function skuCodingKinds(
  grouped: Record<string, SeriesOptionDto[]>,
  catalog: VariantCatalogOption[]
): Set<string> {
  const kinds = new Set<string>(['model']);
  for (const seg of ORDER_CODE_SEGMENTS) {
    if (seg.kind === 'model') continue;
    if (familyCodingOptionsForSegment(seg, grouped, catalog).length >= 2) kinds.add(seg.kind);
  }
  return kinds;
}

export function orderCodeSegments(
  product: Record<string, unknown>,
  catalog: VariantCatalogOption[],
  grouped?: Record<string, SeriesOptionDto[]>
): Array<{ label: string; value: string }> {
  const included = grouped ? skuCodingKinds(grouped, catalog) : null;
  const parts: Array<{ label: string; value: string }> = [];
  for (const seg of ORDER_CODE_SEGMENTS) {
    if (included && !included.has(seg.kind)) continue;
    if (seg.kind === 'model') {
      const code = optionText(product.product_code);
      if (code && code !== '—') parts.push({ label: seg.label, value: code });
      continue;
    }
    const raw = product[seg.kind] ?? (seg.fallbackKind ? product[seg.fallbackKind] : undefined);
    const display = formatSpecValue(raw, seg.suffix) || optionText(raw);
    if (!display || display === 'None' || isAppearanceNa(display)) continue;
    const code = resolvedSkuSegment(catalog, seg.kind, raw, {
      fallbackKind: seg.fallbackKind,
      suffix: seg.suffix,
    });
    if (!code) continue;
    parts.push({ label: seg.label, value: code });
  }
  return parts;
}

export function composeDatasheetSku(
  product: Record<string, unknown>,
  catalog: VariantCatalogOption[],
  grouped?: Record<string, SeriesOptionDto[]>
): string {
  return orderCodeSegments(product, catalog, grouped)
    .map((part) => part.value)
    .filter(Boolean)
    .join('-');
}

/** Family datasheet coding key: one column per SKU segment, with code + human label (no series name). */
export function familyOrderCodeSegments(
  productCode: string,
  grouped: Record<string, SeriesOptionDto[]>,
  catalog: VariantCatalogOption[]
): FamilySkuCodingColumn[] {
  const columns: FamilySkuCodingColumn[] = [];
  const included = skuCodingKinds(grouped, catalog);
  for (const seg of ORDER_CODE_SEGMENTS) {
    if (!included.has(seg.kind)) continue;
    if (seg.kind === 'model') {
      const code = optionText(productCode);
      if (code && code !== '—') {
        columns.push({ label: seg.label, kind: seg.kind, options: [{ code, description: '' }] });
      }
      continue;
    }
    const options = familyCodingOptionsForSegment(seg, grouped, catalog);
    if (options.length < 2) continue;
    columns.push({ label: seg.label, kind: seg.kind, options });
  }
  return columns;
}

const FAMILY_COLOUR_KINDS: Array<{ kind: string; title: string }> = [
  { kind: 'colour', title: 'Finish' },
  { kind: 'trim_color', title: 'Trim' },
  { kind: 'reflector_finish', title: 'Reflector' },
];

export function familyOptionsForKind(
  grouped: Record<string, SeriesOptionDto[]>,
  kind: string
): SeriesOptionDto[] {
  return uniqueOptionsForKind(kind, realOptionsForKind(kind, grouped[kind] || []));
}

export type FamilyWattageRow = {
  wattage: string;
  source: string | null;
  system: string | null;
};

/** Wattage rows with source / system lumen for the family size cards. */
export function familyWattageRows(grouped: Record<string, SeriesOptionDto[]>): FamilyWattageRow[] {
  const rows: FamilyWattageRow[] = [];
  for (const option of familyOptionsForKind(grouped, 'wattage')) {
    const wattage = formatSpecValue(option.value, 'W') || option.value;
    if (!wattage) continue;
    const source =
      option.lumen != null && Number.isFinite(Number(option.lumen))
        ? formatSpecValue(option.lumen, 'lm')
        : null;
    const system =
      option.system_lumen != null && Number.isFinite(Number(option.system_lumen))
        ? formatSpecValue(option.system_lumen, 'lm')
        : null;
    rows.push({ wattage, source, system });
  }
  return rows;
}

export type FamilyPolarCombo = {
  wattageLabel: string;
  beamLabel: string;
  wattageValue: string;
  beamValue: string;
  lumen: number | null;
  system_lumen: number | null;
};

/** Power × beam pairs for family photometry (not a full SKU cartesian). */
export function familyPolarCombos(grouped: Record<string, SeriesOptionDto[]>): FamilyPolarCombo[] {
  const beams = familyOptionsForKind(grouped, 'beam_angle');
  if (!beams.length) return [];
  const watts = familyOptionsForKind(grouped, 'wattage');
  const wattageList = watts.length ? watts : [null];
  const combos: FamilyPolarCombo[] = [];
  for (const watt of wattageList) {
    for (const beam of beams) {
      combos.push({
        wattageLabel: watt ? formatSpecValue(watt.value, 'W') || watt.value : '',
        beamLabel: formatSpecValue(beam.value, '°') || beam.value,
        wattageValue: watt?.value || '',
        beamValue: beam.value,
        lumen: watt?.lumen ?? null,
        system_lumen: watt?.system_lumen ?? null,
      });
    }
  }
  return combos;
}

export type FamilyColourChip = { label: string; value: string };

export type FamilyColourGroup = {
  kind: string;
  title: string;
  chips: FamilyColourChip[];
};

/** Finish / Trim / Reflector chip rows. Kinds that are empty or N/A are omitted. */
export function familyColourGroups(grouped: Record<string, SeriesOptionDto[]>): FamilyColourGroup[] {
  const groups: FamilyColourGroup[] = [];
  for (const row of FAMILY_COLOUR_KINDS) {
    const chips = familyOptionsForKind(grouped, row.kind)
      .map((option) => {
        const label = formatSpecValue(option.value) || optionText(option.value);
        return label ? { label, value: option.value } : null;
      })
      .filter((chip): chip is FamilyColourChip => Boolean(chip));
    if (!chips.length) continue;
    groups.push({ kind: row.kind, title: row.title, chips });
  }
  return groups;
}
