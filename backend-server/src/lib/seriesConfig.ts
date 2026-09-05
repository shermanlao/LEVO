import Product from '../models/Product';
import ProductSeries from '../models/ProductSeries';
import ProductType from '../models/ProductType';
import SeriesOption from '../models/SeriesOption';
import SeriesAppearancePhoto from '../models/SeriesAppearancePhoto';
import {
  ALWAYS_VISIBLE_KINDS,
  SIZE_KIND,
  filledSelection,
  findSizeOption,
  findSizePack,
  groupOptionsByKind,
  optionText,
  parseOptionNumber,
  productMatchesSize,
  seriesOrderingCode,
  sizeLabel,
  valuesEqual,
  variantSpecFields,
  visibleSelectorKinds,
  wattageOptionValue,
  type SeriesOptionDto,
} from './shared/series-options';
import { uniqueSlug } from './slugify';
import { upsertCatalogOption } from './variantCatalog';
import { fillPhraseTemplate } from './shared/description-phrase';
import { copyPackDatasheetFields } from './shared/datasheet-labels';
import { isAppearanceNa } from './shared/product-specs';
import {
  findAppearancePhoto,
  normalizeAppearanceCombo,
  type AppearancePhotoDto,
} from './shared/appearance-photos';

export type { SeriesOptionDto, AppearancePhotoDto };

const SERIES_INCLUDE = [{ model: ProductType, as: 'type' }];

export function serializeSeriesOption(row: SeriesOption | Record<string, unknown>): SeriesOptionDto {
  const p = typeof (row as SeriesOption).get === 'function' ? (row as SeriesOption).get({ plain: true }) : row;
  const rec = p as Record<string, unknown>;
  return {
    id: rec.id != null ? Number(rec.id) : undefined,
    kind: String(rec.kind || ''),
    value: String(rec.value || ''),
    sort_order: Number(rec.sort_order) || 0,
    lumen: rec.lumen == null || rec.lumen === '' ? null : Number(rec.lumen),
    system_lumen: rec.system_lumen == null || rec.system_lumen === '' ? null : Number(rec.system_lumen),
    dimensions: rec.dimensions ? String(rec.dimensions) : null,
    cutout_size: rec.cutout_size ? String(rec.cutout_size) : null,
  };
}

export function groupedSeriesOptions(options: SeriesOptionDto[]) {
  return groupOptionsByKind(options);
}

export async function loadSeriesOptions(seriesId: number): Promise<SeriesOptionDto[]> {
  const rows = await SeriesOption.findAll({
    where: { series_id: seriesId },
    order: [
      ['kind', 'ASC'],
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  return rows.map(serializeSeriesOption);
}

export async function loadSeriesOptionsForIds(
  seriesIds: number[]
): Promise<Map<number, SeriesOptionDto[]>> {
  const map = new Map<number, SeriesOptionDto[]>();
  const ids = seriesIds.filter((id) => Number.isInteger(id));
  for (const id of ids) map.set(id, []);
  if (ids.length === 0) return map;
  const rows = await SeriesOption.findAll({
    where: { series_id: ids },
    order: [
      ['kind', 'ASC'],
      ['sort_order', 'ASC'],
      ['id', 'ASC'],
    ],
  });
  for (const row of rows) {
    const seriesId = Number(row.get('series_id'));
    const list = map.get(seriesId) || [];
    list.push(serializeSeriesOption(row));
    map.set(seriesId, list);
  }
  return map;
}

export function serializeAppearancePhoto(
  row: SeriesAppearancePhoto | Record<string, unknown>
): AppearancePhotoDto {
  const p =
    typeof (row as SeriesAppearancePhoto).get === 'function'
      ? (row as SeriesAppearancePhoto).get({ plain: true })
      : row;
  const rec = p as Record<string, unknown>;
  const combo = normalizeAppearanceCombo(rec);
  return {
    id: rec.id != null ? Number(rec.id) : undefined,
    series_id: rec.series_id != null ? Number(rec.series_id) : undefined,
    colour: combo.colour,
    trim_color: combo.trim_color,
    reflector_finish: combo.reflector_finish,
    main_image_A: optionText(rec.main_image_A),
    source_product_id: rec.source_product_id != null ? Number(rec.source_product_id) : null,
    generated_by_ai: Boolean(rec.generated_by_ai),
  };
}

export async function loadAppearancePhotos(seriesId: number): Promise<AppearancePhotoDto[]> {
  const rows = await SeriesAppearancePhoto.findAll({
    where: { series_id: seriesId },
    order: [['id', 'ASC']],
  });
  return rows.map(serializeAppearancePhoto);
}

function applyOption(spec: Record<string, unknown>, option: SeriesOptionDto) {
  if (isAppearanceNa(option.value)) return;
  if (option.kind === SIZE_KIND) {
    spec.size = option.value;
    spec.dimensions = optionText(option.dimensions) || option.value;
    if (option.cutout_size) spec.cutout_size = option.cutout_size;
    return;
  }
  if (option.kind === 'wattage') {
    const n = parseOptionNumber(option.value);
    spec.wattage = n != null ? n : option.value;
    if (option.lumen != null && Number.isFinite(Number(option.lumen))) spec.lumen = Number(option.lumen);
    if (option.system_lumen != null && Number.isFinite(Number(option.system_lumen))) {
      spec.system_lumen = Number(option.system_lumen);
    }
    return;
  }
  spec[option.kind] = option.value;
}

function optionForKind(
  grouped: Record<string, SeriesOptionDto[]>,
  kind: string,
  selected: string
): SeriesOptionDto | null {
  const list = grouped[kind] || [];
  if (kind === SIZE_KIND) return findSizeOption(grouped, selected);
  return list.find((option) => valuesEqual(kind, option.value, selected)) || null;
}

export type ResolvedSeriesConfig = {
  spec: Record<string, unknown>;
  matchedProduct: Record<string, unknown> | null;
  orderingCode: string;
  seriesSlug: string;
  seriesName: string;
  grouped: Record<string, SeriesOptionDto[]>;
};

export type ResolveSeriesResult =
  | { ok: true; config: ResolvedSeriesConfig }
  | { ok: false; status: number; error: string };

function selectionFromQuery(query: Record<string, unknown>): Record<string, string> {
  const selection: Record<string, string> = {};
  const kinds = new Set(variantSpecFields().map((field) => field.key));
  for (const kind of kinds) {
    const raw = query[kind];
    const value = Array.isArray(raw) ? optionText(raw[0]) : optionText(raw);
    if (value) selection[kind] = value;
  }
  return selection;
}

export async function resolveSeriesConfig(
  seriesSlug: string,
  query: Record<string, unknown>,
  opts?: { requireComplete?: boolean }
): Promise<ResolveSeriesResult> {
  const series = await ProductSeries.findOne({
    where: { slug: seriesSlug },
    include: SERIES_INCLUDE,
  });
  if (!series) return { ok: false, status: 404, error: 'Series not found' };

  const seriesId = Number(series.get('id'));
  const options = await loadSeriesOptions(seriesId);
  const grouped = groupOptionsByKind(options);
  const selection = selectionFromQuery(query);

  for (const [kind, selected] of Object.entries(selection)) {
    if (!optionForKind(grouped, kind, selected)) {
      return { ok: false, status: 400, error: `Unknown ${kind} value` };
    }
  }

  if (opts?.requireComplete) {
    const visible = visibleSelectorKinds(grouped);
    const missing = visible.filter((field) => !selection[field.key]).map((field) => field.label);
    if (missing.length) {
      return {
        ok: false,
        status: 400,
        error: `Select ${missing.join(', ')} to generate files`,
      };
    }
  }

  const products = await Product.findAll({ where: { series_id: seriesId } });
  const productPlains = products.map((row) => row.get({ plain: true }) as Record<string, unknown>);
  const seriesCode = optionText(series.get('product_code'));

  const spec: Record<string, unknown> = {
    name: series.get('name'),
    description: series.get('description') || '',
    slug: series.get('slug'),
    series: series.get({ plain: true }),
    type: (series.get({ plain: true }) as { type?: unknown }).type,
    ldt_family: series.get('ldt_family') || null,
    use_variant_ldt: true,
    featured_image: series.get('featured_image') || null,
    featured_image_source: series.get('featured_image_source') || null,
    featured_image_page: series.get('featured_image_page') || null,
    featured_image_datasheet: series.get('featured_image_datasheet') || null,
    main_image_A:
      series.get('featured_image_page') ||
      series.get('featured_image_source') ||
      series.get('featured_image') ||
      null,
    product_code: seriesCode || null,
  };

  for (const [kind, list] of Object.entries(grouped)) {
    if (list.length === 1 && !selection[kind]) applyOption(spec, list[0]);
  }
  for (const [kind, selected] of Object.entries(selection)) {
    const option = optionForKind(grouped, kind, selected);
    if (option) applyOption(spec, option);
  }

  const filled = filledSelection(grouped, selection);
  const sizePack = findSizePack(productPlains, optionText(spec.size) || filled[SIZE_KIND], grouped);

  if (sizePack) {
    spec.id = sizePack.id;
    spec.main_image_A = sizePack.main_image_A || spec.main_image_A;
    spec.main_image_B = sizePack.main_image_B || null;
    spec.size_image = sizePack.size_image || null;
    spec.application_image = sizePack.application_image || null;
    copyPackDatasheetFields(spec, sizePack);
    // Polar / LDT come from the selected beam + series shape, not a size-pack photo.
  } else {
    const firstWithSize = productPlains.find((product) => optionText(product.size_image));
    spec.size_image = firstWithSize?.size_image || null;
    const firstPhoto = productPlains.find((product) => optionText(product.main_image_A));
    if (!spec.main_image_A) spec.main_image_A = firstPhoto?.main_image_A || null;
  }

  const appearance = findAppearancePhoto(await loadAppearancePhotos(seriesId), spec);
  if (appearance?.main_image_A) spec.main_image_A = appearance.main_image_A;

  const orderingCode = seriesCode || seriesOrderingCode(String(series.get('slug')), spec);
  spec.product_code = orderingCode;
  spec.size = spec.size || sizeLabel(spec.dimensions, spec.cutout_size) || null;

  const filledPhrase = fillPhraseTemplate(series.get('description_phrase'), spec);
  spec.description = filledPhrase || series.get('description') || '';

  return {
    ok: true,
    config: {
      spec,
      matchedProduct: sizePack,
      orderingCode,
      seriesSlug: String(series.get('slug')),
      seriesName: String(series.get('name')),
      grouped,
    },
  };
}

export async function replaceSeriesOptions(seriesId: number, incoming: unknown): Promise<SeriesOptionDto[]> {
  const list = Array.isArray(incoming) ? incoming : [];
  await SeriesOption.destroy({ where: { series_id: seriesId } });
  const parsed: SeriesOptionDto[] = [];
  let index = 0;
  for (const raw of list) {
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Record<string, unknown>;
    const kind = optionText(rec.kind);
    const value =
      kind === 'wattage' ? wattageOptionValue(rec.value) : optionText(rec.value);
    if (!kind || !value) continue;
    parsed.push({
        kind,
        value,
        sort_order: rec.sort_order != null ? Number(rec.sort_order) : index,
        lumen: rec.lumen == null || rec.lumen === '' ? null : parseOptionNumber(rec.lumen),
        system_lumen:
          rec.system_lumen == null || rec.system_lumen === '' ? null : parseOptionNumber(rec.system_lumen),
        dimensions: optionText(rec.dimensions) || null,
        cutout_size: optionText(rec.cutout_size) || null,
        code: optionText(rec.code) || null,
      });
    index += 1;
  }
  const grouped = groupOptionsByKind(parsed);
  const created: SeriesOptionDto[] = [];
  let sort = 0;
  for (const field of variantSpecFields()) {
    for (const option of grouped[field.key] || []) {
      const row = await SeriesOption.create({
        series_id: seriesId,
        kind: option.kind,
        value: option.value,
        sort_order: sort,
        lumen: option.lumen ?? null,
        system_lumen: option.system_lumen ?? null,
        dimensions: option.dimensions || null,
        cutout_size: option.cutout_size || null,
      });
      if (option.kind !== SIZE_KIND && !isAppearanceNa(option.value)) {
        await upsertCatalogOption(option.kind, option.value, option.code);
      }
      created.push(serializeSeriesOption(row));
      sort += 1;
    }
  }
  await upsertSeriesSizePacks(seriesId);
  return created;
}

export async function upsertSeriesSizePacks(seriesId: number): Promise<void> {
  const series = await ProductSeries.findByPk(seriesId, {
    include: [{ model: ProductType, as: 'type' }],
  });
  if (!series) return;
  const options = await loadSeriesOptions(seriesId);
  const sizes = options.filter((option) => option.kind === SIZE_KIND && option.value);
  if (!sizes.length) return;

  const products = await Product.findAll({ where: { series_id: seriesId } });
  const typeId = Number(series.get('product_type_id')) || null;
  const seriesName = String(series.get('name') || 'Series');
  const seriesSlug = String(series.get('slug') || 'series');

  for (const size of sizes) {
    const existing = products.find((row) =>
      productMatchesSize(row.get({ plain: true }) as Record<string, unknown>, size)
    );
    const name = `${seriesName} ${size.value}`.trim();
    const dimensions = optionText(size.dimensions) || size.value;
    const cutout = optionText(size.cutout_size) || null;
    if (existing) {
      await existing.update({
        name,
        dimensions,
        cutout_size: cutout || existing.get('cutout_size') || null,
        series_id: seriesId,
        product_type_id: typeId || existing.get('product_type_id') || null,
        updated_at: new Date(),
      });
      continue;
    }
    const slug = await uniqueSlug(`${seriesSlug}-${size.value}`, async (candidate) => {
      const hit = await Product.findOne({ where: { slug: candidate } });
      return Boolean(hit);
    });
    const created = await Product.create({
      name,
      slug,
      description: '',
      series_id: seriesId,
      product_type_id: typeId,
      dimensions,
      cutout_size: cutout,
      created_at: new Date(),
      updated_at: new Date(),
    });
    products.push(created);
  }
}

async function upsertOption(
  seriesId: number,
  kind: string,
  value: string,
  extras: {
    lumen?: number | null;
    system_lumen?: number | null;
    dimensions?: string | null;
    cutout_size?: string | null;
  } = {}
) {
  if (!kind || !value) return;
  const skipCatalog = kind === SIZE_KIND || isAppearanceNa(value);
  const existing = await SeriesOption.findAll({ where: { series_id: seriesId, kind } });
  const hit = existing.find((row) => valuesEqual(kind, String(row.get('value')), value));
  if (hit) {
    const patch: Record<string, unknown> = {};
    if (extras.lumen != null && (hit.get('lumen') == null || hit.get('lumen') === '')) {
      patch.lumen = extras.lumen;
    }
    if (extras.system_lumen != null && (hit.get('system_lumen') == null || hit.get('system_lumen') === '')) {
      patch.system_lumen = extras.system_lumen;
    }
    if (extras.dimensions && !hit.get('dimensions')) patch.dimensions = extras.dimensions;
    if (extras.cutout_size && !hit.get('cutout_size')) patch.cutout_size = extras.cutout_size;
    if (Object.keys(patch).length) await hit.update(patch);
    if (!skipCatalog) await upsertCatalogOption(kind, value);
    return;
  }
  await SeriesOption.create({
    series_id: seriesId,
    kind,
    value,
    sort_order: existing.length,
    lumen: extras.lumen ?? null,
    system_lumen: extras.system_lumen ?? null,
    dimensions: extras.dimensions ?? null,
    cutout_size: extras.cutout_size ?? null,
  });
  if (!skipCatalog) await upsertCatalogOption(kind, value);
}

export async function mergeProductIntoSeriesOptions(
  seriesId: number,
  product: Record<string, unknown>
): Promise<void> {
  const wattage = wattageOptionValue(product.wattage);
  if (wattage) {
    await upsertOption(seriesId, 'wattage', wattage, {
      lumen: parseOptionNumber(product.lumen),
      system_lumen: parseOptionNumber(product.system_lumen),
    });
  }
  const dim = optionText(product.dimensions);
  const cut = optionText(product.cutout_size);
  if (dim || cut) {
    await upsertOption(seriesId, SIZE_KIND, sizeLabel(dim, cut) || dim, {
      dimensions: dim || null,
      cutout_size: cut || null,
    });
  }
  for (const field of variantSpecFields()) {
    if (field.key === 'wattage' || field.key === SIZE_KIND) continue;
    const value = optionText(product[field.key]);
    if (value) await upsertOption(seriesId, field.key, value);
  }
}

export async function backfillSeriesOptionsFromProducts(): Promise<void> {
  const seriesList = await ProductSeries.findAll();
  for (const series of seriesList) {
    const seriesId = Number(series.get('id'));
    if (!seriesId) continue;
    const existing = await SeriesOption.count({ where: { series_id: seriesId } });
    if (existing > 0) continue;
    const products = await Product.findAll({ where: { series_id: seriesId } });
    for (const product of products) {
      await mergeProductIntoSeriesOptions(seriesId, product.get({ plain: true }) as Record<string, unknown>);
    }
    if (!optionText(series.get('ldt_family'))) {
      const withFamily = products.find((row) => optionText(row.get('ldt_family')));
      if (withFamily) {
        await series.update({ ldt_family: withFamily.get('ldt_family') });
      }
    }
  }
}

export { ALWAYS_VISIBLE_KINDS, visibleSelectorKinds };
