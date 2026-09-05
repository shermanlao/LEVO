import { Request, Response } from 'express';
import { Product, ProductSeries, ProductType, SeriesAppearancePhoto } from '../models';
import SeriesOption from '../models/SeriesOption';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { serializeProductListItem } from '../lib/serializeProduct';
import { setPublicListCache } from '../lib/publicCache';
import { parseSpecs, serializeTypeEnvelope, strapiMedia } from '../lib/strapiSerialize';
import { extractStoredImageUrl } from '../lib/productMedia';
import { comboCount, groupOptionsByKind, lookupCatalogCode, lookupCatalogLabel } from '../lib/shared/series-options';
import {
  parseDatasheetLabels,
  stringifyDatasheetLabels,
} from '../lib/shared/datasheet-labels';
import { allocateProductCodeForTypeId } from '../lib/productCode';
import { loadSeriesOptions, loadSeriesOptionsForIds, loadAppearancePhotos, replaceSeriesOptions } from '../lib/seriesConfig';
import { rewriteLegacyLumenPlaceholders } from '../lib/shared/description-phrase';
import { loadVariantCatalog, type VariantCatalogOption } from '../lib/variantCatalog';
import type { SeriesOptionDto } from '../lib/shared/series-options';
import { Op, type Includeable, type WhereOptions } from 'sequelize';
import { clearGeneratedPdfCache } from '../lib/generatedPdfCache';

const SERIES_INCLUDE = [{ model: ProductType, as: 'type' }];

const SERIES_PRODUCT_INCLUDE = [
  {
    model: ProductSeries,
    as: 'series',
    include: [{ model: ProductType, as: 'type' }],
  },
  { model: ProductType, as: 'type' },
];

function seriesWritePayload(body: Record<string, unknown>) {
  const specs = body.specifications;
  const payload: Record<string, unknown> = {};
  if (body.name !== undefined) payload.name = body.name;
  if (body.description !== undefined) payload.description = body.description;
  if (body.description_phrase !== undefined) {
    payload.description_phrase = rewriteLegacyLumenPlaceholders(body.description_phrase);
  }
  if (body.slug !== undefined) payload.slug = body.slug;
  if (body.product_type_id !== undefined) payload.product_type_id = body.product_type_id;
  if (body.featured_image !== undefined) payload.featured_image = extractStoredImageUrl(body.featured_image);
  if (body.featured_image_source !== undefined) {
    payload.featured_image_source = extractStoredImageUrl(body.featured_image_source);
  }
  if (body.featured_image_page !== undefined) {
    payload.featured_image_page = extractStoredImageUrl(body.featured_image_page);
  }
  if (body.featured_image_datasheet !== undefined) {
    payload.featured_image_datasheet = extractStoredImageUrl(body.featured_image_datasheet);
  }
  if (body.ldt_family !== undefined) payload.ldt_family = body.ldt_family || null;
  if (body.product_code !== undefined) payload.product_code = body.product_code || null;
  if (body.is_featured !== undefined) payload.is_featured = Boolean(body.is_featured);
  if (body.datasheet_labels !== undefined) {
    payload.datasheet_labels = stringifyDatasheetLabels(parseDatasheetLabels(body.datasheet_labels));
  }
  if (specs !== undefined) {
    payload.specifications =
      typeof specs === 'string' ? specs : JSON.stringify(parseSpecs(specs));
  }
  return payload;
}

type SerializeSeriesOpts = {
  products?: any[];
  catalog?: VariantCatalogOption[];
  options?: SeriesOptionDto[];
  includeAppearance?: boolean;
};

/** Strapi-like shape expected by the Next.js admin and catalog pages */
async function serializeProductSeries(row: any, productsOrOpts?: any[] | SerializeSeriesOpts) {
  const opts: SerializeSeriesOpts = Array.isArray(productsOrOpts)
    ? { products: productsOrOpts }
    : productsOrOpts || {};
  const p = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
  const type = p.type;
  const productRows = Array.isArray(opts.products) ? opts.products : [];
  const seriesId = Number(p.id);
  const options = opts.options
    ? [...opts.options]
    : Number.isInteger(seriesId)
      ? await loadSeriesOptions(seriesId)
      : [];
  const catalog = opts.catalog ?? (Number.isInteger(seriesId) ? await loadVariantCatalog() : []);
  for (const option of options) {
    option.code = lookupCatalogCode(catalog, option.kind, option.value) || option.code || null;
    option.label_image = lookupCatalogLabel(catalog, option.kind, option.value) || option.label_image || null;
  }
  const includeAppearance = opts.includeAppearance !== false;
  return {
    id: p.id,
    attributes: {
      name: p.name,
      description: p.description ?? '',
      description_phrase: rewriteLegacyLumenPlaceholders(p.description_phrase ?? ''),
      slug: p.slug,
      product_type_id: p.product_type_id ?? type?.id ?? null,
      specifications: parseSpecs(p.specifications),
      featured_image: strapiMedia(p.featured_image),
      featured_image_source: strapiMedia(p.featured_image_source),
      featured_image_page: strapiMedia(p.featured_image_page),
      featured_image_datasheet: strapiMedia(p.featured_image_datasheet),
      ldt_family: p.ldt_family ?? null,
      product_code: p.product_code ?? null,
      is_featured: Boolean(p.is_featured),
      datasheet_labels: parseDatasheetLabels(p.datasheet_labels),
      option_count: comboCount(groupOptionsByKind(options)),
      options,
      appearance_photos: includeAppearance && Number.isInteger(seriesId) ? await loadAppearancePhotos(seriesId) : [],
      product_type: serializeTypeEnvelope(type),
      products: { data: productRows.map(serializeProductListItem) },
      createdAt: p.created_at ?? '',
      updatedAt: p.updated_at ?? '',
    },
  };
}

async function serializeSeriesList(rows: any[]) {
  const catalog = await loadVariantCatalog();
  const ids = rows
    .map((row) => Number(typeof row?.get === 'function' ? row.get('id') : row.id))
    .filter((id) => Number.isInteger(id));
  const optionsById = await loadSeriesOptionsForIds(ids);
  return Promise.all(
    rows.map((row) => {
      const id = Number(typeof row?.get === 'function' ? row.get('id') : row.id);
      return serializeProductSeries(row, {
        catalog,
        options: optionsById.get(id) || [],
        includeAppearance: false,
        products: [],
      });
    })
  );
}

async function productsForSeries(seriesId: number) {
  return Product.findAll({
    where: { series_id: seriesId },
    include: SERIES_PRODUCT_INCLUDE,
  });
}

async function serializeSeriesWithProducts(series: any) {
  const id = Number(series.get?.('id') ?? series.id);
  const products = Number.isInteger(id) ? await productsForSeries(id) : [];
  return serializeProductSeries(series, { products, includeAppearance: true });
}

function seriesListInclude(typeSlug: string): Includeable[] {
  if (!typeSlug) return SERIES_INCLUDE;
  return [{ model: ProductType, as: 'type', where: { slug: typeSlug }, required: true }];
}

export const getAllProductSeries = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q || '').trim();
  const featured = String(req.query.featured || '') === '1' || String(req.query.featured || '') === 'true';
  const typeSlug = String(req.query.type || req.query.type_slug || '').trim();
  const typeId = Number(req.query.product_type_id || '');
  const clauses: WhereOptions[] = [];
  if (featured) clauses.push({ is_featured: true });
  if (Number.isInteger(typeId) && typeId > 0) clauses.push({ product_type_id: typeId });
  if (q) {
    const like = `%${q.replace(/[%_]/g, '')}%`;
    clauses.push({
      [Op.or]: [
        { name: { [Op.like]: like } },
        { description: { [Op.like]: like } },
        { slug: { [Op.like]: like } },
        { product_code: { [Op.like]: like } },
      ],
    });
  }
  const where: WhereOptions = clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { [Op.and]: clauses };
  const series = await ProductSeries.findAll({
    where,
    include: seriesListInclude(typeSlug),
  });
  setPublicListCache(res);
  res.json({ data: await serializeSeriesList(series) });
});

export const getFeaturedProductSeries = asyncHandler(async (_req: Request, res: Response) => {
  const series = await ProductSeries.findAll({
    where: { is_featured: true },
    include: SERIES_INCLUDE,
  });
  setPublicListCache(res);
  res.json({ data: await serializeSeriesList(series) });
});

export const getProductSeriesById = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id, { include: SERIES_INCLUDE });
  if (!series) return notFound(res, 'Product series');
  setPublicListCache(res);
  res.json({ data: await serializeSeriesWithProducts(series) });
});

export const getProductSeriesBySlug = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findOne({
    where: { slug: req.params.slug },
    include: SERIES_INCLUDE,
  });
  if (!series) return notFound(res, 'Product series');
  setPublicListCache(res);
  res.json({ data: await serializeSeriesWithProducts(series) });
});

export const createProductSeries = asyncHandler(async (req: Request, res: Response) => {
  const method = String(req.body?._method || '').toUpperCase();
  const overrideId = req.body?.id;
  if (method === 'DELETE' && overrideId != null) {
    req.params.id = String(overrideId);
    return deleteProductSeries(req, res);
  }
  if ((method === 'UPDATE' || method === 'PUT') && overrideId != null) {
    req.params.id = String(overrideId);
    return updateProductSeries(req, res);
  }

  const payload = seriesWritePayload(req.body || {});
  if (!payload.name || !payload.slug) {
    return res.status(400).json({ error: 'Name and slug are required.' });
  }
  if (!payload.product_code) {
    payload.product_code = await allocateProductCodeForTypeId(
      payload.product_type_id != null ? Number(payload.product_type_id) : null
    );
  }
  const created = await ProductSeries.create(payload);
  if (Array.isArray(req.body?.options)) {
    await replaceSeriesOptions(Number(created.get('id')), req.body.options);
  }
  await clearGeneratedPdfCache();
  const series = await ProductSeries.findByPk(created.get('id') as number, {
    include: SERIES_INCLUDE,
  });
  res.status(201).json({ data: await serializeProductSeries(series || created) });
});

export const updateProductSeries = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  await series.update(seriesWritePayload(req.body || {}));
  if (Array.isArray(req.body?.options)) {
    await replaceSeriesOptions(Number(series.get('id')), req.body.options);
  }
  await clearGeneratedPdfCache();
  const full = await ProductSeries.findByPk(req.params.id, { include: SERIES_INCLUDE });
  res.json({ data: await serializeProductSeries(full || series) });
});

export const deleteProductSeries = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  await SeriesOption.destroy({ where: { series_id: req.params.id } });
  await SeriesAppearancePhoto.destroy({ where: { series_id: req.params.id } });
  await Product.update({ series_id: null }, { where: { series_id: req.params.id } });
  await series.destroy();
  deleteSuccess(res);
});

