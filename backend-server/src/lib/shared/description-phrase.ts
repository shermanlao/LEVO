import {
  PHYSICAL_SPEC_FIELDS,
  TECHNICAL_SPEC_FIELDS,
  formatSpecValue,
  type SpecField,
} from './product-specs';
import { VARIANT_KIND_DISPLAY_ORDER } from './series-options';

/** Phrase blanks use `{{source_lumen}}`; the stored spec key remains `lumen`. */
const PLACEHOLDER_SPEC_KEYS: Record<string, string> = {
  source_lumen: 'lumen',
  lumen: 'lumen',
};

function phraseFieldRank(key: string): number {
  const specKey = key === 'source_lumen' ? 'lumen' : key;
  const index = (VARIANT_KIND_DISPLAY_ORDER as readonly string[]).indexOf(specKey);
  return index < 0 ? VARIANT_KIND_DISPLAY_ORDER.length : index;
}

export const PHRASE_PLACEHOLDER_FIELDS: SpecField[] = [
  { label: 'Size', key: 'size' },
  ...PHYSICAL_SPEC_FIELDS,
  ...TECHNICAL_SPEC_FIELDS.map((field) =>
    field.key === 'lumen' ? { ...field, key: 'source_lumen' } : field
  ),
].sort((left, right) => phraseFieldRank(left.key) - phraseFieldRank(right.key));

const PLACEHOLDER_RE = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi;

const FIELD_BY_KEY = new Map(PHRASE_PLACEHOLDER_FIELDS.map((field) => [field.key, field]));

export function phrasePlaceholderToken(key: string): string {
  return `{{${key}}}`;
}

function specKeyForPlaceholder(key: string): string {
  return PLACEHOLDER_SPEC_KEYS[key] || key;
}

function fieldForPlaceholder(key: string): SpecField | undefined {
  const specKey = specKeyForPlaceholder(key);
  return FIELD_BY_KEY.get(key) || FIELD_BY_KEY.get(specKey === 'lumen' ? 'source_lumen' : specKey);
}

function resolvePlaceholder(key: string, specs: Record<string, unknown>): string | null {
  const specKey = specKeyForPlaceholder(key);
  const field = fieldForPlaceholder(key);
  return formatSpecValue(specs[specKey] ?? specs[key], field?.suffix);
}

function fillSegment(text: string, specs: Record<string, unknown>, dropIfMissing: boolean): string | null {
  PLACEHOLDER_RE.lastIndex = 0;
  const keys = [...text.matchAll(PLACEHOLDER_RE)].map((match) => String(match[1] || '').toLowerCase());
  PLACEHOLDER_RE.lastIndex = 0;
  if (dropIfMissing && keys.some((key) => resolvePlaceholder(key, specs) == null)) return null;
  const replaced = text.replace(PLACEHOLDER_RE, (_all, rawKey: string) => {
    return resolvePlaceholder(String(rawKey || '').toLowerCase(), specs) || '';
  });
  return replaced.replace(/\s+/g, ' ').replace(/\s+([,;:.])/g, '$1').trim() || null;
}

/** Fill `{{wattage}}` / `{{cct}}` blanks from a combo spec. Drops semicolon clauses whose specs are missing. */
export function fillPhraseTemplate(template: unknown, specs: Record<string, unknown>): string {
  const raw = String(template || '').trim();
  if (!raw) return '';
  if (raw.includes(';')) {
    const filled = raw
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => fillSegment(part, specs, true))
      .filter((part): part is string => Boolean(part));
    if (!filled.length) return '';
    let out = filled.join('; ');
    if (/;$/.test(raw)) out += ';';
    return out;
  }
  return fillSegment(raw, specs, false) || '';
}

/** Rewrite legacy `{{lumen}}` blanks to `{{source_lumen}}` without touching `{{system_lumen}}`. */
export function rewriteLegacyLumenPlaceholders(template: unknown): string {
  return String(template || '').replace(/\{\{\s*lumen\s*\}\}/gi, '{{source_lumen}}');
}
