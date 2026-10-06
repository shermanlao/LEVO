import { Request, Response } from 'express';
import SeriesAppearancePhoto from '../models/SeriesAppearancePhoto';
import ProductSeries from '../models/ProductSeries';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { extractStoredImageUrl } from '../lib/productMedia';
import { normalizeAppearanceCombo } from '../lib/shared/appearance-photos';
import { loadAppearancePhotos, serializeAppearancePhoto } from '../lib/seriesConfig';

function photoId(value: unknown): number {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : 0;
}

export const listSeriesAppearancePhotos = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  res.json({ data: await loadAppearancePhotos(Number(series.get('id'))) });
});

export const upsertSeriesAppearancePhoto = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  const seriesId = Number(series.get('id'));
  const body = (req.body || {}) as Record<string, unknown>;
  const path = extractStoredImageUrl(body.main_image_A);
  const id = photoId(body.id);
  const existing = id
    ? await SeriesAppearancePhoto.findOne({ where: { id, series_id: seriesId } })
    : null;
  if (id && !existing) return notFound(res, 'Appearance photo');
  if (!path && !existing) return res.status(400).json({ error: 'Photo is required' });
  const combo = normalizeAppearanceCombo(body);
  const generated =
    body.generated_by_ai === undefined
      ? Boolean(existing?.get('generated_by_ai'))
      : Boolean(body.generated_by_ai);
  const payload = {
    series_id: seriesId,
    colour: combo.colour,
    trim_color: combo.trim_color,
    reflector_finish: combo.reflector_finish,
    size: combo.size,
    main_image_A: path || String(existing?.get('main_image_A') || ''),
    source_product_id:
      body.source_product_id != null && Number.isFinite(Number(body.source_product_id))
        ? Number(body.source_product_id)
        : existing
          ? Number(existing.get('source_product_id')) || null
          : null,
    generated_by_ai: generated,
  };
  const row = existing ? await existing.update(payload) : await SeriesAppearancePhoto.create(payload);
  res.json({ data: serializeAppearancePhoto(row) });
});

export const deleteSeriesAppearancePhoto = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  const seriesId = Number(series.get('id'));
  const query = req.query as Record<string, unknown>;
  const body = (req.body || {}) as Record<string, unknown>;
  const id = photoId(query.id || body.id);
  if (!id) return res.status(400).json({ error: 'Photo id is required' });
  const row = await SeriesAppearancePhoto.findOne({ where: { id, series_id: seriesId } });
  if (!row) return notFound(res, 'Appearance photo');
  await row.destroy();
  deleteSuccess(res);
});
