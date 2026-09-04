import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { loadVariantCatalog, replaceVariantCatalog, upsertCatalogOption, deleteCatalogOption } from '../lib/variantCatalog';
import { extractStoredImageUrl } from '../lib/productMedia';
import { CUSTOM_DATASHEET_LABEL_KIND } from '../lib/shared/datasheet-labels';

export const getVariantOptions = asyncHandler(async (_req: Request, res: Response) => {
  const data = await loadVariantCatalog();
  res.setHeader('Cache-Control', 'private, no-store');
  res.json({ data });
});

export const replaceVariantOptions = asyncHandler(async (req: Request, res: Response) => {
  const incoming = Array.isArray(req.body?.options) ? req.body.options : req.body?.data;
  const data = await replaceVariantCatalog(incoming);
  res.json({ data });
});

export const upsertVariantOptionLabel = asyncHandler(async (req: Request, res: Response) => {
  const kind = String(req.body?.kind || '').trim();
  const value = String(req.body?.value || '').trim();
  if (!kind || !value) {
    return res.status(400).json({ error: 'Kind and value are required.' });
  }
  const image =
    req.body?.label_image === undefined && req.body?.image === undefined
      ? undefined
      : extractStoredImageUrl(req.body.label_image ?? req.body.image);
  const data = await upsertCatalogOption(
    kind,
    value,
    req.body?.code,
    image === undefined ? undefined : image
  );
  if (!data) return res.status(400).json({ error: 'Could not save label.' });
  res.json({ data });
});

export const deleteVariantOptionLabel = asyncHandler(async (req: Request, res: Response) => {
  const kind = String(req.body?.kind || req.query.kind || '').trim();
  const value = String(req.body?.value || req.query.value || '').trim();
  if (!kind || !value) {
    return res.status(400).json({ error: 'Kind and value are required.' });
  }
  if (kind === CUSTOM_DATASHEET_LABEL_KIND) {
    const removed = await deleteCatalogOption(kind, value);
    if (!removed) return res.status(404).json({ error: 'Label not found.' });
    return res.json({ ok: true });
  }
  const data = await upsertCatalogOption(kind, value, undefined, null);
  if (!data) return res.status(400).json({ error: 'Could not clear label.' });
  res.json({ data });
});
