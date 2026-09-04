import { formatSpecValue } from './product-specs';
import { optionText, valuesEqual } from './series-options';

export const DATASHEET_LABEL_SLOTS = [
  { key: 'ip_rating', title: 'IP' },
  { key: 'warranty', title: 'Warranty' },
  { key: 'input_voltage', title: 'Voltage' },
] as const;

export const CUSTOM_DATASHEET_LABEL_KIND = 'datasheet_label';

export type DatasheetLabelSlotKey = (typeof DATASHEET_LABEL_SLOTS)[number]['key'];

export type DatasheetLabel = {
  key: string;
  text: string;
  image: string | null;
};

export type CatalogLabelSource = {
  kind: string;
  value: string;
  label_image?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function parseOne(value: unknown, fallbackKey: string): DatasheetLabel | null {
  if (typeof value === 'string') {
    const text = value.trim();
    return text ? { key: fallbackKey, text, image: null } : null;
  }
  const rec = asRecord(value);
  if (!rec) return null;
  const key = String(rec.key || fallbackKey).trim() || fallbackKey;
  const text = String(rec.text || rec.label || rec.caption || '').trim();
  const image = String(rec.image || rec.url || '').trim() || null;
  if (!text && !image) return null;
  return { key, text, image };
}

export function parseDatasheetLabels(raw: unknown): DatasheetLabel[] {
  let value = raw;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      value = JSON.parse(trimmed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  const out: DatasheetLabel[] = [];
  const seen = new Set<string>();
  value.forEach((item, index) => {
    const parsed = parseOne(item, `custom-${index + 1}`);
    if (!parsed) return;
    const key = seen.has(parsed.key) ? `${parsed.key}-${index + 1}` : parsed.key;
    seen.add(key);
    out.push({ ...parsed, key });
  });
  return out;
}

export function stringifyDatasheetLabels(labels: DatasheetLabel[]): string | null {
  const cleaned = labels
    .map((label, index) => ({
      key: String(label.key || `custom-${index + 1}`).trim() || `custom-${index + 1}`,
      text: String(label.text || '').trim(),
      image: String(label.image || '').trim() || null,
    }))
    .filter((label) => label.text || label.image);
  if (!cleaned.length) return null;
  return JSON.stringify(cleaned);
}

export function mergeDatasheetLabelSlots(
  saved: DatasheetLabel[],
  suggested: Partial<Record<string, string>>
): DatasheetLabel[] {
  const byKey = new Map(saved.map((label) => [label.key, label]));
  const slots = DATASHEET_LABEL_SLOTS.map(({ key }) => {
    const existing = byKey.get(key);
    return {
      key,
      text: existing?.text || suggested[key] || '',
      image: existing?.image || null,
    };
  });
  const extras = saved.filter((label) => !DATASHEET_LABEL_SLOTS.some((slot) => slot.key === label.key));
  return [...slots, ...extras];
}

export function datasheetLabelsFromEntity(entity: unknown): DatasheetLabel[] {
  if (!entity || typeof entity !== 'object') return [];
  const rec = entity as { datasheet_labels?: unknown; attributes?: { datasheet_labels?: unknown } };
  const attrs = asRecord(rec.attributes);
  return parseDatasheetLabels(rec.datasheet_labels ?? attrs?.datasheet_labels);
}

export function datasheetLabelsFromSeries(series: unknown): DatasheetLabel[] {
  return datasheetLabelsFromEntity(series);
}

export function extraCatalogLabelKey(value: string): string {
  const base =
    String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'custom';
  return `custom-${base}`;
}

export function customDatasheetLabelKey(text: string, existing: DatasheetLabel[]): string {
  const key = extraCatalogLabelKey(text);
  if (!existing.some((label) => label.key === key)) return key;
  let n = 2;
  while (existing.some((label) => label.key === `${key}-${n}`)) n += 1;
  return `${key}-${n}`;
}

export function extraLabelsFromCatalog(catalog: CatalogLabelSource[]): DatasheetLabel[] {
  const out: DatasheetLabel[] = [];
  const seen = new Set<string>();
  for (const option of catalog) {
    if (option.kind !== CUSTOM_DATASHEET_LABEL_KIND) continue;
    const text = optionText(option.value);
    if (!text) continue;
    const key = extraCatalogLabelKey(text);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      key,
      text,
      image: optionText(option.label_image) || null,
    });
  }
  return out;
}

export function extraLabelSelected(labels: DatasheetLabel[], extra: DatasheetLabel): boolean {
  const text = extra.text.trim().toLowerCase();
  if (!text) return false;
  return labels.some((label) => label.key === extra.key || label.text.trim().toLowerCase() === text);
}

export function toggleExtraLabel(labels: DatasheetLabel[], extra: DatasheetLabel): DatasheetLabel[] {
  if (extraLabelSelected(labels, extra)) {
    const text = extra.text.trim().toLowerCase();
    return labels.filter((label) => label.key !== extra.key && label.text.trim().toLowerCase() !== text);
  }
  return [...labels.filter((label) => label.key !== extra.key), extra];
}

function overlayCatalogArtwork(labels: DatasheetLabel[], catalog: CatalogLabelSource[]): DatasheetLabel[] {
  const extras = extraLabelsFromCatalog(catalog);
  return labels.map((label) => {
    const extra = extras.find(
      (item) => item.key === label.key || item.text.trim().toLowerCase() === label.text.trim().toLowerCase()
    );
    if (extra) {
      return {
        key: label.key || extra.key,
        text: extra.text || label.text,
        image: extra.image || label.image,
      };
    }
    const slot = DATASHEET_LABEL_SLOTS.find((item) => item.key === label.key);
    if (!slot || !label.text) return label;
    const option = catalog.find((row) => row.kind === slot.key && valuesEqual(slot.key, row.value, label.text));
    if (!option) return label;
    return {
      ...label,
      text: optionText(option.value) || label.text,
      image: optionText(option.label_image) || label.image,
    };
  });
}

export function mergeScopedDatasheetLabels(opts: {
  spec?: Record<string, unknown>;
  catalog?: CatalogLabelSource[];
  typeLabels?: DatasheetLabel[];
  seriesLabels?: DatasheetLabel[];
}): DatasheetLabel[] {
  const specLabels = datasheetLabelsForSpec(opts.catalog || [], opts.spec || {});
  const order: string[] = [];
  const byKey = new Map<string, DatasheetLabel>();
  const seenText = new Set<string>();

  function put(label: DatasheetLabel) {
    if (!label.text && !label.image) return;
    const prev = byKey.get(label.key);
    if (!prev) order.push(label.key);
    byKey.set(label.key, {
      key: label.key,
      text: label.text || prev?.text || '',
      image: label.image || prev?.image || null,
    });
  }

  specLabels.forEach(put);
  overlayCatalogArtwork(opts.typeLabels || [], opts.catalog || []).forEach(put);
  overlayCatalogArtwork(opts.seriesLabels || [], opts.catalog || []).forEach(put);

  return order
    .map((key) => byKey.get(key))
    .filter((label): label is DatasheetLabel => Boolean(label && (label.text || label.image)))
    .filter((label) => {
      const textKey = (label.text || '').trim().toLowerCase();
      if (!textKey) return true;
      if (seenText.has(textKey)) return false;
      seenText.add(textKey);
      return true;
    });
}

export function datasheetLabelsForSpec(
  catalog: CatalogLabelSource[],
  spec: Record<string, unknown>
): DatasheetLabel[] {
  const labels: DatasheetLabel[] = [];
  const used = new Set<string>();
  for (const slot of DATASHEET_LABEL_SLOTS) {
    const text = formatSpecValue(spec[slot.key]) || optionText(spec[slot.key]);
    const option = text
      ? catalog.find((row) => row.kind === slot.key && valuesEqual(slot.key, row.value, text))
      : undefined;
    const key = slot.key;
    used.add(`${slot.key}:${optionText(option?.value) || text}`);
    labels.push({
      key,
      text: optionText(option?.value) || text,
      image: optionText(option?.label_image) || null,
    });
  }
  for (const option of catalog) {
    if (!optionText(option.label_image)) continue;
    const id = `${option.kind}:${option.value}`;
    if (used.has(id)) continue;
    if (DATASHEET_LABEL_SLOTS.some((slot) => slot.key === option.kind)) continue;
    if (option.kind === CUSTOM_DATASHEET_LABEL_KIND) continue;
    const specValue = spec[option.kind];
    if (!specValue || !valuesEqual(option.kind, option.value, specValue)) continue;
    labels.push({
      key: id,
      text: option.value,
      image: optionText(option.label_image) || null,
    });
  }
  return labels.filter((label) => label.text || label.image);
}

function groupedWithPackValues(
  grouped: Record<string, Array<{ value: string }>>,
  products: Array<Record<string, unknown>>
): Record<string, Array<{ value: string }>> {
  if (!products.length) return grouped;
  const next: Record<string, Array<{ value: string }>> = { ...grouped };
  for (const slot of DATASHEET_LABEL_SLOTS) {
    const extra = products
      .map((product) => optionText(product[slot.key]))
      .filter(Boolean)
      .map((value) => ({ value }));
    if (!extra.length) continue;
    next[slot.key] = [...(next[slot.key] || []), ...extra];
  }
  return next;
}

/** IP / warranty / voltage badges for every value this series offers, from the variant catalog. */
export function datasheetLabelsForSeriesOptions(
  catalog: CatalogLabelSource[],
  grouped: Record<string, Array<{ value: string }>>,
  products: Array<Record<string, unknown>> = []
): DatasheetLabel[] {
  const source = groupedWithPackValues(grouped, products);
  const labels: DatasheetLabel[] = [];
  const seen = new Set<string>();
  for (const slot of DATASHEET_LABEL_SLOTS) {
    for (const option of source[slot.key] || []) {
      const text = optionText(option.value);
      if (!text) continue;
      const hit = catalog.find((row) => row.kind === slot.key && valuesEqual(slot.key, row.value, text));
      const value = optionText(hit?.value) || text;
      const key = `${slot.key}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      labels.push({
        key,
        text: value,
        image: optionText(hit?.label_image) || null,
      });
    }
  }
  for (const option of catalog) {
    if (!optionText(option.label_image)) continue;
    if (DATASHEET_LABEL_SLOTS.some((slot) => slot.key === option.kind)) continue;
    if (option.kind === CUSTOM_DATASHEET_LABEL_KIND) continue;
    const offered = source[option.kind] || [];
    if (!offered.some((row) => valuesEqual(option.kind, row.value, option.value))) continue;
    const key = `${option.kind}:${option.value}`;
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push({
      key,
      text: option.value,
      image: optionText(option.label_image) || null,
    });
  }
  return labels.filter((label) => label.text || label.image);
}

export const PACK_DATASHEET_LABEL_KEYS = DATASHEET_LABEL_SLOTS.map((slot) => slot.key);

export function copyPackDatasheetFields(
  spec: Record<string, unknown>,
  pack: Record<string, unknown> | null | undefined
): void {
  if (!pack) return;
  for (const key of PACK_DATASHEET_LABEL_KEYS) {
    if (optionText(spec[key])) continue;
    const value = optionText(pack[key]);
    if (value) spec[key] = value;
  }
}
