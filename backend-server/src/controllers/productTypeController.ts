import { Request, Response } from 'express';
import { ProductType } from '../models';
import ProductTypeClass from '../models/ProductType';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { setPublicListCache } from '../lib/publicCache';
import { strapiMedia } from '../lib/strapiSerialize';
import { extractStoredImageUrl } from '../lib/productMedia';
import { parseDatasheetLabels, stringifyDatasheetLabels } from '../lib/shared/datasheet-labels';

function serializeProductType(row: InstanceType<typeof ProductTypeClass>) {
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
    },
  };
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
  const productTypes = await ProductType.findAll();
  setPublicListCache(res);
  res.json({ data: productTypes.map(serializeProductType) });
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
