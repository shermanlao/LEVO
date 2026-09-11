import type { MetadataRoute } from 'next';
import { getProductSeries, getProductTypes, getProjectsFromApi, getSiteContact } from '@/lib/sqlite-api';
import { catalogTypeIsBrowsable } from '@/lib/catalog-filters';
import { asStrapiList } from '@/lib/strapi-entity';
import { siteOrigin } from '@/lib/seo';

export const dynamic = 'force-dynamic';

type TypeRow = {
  attributes?: {
    slug?: string;
    series_count?: number;
    updatedAt?: string;
  };
};

type SeriesRow = {
  attributes?: {
    slug?: string;
    updatedAt?: string;
    product_type?: {
      data?: {
        attributes?: { slug?: string };
      };
    };
  };
};

function entry(path: string, lastModified?: string | Date | null): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteOrigin()}${path === '/' ? '' : path}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    const contact = await getSiteContact();
    if (contact.public_under_construction !== false) {
      return [entry('/')];
    }
  } catch {
    return [entry('/')];
  }

  const staticPaths = [
    '/',
    '/products',
    '/projects',
    '/contact',
    '/about',
    '/warranty',
    '/certifications',
    '/technical',
  ];
  const urls: MetadataRoute.Sitemap = staticPaths.map((path) => entry(path));

  try {
    const typesResponse = await getProductTypes();
    const types = (asStrapiList(typesResponse?.data) as TypeRow[]).filter(catalogTypeIsBrowsable);
    for (const type of types) {
      const slug = String(type.attributes?.slug || '').trim();
      if (!slug) continue;
      urls.push(entry(`/products/${slug}`, type.attributes?.updatedAt));
    }
  } catch (error) {
    console.error('sitemap - product types failed:', error);
  }

  try {
    const seriesResponse = await getProductSeries();
    const seriesList = asStrapiList(seriesResponse?.data) as SeriesRow[];
    for (const series of seriesList) {
      const seriesSlug = String(series.attributes?.slug || '').trim();
      const typeSlug = String(series.attributes?.product_type?.data?.attributes?.slug || '').trim();
      if (!seriesSlug || !typeSlug) continue;
      urls.push(entry(`/products/${typeSlug}/${seriesSlug}`, series.attributes?.updatedAt));
    }
  } catch (error) {
    console.error('sitemap - product series failed:', error);
  }

  try {
    const projects = await getProjectsFromApi();
    for (const project of projects) {
      const slug = String(project.slug || '').trim();
      if (!slug) continue;
      urls.push(entry(`/projects/${slug}`, project.updated_at || project.updatedAt));
    }
  } catch (error) {
    console.error('sitemap - projects failed:', error);
  }

  return urls;
}
