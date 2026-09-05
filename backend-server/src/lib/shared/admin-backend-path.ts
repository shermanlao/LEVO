export const ADMIN_BACKEND_PREFIXES = [
  'products',
  'product-types',
  'product-series',
  'projects',
  'upload',
  'variant-options',
] as const;

export const UNAUTHORIZED_STATUS = 401;
export const METHOD_NOT_ALLOWED_STATUS = 405;

export function isAllowedAdminBackendPath(suffix: string): boolean {
  const first = suffix.split('/').filter(Boolean)[0] || '';
  return (ADMIN_BACKEND_PREFIXES as readonly string[]).includes(first);
}

export function isPublicCatalogReadMethod(method: string): boolean {
  return method === 'GET' || method === 'HEAD';
}
