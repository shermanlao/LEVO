import { getProductTypes } from '@/lib/sqlite-api';
import { asStrapiList } from '@/lib/strapi-entity';
import { catalogTypeIsBrowsable } from '@/lib/catalog-filters';
import type { NotFoundLink } from '@/components/layout/NotFoundView';

export async function getNotFoundCategoryLinks(): Promise<NotFoundLink[]> {
  try {
    const response = await getProductTypes();
    return asStrapiList<{ name?: string; slug?: string; series_count?: number }>(response?.data)
      .filter((row) => row.attributes?.slug && row.attributes?.name && catalogTypeIsBrowsable(row))
      .map((row) => ({
        href: `/products/${row.attributes.slug}`,
        label: String(row.attributes.name),
        helpKey: 'catalog.404.category',
        variant: 'secondary' as const,
      }));
  } catch (error) {
    console.error('Could not load product categories for 404 page:', error);
    return [];
  }
}
