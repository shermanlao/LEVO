export type SpecField = {
  label: string;
  key: string;
  suffix?: string;
};

export const PHYSICAL_SPEC_FIELDS: SpecField[] = [
  { label: 'Dimensions', key: 'dimensions' },
  { label: 'Cutout Size', key: 'cutout_size' },
  { label: 'Mounting', key: 'mounting_type' },
  { label: 'Finish', key: 'colour' },
  { label: 'Trim', key: 'trim_color' },
  { label: 'Reflector', key: 'reflector_finish' },
  { label: 'Orientation', key: 'orientation' },
  { label: 'Material', key: 'material' },
];

export const TECHNICAL_SPEC_FIELDS: SpecField[] = [
  { label: 'Wattage', key: 'wattage', suffix: 'W' },
  { label: 'Source Lumen', key: 'lumen', suffix: 'lm' },
  { label: 'System Lumens', key: 'system_lumen', suffix: 'lm' },
  { label: 'Color Temperature', key: 'cct' },
  { label: 'Beam Angle', key: 'beam_angle', suffix: '°' },
  { label: 'Dimming', key: 'dimming' },
  { label: 'CRI', key: 'cri' },
  { label: 'IP Rating', key: 'ip_rating' },
  { label: 'Lifetime', key: 'lifetime' },
  { label: 'Driver Type', key: 'driver_type' },
  { label: 'Power Factor', key: 'power_factor' },
  { label: 'Input Voltage', key: 'input_voltage' },
  { label: 'Lamp Source', key: 'lamp_source' },
  { label: 'Warranty', key: 'warranty' },
  { label: 'Efficacy', key: 'efficacy', suffix: 'lm/W' },
  { label: 'Optic', key: 'optic' },
  { label: 'Operating Temperature', key: 'operating_temperature' },
];

export type SpecRow = { label: string; value: string };

/** Reserved series-option value: this product has no Finish / Trim / Reflector part. */
export const APPEARANCE_NA = 'N/A';

export function isAppearanceNa(value: unknown): boolean {
  const text = value == null ? '' : String(value).trim();
  return /^n\/a$/i.test(text);
}

/** Visitor/list “Finish”: datasheet colour, then trim if colour is empty. Ignores N/A. */
export function productFinishValue(product: Record<string, unknown>): string {
  return formatSpecValue(product.colour) || formatSpecValue(product.trim_color) || '';
}

export function formatSpecValue(value: unknown, suffix?: string): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'object') return null;
  const text =
    typeof value === 'number'
      ? Number.isInteger(value)
        ? String(value)
        : String(value)
      : String(value).trim();
  if (!text || isAppearanceNa(text)) return null;
  if (!suffix) return text;
  const suffixNorm = suffix.replace(/[°]/g, '').toLowerCase();
  if (suffixNorm && text.toLowerCase().includes(suffixNorm)) return text;
  if (text.endsWith(suffix)) return text;
  return `${text}${suffix}`;
}

export function collectSpecRows(product: Record<string, unknown>, fields: SpecField[]): SpecRow[] {
  const rows: SpecRow[] = [];
  for (const field of fields) {
    const value = formatSpecValue(product[field.key], field.suffix);
    if (!value) continue;
    rows.push({ label: field.label, value });
  }
  return rows;
}

export function safePdfStem(productCode: unknown, slug: string): string {
  const raw = String(productCode || slug || 'product').trim();
  return raw.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'product';
}

export function datasheetFilename(productCode: unknown, slug: string): string {
  return `${safePdfStem(productCode, slug)}-datasheet.pdf`;
}

export function familyDatasheetFilename(
  seriesName: unknown,
  productCode: unknown,
  slug: string
): string {
  return `${safePdfStem(seriesName || productCode, slug)}-family-datasheet.pdf`;
}

export function installationFilename(productCode: unknown, slug: string): string {
  return `${safePdfStem(productCode, slug)}-installation.pdf`;
}

export function labelFilename(productCode: unknown, slug: string): string {
  return `${safePdfStem(productCode, slug)}-label.pdf`;
}

export const GENERAL_LABEL_FILENAME = 'LEVO-label.pdf';
