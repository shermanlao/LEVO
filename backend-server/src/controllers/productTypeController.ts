import { Request, Response } from 'express';
import { ProductSeries, ProductType } from '../models';
import ProductTypeClass from '../models/ProductType';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { setPublicListCache } from '../lib/publicCache';
import { strapiMedia } from '../lib/strapiSerialize';
import { extractStoredImageUrl } from '../lib/productMedia';
import { parseDatasheetLabels, stringifyDatasheetLabels } from '../lib/shared/datasheet-labels';
import { isStaffCatalogRequest, publicSeriesVisibleWhere } from '../lib/seriesVisibility';
import {
  CATALOG_LIST_ORDER,
  applyProductTypeReorder,
  nextProductTypeSortOrder,
  parseReorderIds,
} from '../lib/catalogSortOrder';

function serializeProductType(
  row: InstanceType<typeof ProductTypeClass>,
  extras: { series_count?: number; sole_series_slug?: string | null } = {}
) {
  const p = row.get({ plain: true }) as {
    id: number;
    name: string;
    description: string | null;
    slug: string;
    featured_image: string | null;
    featured_image_source: string | null;
    datasheet_labels: unknown;
    seo_title: string | null;
    seo_description: string | null;
  };
  return {
    id: p.id,
    attributes: {
      name: p.name,
      description: p.description ?? '',
      slug: p.slug,
      featured_image: strapiMedia(p.featured_image),
      featured_image_source: strapiMedia(p.featured_image_source),
      datasheet_labels: parseDatasheetLabels(p.datasheet_labels),
      seo_title: p.seo_title ?? '',
      seo_description: p.seo_description ?? '',
      ...(extras.series_count !== undefined ? { series_count: extras.series_count } : {}),
      ...(extras.sole_series_slug ? { sole_series_slug: extras.sole_series_slug } : {}),
    },
  };
}

type SeriesTypeSummary = { count: number; soleSlug: string | null };

async function seriesSummaryByTypeId(publicOnly: boolean): Promise<Map<number, SeriesTypeSummary>> {
  const rows = await ProductSeries.findAll({
    attributes: ['product_type_id', 'slug'],
    ...(publicOnly ? { where: publicSeriesVisibleWhere() } : {}),
  });
  const slugsByType = new Map<number, string[]>();
  for (const row of rows) {
    const typeId = Number(row.get('product_type_id'));
    const slug = String(row.get('slug') || '').trim();
    if (!Number.isInteger(typeId) || typeId <= 0 || !slug) continue;
    const list = slugsByType.get(typeId) || [];
    list.push(slug);
    slugsByType.set(typeId, list);
  }
  const summary = new Map<number, SeriesTypeSummary>();
  for (const [typeId, slugs] of slugsByType) {
    summary.set(typeId, {
      count: slugs.length,
      soleSlug: slugs.length === 1 ? slugs[0] : null,
    });
  }
  return summary;
}

function typeWritePayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ...body };
  if (payload.featured_image !== undefined) {
    payload.featured_image = extractStoredImageUrl(payload.featured_image);
  }
  if (payload.featured_image_source !== undefined) {
    payload.featured_image_source = extractStoredImageUrl(payload.featured_image_source);
  }
  if (body.datasheet_labels !== undefined) {
    payload.datasheet_labels = stringifyDatasheetLabels(parseDatasheetLabels(body.datasheet_labels));
  }
  if (body.seo_title !== undefined) {
    payload.seo_title = String(body.seo_title ?? '').trim() || null;
  }
  if (body.seo_description !== undefined) {
    payload.seo_description = String(body.seo_description ?? '').trim() || null;
  }
  delete payload.id;
  delete payload.attributes;
  delete payload.sort_order;
  return payload;
}

export const getAllProductTypes = asyncHandler(async (req: Request, res: Response) => {
  const [productTypes, seriesByType] = await Promise.all([
    ProductType.findAll({ order: [...CATALOG_LIST_ORDER] }),
    seriesSummaryByTypeId(!isStaffCatalogRequest(req)),
  ]);
  setPublicListCache(res);
  res.json({
    data: productTypes.map((row) => {
      const summary = seriesByType.get(Number(row.get('id')));
      return serializeProductType(row, {
        series_count: summary?.count || 0,
        sole_series_slug: summary?.soleSlug || null,
      });
    }),
  });
});

export const getProductTypeById = asyncHandler(async (req: Request, res: Response) => {
  const productType = await ProductType.findByPk(req.params.id);
  if (!productType) return notFound(res, 'Product type');
  setPublicListCache(res);
  res.json({ data: serializeProductType(productType) });
});

export const getProductTypeBySlug = asyncHandler(async (req: Request, res: Response) => {
  const productType = await ProductType.findOne({ where: { slug: req.params.slug } });
  if (!productType) return notFound(res, 'Product type');
  setPublicListCache(res);
  res.json({ data: serializeProductType(productType) });
});

export const createProductType = asyncHandler(async (req: Request, res: Response) => {
  const payload = typeWritePayload(req.body || {});
  payload.sort_order = await nextProductTypeSortOrder();
  const productType = await ProductType.create(payload);
  res.status(201).json({ data: serializeProductType(productType) });
});

export const reorderProductTypes = asyncHandler(async (req: Request, res: Response) => {
  const ids = parseReorderIds(req.body);
  if (!ids) return res.status(400).json({ error: 'Send ids as a list of product type ids.' });
  const problem = await applyProductTypeReorder(ids);
  if (problem) return res.status(400).json({ error: problem });
  return getAllProductTypes(req, res);
});

export const updateProductType = asyncHandler(async (req: Request, res: Response) => {
  const productType = await ProductType.findByPk(req.params.id);
  if (!productType) return notFound(res, 'Product type');
  await productType.update(typeWritePayload(req.body || {}));
  res.json({ data: serializeProductType(productType) });
});

export const deleteProductType = asyncHandler(async (req: Request, res: Response) => {
  const productType = await ProductType.findByPk(req.params.id);
  if (!productType) return notFound(res, 'Product type');
  await productType.destroy();
  deleteSuccess(res);
});
