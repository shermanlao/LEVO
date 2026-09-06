import { Request, Response } from 'express';
import { ProductSeries, ProductType } from '../models';
import ProductTypeClass from '../models/ProductType';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { setPublicListCache } from '../lib/publicCache';
import { strapiMedia } from '../lib/strapiSerialize';
import { extractStoredImageUrl } from '../lib/productMedia';
import { parseDatasheetLabels, stringifyDatasheetLabels } from '../lib/shared/datasheet-labels';

function serializeProductType(
  row: InstanceType<typeof ProductTypeClass>,
  extras: { series_count?: number } = {}
) {
  const p = row.get({ plain: true }) as {
    id: number;
    name: string;
    description: string | null;
    slug: string;
    featured_image: string | null;
    datasheet_labels: unknown;
  };
  return {
    id: p.id,
    attributes: {
      name: p.name,
      description: p.description ?? '',
      slug: p.slug,
      featured_image: strapiMedia(p.featured_image),
      datasheet_labels: parseDatasheetLabels(p.datasheet_labels),
      ...(extras.series_count !== undefined ? { series_count: extras.series_count } : {}),
    },
  };
}

async function seriesCountByTypeId(): Promise<Map<number, number>> {
  const rows = await ProductSeries.findAll({ attributes: ['product_type_id'] });
  const counts = new Map<number, number>();
  for (const row of rows) {
    const typeId = Number(row.get('product_type_id'));
    if (!Number.isInteger(typeId) || typeId <= 0) continue;
    counts.set(typeId, (counts.get(typeId) || 0) + 1);
  }
  return counts;
}

function typeWritePayload(body: Record<string, unknown>) {
  const payload: Record<string, unknown> = { ...body };
  if (payload.featured_image !== undefined) {
    payload.featured_image = extractStoredImageUrl(payload.featured_image);
  }
  if (body.datasheet_labels !== undefined) {
    payload.datasheet_labels = stringifyDatasheetLabels(parseDatasheetLabels(body.datasheet_labels));
  }
  delete payload.id;
  delete payload.attributes;
  return payload;
}

export const getAllProductTypes = asyncHandler(async (_req: Request, res: Response) => {
  const [productTypes, seriesCounts] = await Promise.all([
    ProductType.findAll(),
    seriesCountByTypeId(),
  ]);
  setPublicListCache(res);
  res.json({
    data: productTypes.map((row) =>
      serializeProductType(row, { series_count: seriesCounts.get(Number(row.get('id'))) || 0 })
    ),
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
  const productType = await ProductType.create(typeWritePayload(req.body || {}));
  res.status(201).json({ data: serializeProductType(productType) });
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
