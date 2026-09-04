/**
 * API URL helpers for admin tools and image resolution.
 * Admin mutations go through the session-gated BFF at /api/admin/backend.
 */

export const ADMIN_BACKEND_BASE = '/api/admin/backend';

/** Express API base (no trailing slash). Server-side only; browsers use same-origin /api. */
export const PUBLIC_API_BASE_URL =
  process.env.NEXT_PUBLIC_STRAPI_API_URL || 'http://127.0.0.1:3333';

export const API_CONFIG = {
  apiUrl: ADMIN_BACKEND_BASE,
  cmsUrl: '',

  getApiUrls: () => ({
    apiUrl: ADMIN_BACKEND_BASE,
    cmsUrl: '',
  }),
};

export function getExpressBaseUrl(): string {
  const raw =
    (typeof process !== 'undefined' && process.env.API_URL) ||
    (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_STRAPI_API_URL) ||
    PUBLIC_API_BASE_URL ||
    'http://127.0.0.1:3333';
  return String(raw).trim().replace(/\/$/, '');
}

export function expressBaseCandidates(primary = getExpressBaseUrl()): string[] {
  const alt = primary.includes('://127.0.0.1')
    ? primary.replace('://127.0.0.1', '://localhost')
    : primary.includes('://localhost')
      ? primary.replace('://localhost', '://127.0.0.1')
      : null;
  return alt && alt !== primary ? [primary, alt] : [primary];
}

export function getBackendBaseUrl(): string {
  return getExpressBaseUrl();
}
