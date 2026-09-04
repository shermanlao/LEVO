export {
  collectSpecRows as collectSharedSpecRows,
  datasheetFilename,
  formatSpecValue,
  installationFilename,
  labelFilename,
  PHYSICAL_SPEC_FIELDS,
  TECHNICAL_SPEC_FIELDS,
} from '@shared/product-specs';
export type { SpecField, SpecRow } from '@shared/product-specs';

import {
  collectSpecRows as collectSharedSpecRows,
  formatSpecValue,
  PHYSICAL_SPEC_FIELDS,
  TECHNICAL_SPEC_FIELDS,
  type SpecField,
  type SpecRow,
} from '@shared/product-specs';

const CORE_KEYS = new Set([
  'name',
  'description',
  'slug',
  'product_code',
  'id',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'created_at',
  'updated_at',
  'series',
  'type',
  'product_type',
  'path',
  'vendor_code',
  'vendor_model',
  'external_id',
  'external_source',
  'series_id',
  'product_type_id',
  'specifications',
  'is_featured',
  'ldt_family',
  'ldt_beam_degrees',
  'ldt_file',
  'use_variant_ldt',
  'size_image_ai',
]);

const EXCLUDED_FIELDS = new Set([
  'main_image_a',
  'main_image_b',
  'main_image_A',
  'main_image_B',
  'size_image',
  'size_image_ai',
  'photometric_image',
  'ldt_family',
  'ldt_beam_degrees',
  'ldt_file',
  'use_variant_ldt',
  'application_image',
  'featured_image',
  'datasheet',
  'is_featured',
  'updated_at',
  'created_at',
  'createdAt',
  'updatedAt',
  'publishedAt',
  'size_image_path',
  'photometric_image_path',
  'main_image_a_path',
  'main_image_b_path',
  'thumbnail',
  'thumbnail_path',
  'image_path',
  'application_image_path',
  'vendor_code',
  'vendor_model',
  'external_id',
  'external_source',
  'series_id',
  'product_type_id',
  'slug',
  'path',
  'type',
  'product_type',
  'specifications',
]);

const EXCLUDED_SUBSTRINGS = ['image', 'photo', 'path', 'featured', 'thumbnail', 'datasheet'];

export function shouldExcludeSpecField(key: string): boolean {
  if (EXCLUDED_FIELDS.has(key)) return true;
  const lower = key.toLowerCase();
  return EXCLUDED_SUBSTRINGS.some((substring) => lower.includes(substring));
}

export function specLabelFromKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isPhysicalExtraKey(key: string): boolean {
  return (
    key.includes('_type') ||
    key.includes('size') ||
    key.includes('color') ||
    key.includes('material') ||
    key.includes('finish')
  );
}

function knownKeys(): Set<string> {
  return new Set([
    ...PHYSICAL_SPEC_FIELDS.map((field) => field.key),
    ...TECHNICAL_SPEC_FIELDS.map((field) => field.key),
  ]);
}

export function extraPhysicalKeys(attributes: Record<string, unknown>): string[] {
  const known = knownKeys();
  return Object.keys(attributes).filter(
    (key) =>
      !known.has(key) &&
      !CORE_KEYS.has(key) &&
      !shouldExcludeSpecField(key) &&
      isPhysicalExtraKey(key)
  );
}

export function extraTechnicalKeys(attributes: Record<string, unknown>): string[] {
  const known = knownKeys();
  const physical = extraPhysicalKeys(attributes);
  return Object.keys(attributes).filter(
    (key) =>
      !known.has(key) &&
      !CORE_KEYS.has(key) &&
      !shouldExcludeSpecField(key) &&
      !physical.includes(key) &&
      !isPhysicalExtraKey(key)
  );
}

export function collectSpecRows(
  attributes: Record<string, unknown>,
  fields: SpecField[],
  extraKeys: string[] = []
): SpecRow[] {
  const rows = collectSharedSpecRows(attributes, fields);
  for (const key of extraKeys) {
    const value = formatSpecValue(attributes[key]);
    if (!value) continue;
    rows.push({ label: specLabelFromKey(key), value });
  }
  return rows;
}

export function collectTechnicalRows(attributes: Record<string, unknown>): SpecRow[] {
  return collectSpecRows(attributes, TECHNICAL_SPEC_FIELDS, extraTechnicalKeys(attributes));
}

export function collectPhysicalRows(attributes: Record<string, unknown>): SpecRow[] {
  return collectSpecRows(attributes, PHYSICAL_SPEC_FIELDS, extraPhysicalKeys(attributes));
}
