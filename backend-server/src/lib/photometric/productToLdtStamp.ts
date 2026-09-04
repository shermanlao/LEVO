import type { LdtProductInput } from './generateProductLdt';
import type { LdtStampProduct } from './stampLdtFromProduct';
import { DEFAULT_COMPANY_SHORT_NAME, loadSiteBrand } from '../siteSettings';

function text(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/** Map a product row to LDT stamp fields. */
export function productToLdtStamp(
  product: Record<string, unknown>,
  brand = DEFAULT_COMPANY_SHORT_NAME
): LdtProductInput {
  const stamp: LdtStampProduct = {
    brand,
    model: text(product.vendor_model) || text(product.name),
    article: text(product.product_code) || text(product.vendor_code) || text(product.slug),
    description: text(product.description),
    lamp: text(product.lamp_source),
    wattage: product.wattage as string | number | null,
    lumen: product.lumen as string | number | null,
    color_temperature: text(product.cct),
    cri: text(product.cri),
    size: text(product.dimensions),
    mounting: text(product.mounting_type),
  };
  return { ...stamp, beam_angle: text(product.beam_angle) };
}

export async function productToLdtStampWithSite(
  product: Record<string, unknown>
): Promise<LdtProductInput> {
  const brand = await loadSiteBrand();
  return productToLdtStamp(product, brand.company_short_name);
}
