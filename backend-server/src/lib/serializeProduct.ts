import { publicImageUrl, ProductImageField } from './productMedia';
import { serializeTypeEnvelope, strapiMedia } from './strapiSerialize';

function serializeType(type: any) {
  return serializeTypeEnvelope(type);
}

function serializeSeries(series: any, type: any) {
  if (!series) return undefined;
  const nestedType = series.type || type;
  return {
    data: {
      id: series.id,
      attributes: {
        name: series.name,
        slug: series.slug,
        description: series.description ?? '',
        featured_image: strapiMedia(series.featured_image),
        product_code: series.product_code ?? null,
        is_featured: Boolean(series.is_featured),
        product_type: serializeType(nestedType),
      },
    },
  };
}

function fieldUrl(productId: number, field: ProductImageField, stored: string | null | undefined) {
  return publicImageUrl(productId, field, stored);
}

/** Card/list payload — omit vendor fields and extra image slots. */
export function serializeProductListItem(row: any) {
  const p = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
  const series = p.series;
  const type = p.type || series?.type;
  const id = Number(p.id);
  const mainA = fieldUrl(id, 'main_image_A', p.main_image_A);
  const featured = fieldUrl(id, 'featured_image', p.featured_image || p.main_image_A);

  return {
    id: p.id,
    attributes: {
      name: p.name,
      slug: p.slug,
      wattage: p.wattage,
      cct: p.cct ?? '',
      beam_angle: p.beam_angle ?? '',
      dimming: p.dimming ?? 'None',
      dimensions: p.dimensions ?? '',
      cutout_size: p.cutout_size ?? '',
      colour: p.colour ?? '',
      trim_color: p.trim_color ?? '',
      is_featured: Boolean(p.is_featured),
      series_id: p.series_id ?? series?.id ?? null,
      product_type_id: p.product_type_id ?? type?.id ?? series?.product_type_id ?? null,
      product_code: p.product_code ?? null,
      main_image_A: mainA,
      main_image_B: fieldUrl(id, 'main_image_B', p.main_image_B),
      size_image: fieldUrl(id, 'size_image', p.size_image),
      featured_image: strapiMedia(featured),
      series: serializeSeries(series, type),
      type: serializeType(type),
      product_type: serializeType(type),
      path: {
        type_slug: type?.slug || 'unknown-category',
        series_slug: series?.slug || 'unknown-series',
      },
    },
  };
}
/** Strapi-like product payload expected by the Next.js catalog pages */
export function serializeProduct(row: any) {
  const p = typeof row?.get === 'function' ? row.get({ plain: true }) : row;
  const series = p.series;
  const type = p.type || series?.type;
  const id = Number(p.id);
  const mainA = fieldUrl(id, 'main_image_A', p.main_image_A);
  const featured = fieldUrl(id, 'featured_image', p.featured_image || p.main_image_A);

  return {
    id: p.id,
    attributes: {
      name: p.name,
      description: p.description ?? '',
      slug: p.slug,
      wattage: p.wattage,
      lumen: p.lumen,
      cct: p.cct ?? '',
      beam_angle: p.beam_angle ?? '',
      dimming: p.dimming ?? 'None',
      is_featured: Boolean(p.is_featured),
      series_id: p.series_id ?? series?.id ?? null,
      product_type_id: p.product_type_id ?? type?.id ?? series?.product_type_id ?? null,
      product_code: p.product_code ?? null,
      vendor_code: p.vendor_code ?? null,
      vendor_model: p.vendor_model ?? null,
      external_id: p.external_id ?? null,
      dimensions: p.dimensions ?? '',
      cutout_size: p.cutout_size ?? '',
      mounting_type: p.mounting_type ?? '',
      trim_color: p.trim_color ?? '',
      reflector_finish: p.reflector_finish ?? '',
      orientation: p.orientation ?? '',
      lamp_source: p.lamp_source ?? '',
      system_lumen: p.system_lumen ?? null,
      cri: p.cri ?? '',
      ip_rating: p.ip_rating ?? '',
      lifetime: p.lifetime ?? '',
      driver_type: p.driver_type ?? '',
      power_factor: p.power_factor ?? '',
      input_voltage: p.input_voltage ?? '',
      warranty: p.warranty ?? '',
      colour: p.colour ?? '',
      material: p.material ?? '',
      efficacy: p.efficacy ?? '',
      optic: p.optic ?? '',
      operating_temperature: p.operating_temperature ?? '',
      specifications: {},
      main_image_A: mainA,
      main_image_B: fieldUrl(id, 'main_image_B', p.main_image_B),
      size_image: fieldUrl(id, 'size_image', p.size_image),
      size_image_ai: p.size_image_ai == null ? null : Boolean(p.size_image_ai),
      application_image: fieldUrl(id, 'application_image', p.application_image),
      photometric_image: fieldUrl(id, 'photometric_image', p.photometric_image),
      ldt_family: p.ldt_family ?? null,
      ldt_beam_degrees: p.ldt_beam_degrees ?? null,
      ldt_file: p.ldt_file ?? null,
      featured_image: strapiMedia(featured),
      series: serializeSeries(series, type),
      type: serializeType(type),
      product_type: serializeType(type),
      path: {
        type_slug: type?.slug || 'unknown-category',
        series_slug: series?.slug || 'unknown-series',
      },
      createdAt: p.created_at ?? '',
      updatedAt: p.updated_at ?? '',
      publishedAt: p.created_at ?? '',
    },
  };
}
