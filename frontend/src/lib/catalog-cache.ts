export {
  CATALOG_REVALIDATE_SECONDS,
  IMAGE_CACHE_CONTROL,
  PUBLIC_CACHE_CONTROL,
  PUBLIC_LIST_CACHE,
} from '@shared/cache-constants';

export const CACHE_TAGS = {
  catalog: 'catalog',
  projects: 'projects',
  contact: 'contact',
} as const;

export type CacheTag = (typeof CACHE_TAGS)[keyof typeof CACHE_TAGS];

export function tagsForEndpoint(endpoint: string): CacheTag[] {
  const path = endpoint.toLowerCase();
  if (path.includes('contact') || path.includes('site-settings')) return [CACHE_TAGS.contact];
  if (path.includes('project')) return [CACHE_TAGS.projects];
  return [CACHE_TAGS.catalog];
}

export function tagsForExpressPath(expressPath: string): CacheTag[] {
  return tagsForEndpoint(expressPath);
}
