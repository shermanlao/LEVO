export const STAFF_CATALOG_HEADER = 'x-levo-staff';
export const STAFF_CATALOG_HEADER_VALUE = '1';

/** Null / missing counts as on so existing series stay public. */
export function seriesShownOnSite(value: unknown): boolean {
  if (value === false || value === 0 || value === '0' || value === 'false') return false;
  return true;
}
