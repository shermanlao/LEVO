import { Request, Response } from 'express';
import { Product, ProductSeries, ProductType } from '../models';
import { clientError } from '../lib/errors';
import {
  buildGeneralLabelPdf,
  buildProductLabelPdf,
  GENERAL_LABEL_FILENAME,
  labelFilename,
} from '../lib/labelPdf';
import { sendPdf } from '../lib/pdfResponse';

const PRODUCT_INCLUDE = [
  {
    model: ProductSeries,
    as: 'series',
    include: [{ model: ProductType, as: 'type' }],
  },
  { model: ProductType, as: 'type' },
];

export const getGeneralLabel = async (_req: Request, res: Response) => {
  try {
    const pdf = await buildGeneralLabelPdf();
    return sendPdf(res, pdf, GENERAL_LABEL_FILENAME);
  } catch (error) {
    console.error('General label PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
};

export const getProductLabel = async (req: Request, res: Response) => {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) {
      return res.status(400).json({ error: 'Missing product slug' });
    }

    const product = await Product.findOne({
      where: { slug },
      include: PRODUCT_INCLUDE,
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const pdf = await buildProductLabelPdf(product);
    return sendPdf(res, pdf, labelFilename(product.get('product_code'), slug));
  } catch (error) {
    console.error('Product label PDF generation failed:', error);
    return res.status(500).json({ error: clientError(error) });
  }
};
