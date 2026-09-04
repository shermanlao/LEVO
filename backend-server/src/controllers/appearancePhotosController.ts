import { Request, Response } from 'express';
import SeriesAppearancePhoto from '../models/SeriesAppearancePhoto';
import ProductSeries from '../models/ProductSeries';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { extractStoredImageUrl } from '../lib/productMedia';
import { optionText } from '../lib/shared/series-options';
import { normalizeAppearanceCombo } from '../lib/shared/appearance-photos';
import { loadAppearancePhotos, serializeAppearancePhoto } from '../lib/seriesConfig';

function comboWhere(seriesId: number, body: Record<string, unknown>) {
  const combo = normalizeAppearanceCombo(body);
  return {
    series_id: seriesId,
    colour: combo.colour,
    trim_color: combo.trim_color,
    reflector_finish: combo.reflector_finish,
  };
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
  if (!path) return res.status(400).json({ error: 'Photo is required' });
  const where = comboWhere(seriesId, body);
  const payload = {
    ...where,
    main_image_A: path,
    source_product_id:
      body.source_product_id != null && Number.isFinite(Number(body.source_product_id))
        ? Number(body.source_product_id)
        : null,
    generated_by_ai: Boolean(body.generated_by_ai),
  };
  const existing = await SeriesAppearancePhoto.findOne({ where });
  const row = existing ? await existing.update(payload) : await SeriesAppearancePhoto.create(payload);
  res.json({ data: serializeAppearancePhoto(row) });
});

export const deleteSeriesAppearancePhoto = asyncHandler(async (req: Request, res: Response) => {
  const series = await ProductSeries.findByPk(req.params.id);
  if (!series) return notFound(res, 'Product series');
  const seriesId = Number(series.get('id'));
  const query = req.query as Record<string, unknown>;
  const body = (req.body || {}) as Record<string, unknown>;
  const id = Number(query.id || body.id);
  if (Number.isInteger(id) && id > 0) {
    const row = await SeriesAppearancePhoto.findOne({ where: { id, series_id: seriesId } });
    if (!row) return notFound(res, 'Appearance photo');
    await row.destroy();
    return deleteSuccess(res);
  }
  const colour = optionText(query.colour ?? body.colour);
  const trim_color = optionText(query.trim_color ?? body.trim_color);
  const reflector_finish = optionText(query.reflector_finish ?? body.reflector_finish);
  const row = await SeriesAppearancePhoto.findOne({
    where: comboWhere(seriesId, { colour, trim_color, reflector_finish }),
  });
  if (!row) return notFound(res, 'Appearance photo');
  await row.destroy();
  deleteSuccess(res);
});
