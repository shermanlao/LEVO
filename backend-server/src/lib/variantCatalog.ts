import { Op } from 'sequelize';
import Product from '../models/Product';
import SeriesOption from '../models/SeriesOption';
import VariantOptionCatalog from '../models/VariantOptionCatalog';
import {
  SIZE_KIND,
  catalogVariantFields,
  groupCatalogByKind,
  optionText,
  uniqueCatalogForKind,
  valuesEqual,
  wattageOptionValue,
  type VariantCatalogOption,
} from './shared/series-options';

export type { VariantCatalogOption };

export function serializeCatalogOption(
  row: VariantOptionCatalog | Record<string, unknown>
): VariantCatalogOption {
  const p =
    typeof (row as VariantOptionCatalog).get === 'function'
      ? (row as VariantOptionCatalog).get({ plain: true })
      : row;
  const rec = p as Record<string, unknown>;
  return {
    id: rec.id != null ? Number(rec.id) : undefined,
    kind: String(rec.kind || ''),
    value: String(rec.value || ''),
    code: optionText(rec.code),
    sort_order: Number(rec.sort_order) || 0,
    label_image: optionText(rec.label_image) || null,
  };
}

export async function loadVariantCatalog(): Promise<VariantCatalogOption[]> {
  const rows = await VariantOptionCatalog.findAll({
    order: [
      ['kind', 'ASC'],
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return rows.map(serializeCatalogOption);
}

export async function upsertCatalogOption(
  kind: string,
  value: string,
  code?: string | null,
  labelImage?: string | null
): Promise<VariantCatalogOption | null> {
  const kindKey = optionText(kind);
  const optionValue = optionText(value);
  if (!kindKey || !optionValue || kindKey === SIZE_KIND) return null;
  const existing = await VariantOptionCatalog.findAll({ where: { kind: kindKey } });
  const hit = existing.find((row) => valuesEqual(kindKey, String(row.get('value')), optionValue));
  const nextCode = optionText(code);
  if (hit) {
    const patch: Record<string, unknown> = {};
    if (nextCode && optionText(hit.get('code')) !== nextCode) patch.code = nextCode;
    if (labelImage !== undefined) patch.label_image = labelImage;
    if (Object.keys(patch).length) await hit.update(patch);
    return serializeCatalogOption(hit);
  }
  const created = await VariantOptionCatalog.create({
    kind: kindKey,
    value: optionValue,
    code: nextCode,
    sort_order: existing.length,
    label_image: labelImage || null,
  });
  return serializeCatalogOption(created);
}

function parseIncomingCatalog(incoming: unknown): VariantCatalogOption[] {
  const list = Array.isArray(incoming) ? incoming : [];
  const parsed: VariantCatalogOption[] = [];
  let index = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Record<string, unknown>;
    const kind = optionText(rec.kind);
    const value = optionText(rec.value);
    if (!kind || !value || kind === SIZE_KIND) continue;
    parsed.push({
      kind,
      value,
      code: optionText(rec.code),
      sort_order: rec.sort_order != null ? Number(rec.sort_order) : index,
      label_image: optionText(rec.label_image) || optionText(rec.image) || null,
    });
    index += 1;
  }
  const grouped = groupCatalogByKind(parsed);
  const out: VariantCatalogOption[] = [];
  let sort = 0;
  for (const field of catalogVariantFields()) {
    for (const option of uniqueCatalogForKind(field.key, grouped[field.key] || [])) {
      out.push({ ...option, sort_order: sort });
      sort += 1;
    }
  }
  for (const [kind, options] of Object.entries(grouped)) {
    if (kind === SIZE_KIND || catalogVariantFields().some((field) => field.key === kind)) continue;
    for (const option of uniqueCatalogForKind(kind, options)) {
      out.push({ ...option, sort_order: sort });
      sort += 1;
    }
  }
  return out;
}

export async function replaceVariantCatalog(incoming: unknown): Promise<VariantCatalogOption[]> {
  const existing = await loadVariantCatalog();
  const parsed = parseIncomingCatalog(incoming);
  for (const option of parsed) {
    if (option.label_image) continue;
    const hit = existing.find(
      (row) => row.kind === option.kind && valuesEqual(option.kind, row.value, option.value)
    );
    if (hit?.label_image) option.label_image = hit.label_image;
  }
  const parsedKeys = new Set(parsed.map((option) => `${option.kind}:${option.value.toLowerCase()}`));
  const extras = existing.filter((row) => {
    if (row.kind === SIZE_KIND) return false;
    if (catalogVariantFields().some((field) => field.key === row.kind)) return false;
    return !parsedKeys.has(`${row.kind}:${row.value.toLowerCase()}`);
  });
  const next = [...parsed, ...extras];
  await VariantOptionCatalog.destroy({ where: { kind: { [Op.ne]: SIZE_KIND } } });
  const created: VariantCatalogOption[] = [];
  for (const option of next) {
    const row = await VariantOptionCatalog.create({
      kind: option.kind,
      value: option.value,
      code: option.code || '',
      sort_order: option.sort_order,
      label_image: option.label_image || null,
    });
    created.push(serializeCatalogOption(row));
  }
  return created;
}

export async function deleteCatalogOption(kind: string, value: string): Promise<boolean> {
  const kindKey = optionText(kind);
  const optionValue = optionText(value);
  if (!kindKey || !optionValue) return false;
  const existing = await VariantOptionCatalog.findAll({ where: { kind: kindKey } });
  const hit = existing.find((row) => valuesEqual(kindKey, String(row.get('value')), optionValue));
  if (!hit) return false;
  await hit.destroy();
  return true;
}

function productCatalogValues(product: Record<string, unknown>): Array<{ kind: string; value: string }> {
  const out: Array<{ kind: string; value: string }> = [];
  for (const field of catalogVariantFields()) {
    if (field.key === 'wattage') {
      const wattage = wattageOptionValue(product.wattage);
      if (wattage) out.push({ kind: 'wattage', value: wattage });
      continue;
    }
    const value = optionText(product[field.key]);
    if (value) out.push({ kind: field.key, value });
  }
  return out;
}

export async function backfillVariantCatalog(): Promise<void> {
  const candidates: VariantCatalogOption[] = [];
  const seriesRows = await SeriesOption.findAll();
  for (const row of seriesRows) {
    const kind = optionText(row.get('kind'));
    const value = optionText(row.get('value'));
    if (!kind || !value || kind === SIZE_KIND) continue;
    candidates.push({ kind, value, code: '', sort_order: 0 });
  }
  const products = await Product.findAll();
  for (const product of products) {
    const plain = product.get({ plain: true }) as Record<string, unknown>;
    for (const item of productCatalogValues(plain)) {
      candidates.push({ kind: item.kind, value: item.value, code: '', sort_order: 0 });
    }
  }
  const grouped = groupCatalogByKind(candidates);
  for (const field of catalogVariantFields()) {
    for (const option of grouped[field.key] || []) {
      await upsertCatalogOption(option.kind, option.value);
    }
  }
}
