import Product from '../models/Product';
import ProductSeries from '../models/ProductSeries';
import ProductType from '../models/ProductType';
import { LightXProduct } from './lightxClient';
import { levoDisplayName } from './productCode';
import { loadSeriesOptions, mergeProductIntoSeriesOptions, upsertSeriesSizePacks } from './seriesConfig';
import { findSizePack, groupOptionsByKind, optionText, sizeLabel } from './shared/series-options';

export const LIGHTX_SOURCE = 'lightx';

export type ImportPlacement = {
  typeId: number;
  seriesId: number;
};

function text(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : null;
}

export function mapLightXToProductFields(
  item: LightXProduct,
  typeId: number,
  seriesId: number,
  typeName: string,
  typeSlug: string
) {
  const wattage = parseNumber(item.wattage);
  const photos = item.photos || {};
  const vendorCode = text(item.article) || text(item.vendorProductCode) || text(item.id) || null;
  const vendorModel = text(item.model) || null;

  return {
    name: levoDisplayName(typeName, wattage, typeSlug),
    description: '',
    wattage,
    lumen: parseNumber(item.lumen),
    cct: text(item.colorTemperature) || null,
    beam_angle: text(item.beamAngle) || null,
    dimming: text(item.control) || 'None',
    is_featured: false,
    series_id: seriesId,
    product_type_id: typeId,
    vendor_code: vendorCode,
    vendor_model: vendorModel,
    dimensions: text(item.size) || null,
    cutout_size: text(item.cutHole) || null,
    mounting_type: text(item.mounting) || null,
    colour: text(item.finish) || null,
    trim_color: text(item.finish) || null,
    lamp_source: text(item.lamp) || null,
    cri: text(item.cri) || null,
    ip_rating: text(item.ipRating) || null,
    driver_type: text(item.driverType) || text(item.driver) || null,
    power_factor: text(item.powerFactor) || null,
    main_image_A: photos.main || null,
    featured_image: photos.main || null,
    size_image: photos.size || null,
    application_image: photos.other1 || null,
    photometric_image: photos.other2 || null,
    main_image_B: photos.other3 || null,
    external_id: text(item.id),
    external_source: LIGHTX_SOURCE,
    updated_at: new Date(),
  };
}

export type ImportResult = {
  id: string;
  status: 'created' | 'updated' | 'skipped';
  productId?: number;
  reason?: string;
};

function copyPhotoIfEmpty(
  pack: Record<string, unknown>,
  patch: Record<string, unknown>,
  field: string,
  incoming: string | null
) {
  if (!incoming) return;
  if (!optionText(pack[field])) patch[field] = incoming;
}

export async function importLightXProduct(
  item: LightXProduct,
  placement: ImportPlacement
): Promise<ImportResult> {
  const externalId = text(item.id);
  if (!externalId) {
    return { id: '', status: 'skipped', reason: 'Missing partner product id' };
  }

  const type = await ProductType.findByPk(placement.typeId);
  if (!type) {
    return { id: externalId, status: 'skipped', reason: 'LEVO category not found' };
  }
  const typeId = Number(type.get('id'));
  const typeName = String(type.get('name') || 'Light');
  const typeSlug = String(type.get('slug') || '');

  if (!placement.seriesId) {
    return { id: externalId, status: 'skipped', reason: 'Select a LEVO series before importing' };
  }

  const series = await ProductSeries.findByPk(placement.seriesId);
  if (!series) {
    return { id: externalId, status: 'skipped', reason: 'LEVO series not found' };
  }
  if (Number(series.get('product_type_id')) !== typeId) {
    return {
      id: externalId,
      status: 'skipped',
      reason: 'Series does not belong to the selected category',
    };
  }
  const seriesId = Number(series.get('id'));
  const fields = mapLightXToProductFields(item, typeId, seriesId, typeName, typeSlug);

  await mergeProductIntoSeriesOptions(seriesId, fields as Record<string, unknown>);
  await upsertSeriesSizePacks(seriesId);

  const options = await loadSeriesOptions(seriesId);
  const grouped = groupOptionsByKind(options);
  const sizeValue = sizeLabel(fields.dimensions, fields.cutout_size) || fields.dimensions || '';
  const products = await Product.findAll({ where: { series_id: seriesId } });
  const plains = products.map((row) => row.get({ plain: true }) as Record<string, unknown>);
  const packPlain = findSizePack(plains, sizeValue, grouped);
  const pack = packPlain
    ? products.find((row) => Number(row.get('id')) === Number(packPlain.id))
    : null;

  if (!pack) {
    return { id: externalId, status: 'skipped', reason: 'Could not match a size pack for this article' };
  }

  const current = pack.get({ plain: true }) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date() };
  if (!optionText(current.vendor_code) && fields.vendor_code) patch.vendor_code = fields.vendor_code;
  if (!optionText(current.vendor_model) && fields.vendor_model) patch.vendor_model = fields.vendor_model;
  if (!optionText(current.external_id)) {
    patch.external_id = fields.external_id;
    patch.external_source = LIGHTX_SOURCE;
  }
  copyPhotoIfEmpty(current, patch, 'main_image_A', fields.main_image_A);
  copyPhotoIfEmpty(current, patch, 'main_image_B', fields.main_image_B);
  copyPhotoIfEmpty(current, patch, 'size_image', fields.size_image);
  copyPhotoIfEmpty(current, patch, 'application_image', fields.application_image);
  copyPhotoIfEmpty(current, patch, 'photometric_image', fields.photometric_image);
  copyPhotoIfEmpty(current, patch, 'featured_image', fields.featured_image);

  const wasNew = !optionText(current.main_image_A) && Boolean(fields.main_image_A);
  if (Object.keys(patch).length > 1) await pack.update(patch);

  return {
    id: externalId,
    status: wasNew ? 'created' : 'updated',
    productId: Number(pack.get('id')),
  };
}
