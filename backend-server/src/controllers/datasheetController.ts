import { Request, Response } from 'express';
import { Product, ProductSeries, ProductType } from '../models';
import { clientError } from '../lib/errors';
import {
  buildDatasheetPdf,
  buildInstallationPdf,
  datasheetFilename,
  installationFilename,
} from '../lib/datasheetPdf';

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

function sendPdf(res: Response, pdf: Buffer, filename: string) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=60');
  return res.send(pdf);
}

export const getProductDatasheet = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'Missing product slug' });
    }

    const product = await findProductBySlug(slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const pdf = await buildDatasheetPdf(product);
    return sendPdf(res, pdf, datasheetFilename(product.get('product_code'), slug));
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

    const product = await findProductBySlug(slug);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const pdf = await buildInstallationPdf(product);
    return sendPdf(res, pdf, installationFilename(product.get('product_code'), slug));
  } catch (error) {
    console.error('Installation PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
};
