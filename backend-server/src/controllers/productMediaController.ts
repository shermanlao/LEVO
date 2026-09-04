import { Request, Response } from 'express';
import { Product } from '../models';
import { errorMessage, clientError } from '../lib/errors';
import { isProductImageField, isRemoteHttpUrl } from '../lib/productMedia';
import { getOrFetchProductAsset } from '../lib/productMediaCache';
import { getActiveCatalogSource } from '../lib/lightxClient';

function isLocalPublicPath(stored: string): boolean {
  return stored.startsWith('/images/') || stored.startsWith('/uploads/') || stored.startsWith('/public/');
}

function sendAsset(
  req: Request,
  res: Response,
  asset: { contentType: string; buffer: Buffer }
) {
  res.setHeader('Content-Type', asset.contentType);
  res.setHeader('Content-Length', String(asset.buffer.length));
  res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800');
  if (req.method === 'HEAD') {
    return res.status(200).end();
  }
  return res.send(asset.buffer);
}

export const streamProductMedia = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const field = String(req.params.field || '');
  if (!Number.isInteger(id) || id < 1 || !isProductImageField(field)) {
    return res.status(400).json({ error: 'Invalid product image request' });
  }

  try {
    const product = await Product.findByPk(id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const stored = product.get(field) as string | null;
    if (!stored) return res.status(404).json({ error: 'Image not found' });

    if (!isRemoteHttpUrl(stored) && isLocalPublicPath(stored)) {
      return res.redirect(stored.startsWith('/') ? stored : `/${stored}`);
    }

    const source = await getActiveCatalogSource();
    const asset = await getOrFetchProductAsset(source, id, field, stored);
    if (!asset) {
      return res.status(502).json({ error: 'Image unavailable' });
    }

    return sendAsset(req, res, asset);
  } catch (error) {
    return res.status(502).json({ error: clientError(error) });
  }
};
