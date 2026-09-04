export const CATALOG_REVALIDATE_SECONDS = 120;

export const PUBLIC_LIST_CACHE = 'public, s-maxage=120, stale-while-revalidate=600';

export const PUBLIC_CACHE_CONTROL = PUBLIC_LIST_CACHE;

export const IMAGE_CACHE_CONTROL = 'public, max-age=3600, stale-while-revalidate=86400';
