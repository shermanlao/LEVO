export const PRODUCT_IMAGE_FIELDS = [
  'main_image_A',
  'main_image_B',
  'featured_image',
  'size_image',
  'application_image',
  'photometric_image',
] as const;

export type ProductImageField = (typeof PRODUCT_IMAGE_FIELDS)[number];

export function isProductImageField(value: string): value is ProductImageField {
  return (PRODUCT_IMAGE_FIELDS as readonly string[]).includes(value);
}

export function isRemoteHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Catalog display path that must never be written back to products.* image columns. */
export function isMaskedProductMediaUrl(url: string): boolean {
  return url.startsWith('/api/product-media/');
}

/**
 * Coerce a PUT/POST image value (plain string or Strapi `{ data: { attributes: { url } } }`)
 * into the STRING stored in SQLite. Returns null for empty / `{ data: null }`.
 */
export function extractStoredImageUrl(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string') return value.trim() ? value : null;
  if (Array.isArray(value)) return extractStoredImageUrl(value[0]);
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (typeof rec.url === 'string') return rec.url.trim() ? rec.url : null;
    if ('data' in rec) return extractStoredImageUrl(rec.data);
    if ('attributes' in rec) return extractStoredImageUrl(rec.attributes);
  }
  return null;
}

/** Same-origin path visitors see; LEVO server fetches the stored remote URL. */
export function maskedProductImagePath(productId: number, field: ProductImageField): string {
  return `/api/product-media/${productId}/${field}`;
}

export function publicImageUrl(
  productId: number,
  field: ProductImageField,
  stored: string | null | undefined
): string | null {
  if (!stored) return null;
  if (isRemoteHttpUrl(stored)) {
    return maskedProductImagePath(productId, field);
  }
  return stored;
}

/** Local public paths or bare filenames that live under frontend/public. */
export function localProductImageCandidates(
  stored: string,
  seriesSlug?: string | null
): string[] {
  const value = stored.trim();
  if (!value || isRemoteHttpUrl(value) || value.startsWith('/api/')) return [];
  if (value.startsWith('/uploads/photometric-library/') || value.startsWith('/uploads/product-ldt/')) {
    return [value];
  }
  if (value.startsWith('/uploads/')) {
    const file = value.slice('/uploads/'.length);
    return [`/images/products/${file}`, `/images/ai/${file}`];
  }
  if (value.startsWith('/images/')) return [value];
  const fileName = value.replace(/^.*[\\/]/, '');
  const folder = (seriesSlug || '').trim() || 'general';
  const folders = [...new Set([folder, 'general', 'eco-pro', 'slim-line'])];
  return folders.map((f) => `/images/products/${f}/${fileName}`);
}
