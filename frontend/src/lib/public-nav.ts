import { categoryCardHref, catalogTypeIsBrowsable } from '@/lib/catalog-filters';
import { projectFilterCategories } from '@/lib/project-categories';
import { getProductTypes, getProjectsFromApi } from '@/lib/sqlite-api';
import { asStrapiList } from '@/lib/strapi-entity';

export type PublicNavLink = {
  href: string;
  label: string;
};

export type PublicNavMenus = {
  productCategories: PublicNavLink[];
  projectCategories: PublicNavLink[];
};

const EMPTY_MENUS: PublicNavMenus = {
  productCategories: [],
  projectCategories: [],
};

async function loadProductCategories(): Promise<PublicNavLink[]> {
  const response = await getProductTypes();
  return asStrapiList<{
    name?: string;
    slug?: string;
    series_count?: number;
    sole_series_slug?: string | null;
  }>(response?.data)
    .filter((row) => row.attributes?.slug && row.attributes?.name && catalogTypeIsBrowsable(row))
    .map((row) => ({
      href: categoryCardHref(row),
      label: String(row.attributes.name),
    }));
}

async function loadProjectCategories(): Promise<PublicNavLink[]> {
  const rows = await getProjectsFromApi();
  return projectFilterCategories(
    rows.map((row) => ({
      attributes: { category: String(row.category || '') },
    }))
  ).map((category) => ({
    href: `/projects?category=${encodeURIComponent(category)}`,
    label: category,
  }));
}

/** Public header menus. Categories come from the catalog API; empty lists hide the pull-down. */
export async function loadPublicNavMenus(): Promise<PublicNavMenus> {
  try {
    const [productCategories, projectCategories] = await Promise.all([
      loadProductCategories().catch((error) => {
        console.error('Could not load product categories for the header:', error);
        return [] as PublicNavLink[];
      }),
      loadProjectCategories().catch((error) => {
        console.error('Could not load project categories for the header:', error);
        return [] as PublicNavLink[];
      }),
    ]);
    return { productCategories, projectCategories };
  } catch (error) {
    console.error('Could not load header menus:', error);
    return EMPTY_MENUS;
  }
}
