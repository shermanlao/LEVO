import { Request, Response } from 'express';
import { Op, WhereOptions } from 'sequelize';
import { Product, ProductSeries, ProductType } from '../models';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { errorMessage } from '../lib/errors';
import { serializeProduct, serializeProductListItem } from '../lib/serializeProduct';
import { warmProductRemoteMedia } from '../lib/productMediaCache';
import { setPublicListCache } from '../lib/publicCache';
import { clearGeneratedPdfCache } from '../lib/generatedPdfCache';
import { allocateProductCodeForTypeId } from '../lib/productCode';
import {
  PRODUCT_IMAGE_FIELDS,
  extractStoredImageUrl,
  isMaskedProductMediaUrl,
} from '../lib/productMedia';
import {
  CIRCULAR_BEAM_DEGREES,
  LINEAR_BEAM_DEGREES,
  isLibraryBeamDegrees,
  isPhotometricFamily,
} from '../lib/photometric/beamLibrary';
import { generateStampedLdtText } from '../lib/photometric/generateProductLdt';
import { ldtDownloadName, previewLdtStamp } from '../lib/photometric/stampLdtFromProduct';
import { productToLdtStampWithSite } from '../lib/photometric/productToLdtStamp';
import { resolveProductLdtChoice } from '../lib/photometric/productLdtChoice';
import { renderLibraryPolarPng } from '../lib/photometric/polarPng';
import { writeProductPhotometricPng } from '../lib/photometric/writeProductPolarPng';
import { persistProductLdtFile, persistProductLdtFileSafe } from '../lib/photometric/persistProductLdt';
import {
  deleteProductLdtFile,
  resolveProductLdtFileOnDisk,
} from '../lib/photometric/writeProductLdtFile';

function unwrapProductBody(body: unknown): Record<string, unknown> {
  if (!body || typeof body !== 'object') return {};
  const rec = body as Record<string, unknown>;
  const nested =
    rec.data && typeof rec.data === 'object' && !Array.isArray(rec.data)
      ? (rec.data as Record<string, unknown>)
      : rec;
  const next = { ...nested };
  if (next.featured_image == null || next.featured_image === '') {
    if (next.featured_image_id) next.featured_image = next.featured_image_id;
  }
  delete next.featured_image_id;
  delete next.featured;

  for (const field of PRODUCT_IMAGE_FIELDS) {
    if (!(field in next)) continue;
    const stored = extractStoredImageUrl(next[field]);
    if (stored && isMaskedProductMediaUrl(stored)) {
      delete next[field];
      continue;
    }
    next[field] = stored;
  }
  delete next.ldt_file;
  return next;
}

async function loadProductRow(id: string) {
  const numericId = Number(id);
  return Number.isInteger(numericId)
    ? Product.findByPk(numericId, { include: PRODUCT_INCLUDE })
    : Product.findOne({ where: { slug: id }, include: PRODUCT_INCLUDE });
}

const PRODUCT_INCLUDE = [
  {
    model: ProductSeries,
    as: 'series',
    include: [{ model: ProductType, as: 'type' }],
  },
  { model: ProductType, as: 'type' },
];

function firstQuery(req: Request, keys: string[]): string {
  for (const key of keys) {
    const value = req.query[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].trim()) {
      return value[0].trim();
    }
  }
  return '';
}

function slugFromFilters(query: Request['query'], group: 'series' | 'product_type'): string {
  const filters = query.filters;
  if (!filters || typeof filters !== 'object' || Array.isArray(filters)) return '';
  const groupVal = (filters as Record<string, unknown>)[group];
  if (!groupVal || typeof groupVal !== 'object' || Array.isArray(groupVal)) return '';
  const slug = (groupVal as Record<string, unknown>).slug;
  if (typeof slug === 'string') return slug.trim();
  if (slug && typeof slug === 'object' && !Array.isArray(slug)) {
    const eq = (slug as Record<string, unknown>).$eq;
    if (typeof eq === 'string') return eq.trim();
  }
  return '';
}

function likeNeedle(q: string): string {
  return `%${q.replace(/[%_]/g, '')}%`;
}

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  const seriesSlug =
    firstQuery(req, ['series', 'filters[series][slug]', 'filters[series][slug][$eq]']) ||
    slugFromFilters(req.query, 'series');
  const typeSlug =
    firstQuery(req, ['filters[product_type][slug]', 'filters[product_type][slug][$eq]', 'type']) ||
    slugFromFilters(req.query, 'product_type');
  const q = firstQuery(req, ['q']);

  const clauses: WhereOptions[] = [];

  if (seriesSlug) {
    const series = await ProductSeries.findOne({ where: { slug: seriesSlug } });
    if (!series) {
      setPublicListCache(res);
      return res.json({ data: [] });
    }
    clauses.push({ series_id: series.get('id') as number });
  }

  if (typeSlug) {
    const type = await ProductType.findOne({ where: { slug: typeSlug } });
    if (!type) {
      setPublicListCache(res);
      return res.json({ data: [] });
    }
    const typeId = type.get('id') as number;
    const seriesRows = await ProductSeries.findAll({
      where: { product_type_id: typeId },
      attributes: ['id'],
    });
    const seriesIds = seriesRows.map((row) => row.get('id') as number);
    const typeMatch: WhereOptions[] = [{ product_type_id: typeId }];
    if (seriesIds.length > 0) {
      typeMatch.push({ series_id: { [Op.in]: seriesIds } });
    }
    clauses.push({ [Op.or]: typeMatch });
  }

  if (q) {
    const like = likeNeedle(q);
    clauses.push({
      [Op.or]: [
        { name: { [Op.like]: like } },
        { description: { [Op.like]: like } },
        { product_code: { [Op.like]: like } },
      ],
    });
  }

  const where: WhereOptions =
    clauses.length === 0 ? {} : clauses.length === 1 ? clauses[0] : { [Op.and]: clauses };

  const products = await Product.findAll({ where, include: PRODUCT_INCLUDE });
  setPublicListCache(res);
  res.json({ data: products.map(serializeProductListItem) });
});

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const product = await loadProductRow(id);
  if (!product) return notFound(res, 'Product');
  res.json({ data: serializeProduct(product) });
  warmProductRemoteMedia(product);
});

async function respondWithProductBySlug(res: Response, slug: string) {
  const product = await Product.findOne({
    where: { slug },
    include: PRODUCT_INCLUDE,
  });
  if (!product) return notFound(res, 'Product');
  res.json({ data: serializeProduct(product) });
  warmProductRemoteMedia(product);
}

export const getProductBySlug = asyncHandler(async (req: Request, res: Response) => {
  return respondWithProductBySlug(res, req.params.slug);
});

export const getProductByPath = asyncHandler(async (req: Request, res: Response) => {
  return respondWithProductBySlug(res, req.params.slug);
});

export const getFeaturedProducts = asyncHandler(async (_req: Request, res: Response) => {
  const products = await Product.findAll({
    where: { is_featured: true },
    include: PRODUCT_INCLUDE,
  });
  setPublicListCache(res);
  res.json({ data: products.map(serializeProductListItem) });
});

export const getProductLdtOptions = asyncHandler(async (req: Request, res: Response) => {
  const product = await loadProductRow(req.params.id);
  if (!product) return notFound(res, 'Product');
  const row = product.get({ plain: true }) as Record<string, unknown>;
  const stamp = await productToLdtStampWithSite(row);
  const choice = resolveProductLdtChoice(row, stamp);
  const preview = previewLdtStamp(stamp, choice.family);
  res.json({
    family: choice.family,
    beamDegrees: choice.beamDegrees,
    saved: choice.saved,
    familyMessage: choice.familyMessage,
    beamMessage: choice.beamMessage,
    circularBeams: [...CIRCULAR_BEAM_DEGREES],
    linearBeams: [...LINEAR_BEAM_DEGREES],
    preview: {
      ...preview,
      canDownload: preview.lumen != null && preview.lumen > 0,
    },
  });
});

export const putProductLdtOptions = asyncHandler(async (req: Request, res: Response) => {
  const product = await loadProductRow(req.params.id);
  if (!product) return notFound(res, 'Product');
  const familyRaw = String((req.body as { family?: unknown })?.family || '').trim();
  const beamDegrees = Number((req.body as { beamDegrees?: unknown })?.beamDegrees);
  if (!isPhotometricFamily(familyRaw) || !Number.isInteger(beamDegrees) || !isLibraryBeamDegrees(familyRaw, beamDegrees)) {
    return res.status(400).json({ error: 'Choose a circular or linear library beam' });
  }
  const png = await renderLibraryPolarPng(familyRaw, beamDegrees);
  const row = product.get({ plain: true }) as Record<string, unknown> & {
    series?: { slug?: string };
  };
  const stored = writeProductPhotometricPng(Number(row.id), row.series?.slug, png);
  await product.update({
    ldt_family: familyRaw,
    ldt_beam_degrees: beamDegrees,
    photometric_image: stored,
  });
  await persistProductLdtFileSafe(Number(row.id));
  const full = await loadProductRow(String(row.id));
  res.json({ data: serializeProduct(full || product) });
});

export const getProductLdt = asyncHandler(async (req: Request, res: Response) => {
  try {
    const product = await loadProductRow(req.params.id);
    if (!product) return notFound(res, 'Product');
    const row = product.get({ plain: true }) as Record<string, unknown>;
    const stamp = await productToLdtStampWithSite(row);
    const familyRaw = String(req.query.family || '');
    const beamRaw = req.query.beamDegrees;
    const beamDegrees = beamRaw == null || beamRaw === '' ? NaN : Number(beamRaw);
    const previewOverride =
      isPhotometricFamily(familyRaw) &&
      Number.isInteger(beamDegrees) &&
      isLibraryBeamDegrees(familyRaw, beamDegrees);
    const fileName = ldtDownloadName(stamp);

    if (previewOverride) {
      const { text: stamped } = await generateStampedLdtText(stamp, {
        family: familyRaw,
        beamDegrees,
      });
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Cache-Control', 'no-store');
      return res.send(stamped);
    }

    let disk = resolveProductLdtFileOnDisk(typeof row.ldt_file === 'string' ? row.ldt_file : null);
    if (!disk) {
      await persistProductLdtFile(Number(row.id));
      const refreshed = await loadProductRow(String(row.id));
      const next = refreshed?.get({ plain: true }) as Record<string, unknown> | undefined;
      disk = resolveProductLdtFileOnDisk(typeof next?.ldt_file === 'string' ? next.ldt_file : null);
    }
    if (!disk) {
      return res.status(400).json({ error: 'Lumen output is required to generate an LDT file' });
    }

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.sendFile(disk);
  } catch (error) {
    const message = errorMessage(error);
    const status = /lumen/i.test(message) ? 400 : 500;
    res.status(status).json({ error: message });
  }
});

export const createProduct = asyncHandler(async (req: Request, res: Response) => {
  const body = unwrapProductBody(req.body);
  if (!String(body.product_code || '').trim()) {
    body.product_code = await allocateProductCodeForTypeId(
      body.product_type_id != null ? Number(body.product_type_id) : null
    );
  }
  const product = await Product.create(body as any);
  const productId = product.get('id') as number;
  await persistProductLdtFileSafe(productId);
  await clearGeneratedPdfCache();
  const full = await Product.findByPk(productId, { include: PRODUCT_INCLUDE });
  res.status(201).json({ data: serializeProduct(full || product) });
});

export const updateProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return notFound(res, 'Product');
  await product.update(unwrapProductBody(req.body));
  await persistProductLdtFileSafe(Number(req.params.id));
  await clearGeneratedPdfCache();
  const full = await Product.findByPk(req.params.id, { include: PRODUCT_INCLUDE });
  res.json({ data: serializeProduct(full || product) });
});

export const deleteProduct = asyncHandler(async (req: Request, res: Response) => {
  const product = await Product.findByPk(req.params.id);
  if (!product) return notFound(res, 'Product');
  deleteProductLdtFile(product.get('ldt_file') as string | null);
  await product.destroy();
  await clearGeneratedPdfCache();
  deleteSuccess(res);
});
