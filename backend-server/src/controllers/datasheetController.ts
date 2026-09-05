import { Request, Response } from 'express';
import { Product, ProductSeries, ProductType } from '../models';
import { clientError } from '../lib/errors';
import {
  buildDatasheetPdf,
  buildInstallationPdf,
  datasheetFilename,
  installationFilename,
} from '../lib/datasheetPdf';
import { sendPdf } from '../lib/pdfResponse';
import { pdfCacheKey, readCachedPdf, writeCachedPdf } from '../lib/generatedPdfCache';
import { PUBLIC_CACHE_CONTROL } from '../lib/shared/cache-constants';

const PRODUCT_INCLUDE = [
  {
    model: ProductSeries,
    as: 'series',
    include: [{ model: ProductType, as: 'type' }],
  },
  { model: ProductType, as: 'type' },
];

async function findProductBySlug(slug: string) {
  return Product.findOne({
    where: { slug },
    include: PRODUCT_INCLUDE,
  });
}

async function cachedProductPdf(
  res: Response,
  slug: string,
  kind: 'datasheet' | 'installation',
  build: (product: NonNullable<Awaited<ReturnType<typeof findProductBySlug>>>) => Promise<Buffer>,
  filename: (product: NonNullable<Awaited<ReturnType<typeof findProductBySlug>>>) => string
) {
  const product = await findProductBySlug(slug);
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }
  const key = pdfCacheKey(['product', kind, slug, String(product.get('updated_at') || '')]);
  const cached = await readCachedPdf(key);
  if (cached) return sendPdf(res, cached, filename(product), PUBLIC_CACHE_CONTROL);
  const pdf = await build(product);
  await writeCachedPdf(key, pdf);
  return sendPdf(res, pdf, filename(product), PUBLIC_CACHE_CONTROL);
}

export const getProductDatasheet = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'Missing product slug' });
    }
    return cachedProductPdf(
      res,
      slug,
      'datasheet',
      (product) => buildDatasheetPdf(product),
      (product) => datasheetFilename(product.get('product_code'), slug)
    );
  } catch (error) {
    console.error('Datasheet PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
};

export const getProductInstallation = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'Missing product slug' });
    }
    return cachedProductPdf(
      res,
      slug,
      'installation',
      (product) => buildInstallationPdf(product),
      (product) => installationFilename(product.get('product_code'), slug)
    );
  } catch (error) {
    console.error('Installation PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
};
