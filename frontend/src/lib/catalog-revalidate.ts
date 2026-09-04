import 'server-only';
import { revalidateTag } from 'next/cache';
import { CACHE_TAGS, type CacheTag } from '@/lib/catalog-cache';

export function revalidateCatalog(scope: CacheTag | 'all' = 'all'): void {
  if (scope === 'all' || scope === CACHE_TAGS.catalog) {
    revalidateTag(CACHE_TAGS.catalog);
  }
  if (scope === 'all' || scope === CACHE_TAGS.projects) {
    revalidateTag(CACHE_TAGS.projects);
  }
  if (scope === 'all' || scope === CACHE_TAGS.contact) {
    revalidateTag(CACHE_TAGS.contact);
  }
}

export function revalidateAfterAdminWrite(apiSuffix: string): void {
  const first = apiSuffix.split('/').filter(Boolean)[0] || '';
  if (first === 'projects') {
    revalidateCatalog(CACHE_TAGS.projects);
    return;
  }
  revalidateCatalog(CACHE_TAGS.catalog);
}
