import { getProductTypes } from '@/lib/sqlite-api';
import { asStrapiList } from '@/lib/strapi-entity';
import type { NotFoundLink } from '@/components/layout/NotFoundView';

export async function getNotFoundCategoryLinks(): Promise<NotFoundLink[]> {
  try {
    const response = await getProductTypes();
    return asStrapiList<{ name?: string; slug?: string }>(response?.data)
      .filter((row) => row.attributes?.slug && row.attributes?.name)
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
