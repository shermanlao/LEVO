import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductSeriesBySlug, getProductsBySeriesSlug, getSiteContact } from '@/lib/sqlite-api';
import {
  resolveSeriesImageUrl,
  seriesFeaturedCatalogUrl,
  seriesFeaturedDatasheetUrl,
  seriesFeaturedPageUrl,
} from '@/lib/image-utils';
import SeriesProductsSection from '@/components/products/SeriesProductsSection';
import { productRouteItems } from '@/components/layout/pageRouteItems';
import { parseDatasheetLabels } from '@shared/datasheet-labels';
import { devLog } from '@/lib/dev-log';
import JsonLd from '@/components/layout/JsonLd';
import { buildPageMetadata, stripHtml } from '@/lib/seo';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo-jsonld';

export const revalidate = 120;

interface Props {
  params: Promise<{
    type: string;
    series: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const path = `/products/${resolvedParams.type}/${resolvedParams.series}`;

  try {
    devLog(`Generating metadata for series: ${resolvedParams.series}`);
    const { data: series } = await getProductSeriesBySlug(resolvedParams.series);
    if (!series?.attributes) {
      return buildPageMetadata({
        title: 'Series Not Found',
        description: 'The requested product series could not be found.',
        path,
        noIndex: true,
      });
    }
    const name = String(series.attributes.name || resolvedParams.series);
    const typeName = String(series.attributes.product_type?.data?.attributes?.name || '').trim();
    const seoTitle = String(series.attributes.seo_title || '').trim();
    const seoDescription = String(series.attributes.seo_description || '').trim();
    const title = seoTitle || (typeName ? `${name} | ${typeName}` : name);
    return buildPageMetadata({
      title,
      description:
        seoDescription ||
        stripHtml(series.attributes.description) ||
        `${name} architectural LED lighting from LEVO.`,
      path,
      image: seriesFeaturedCatalogUrl(series.attributes) || null,
    });
  } catch (error) {
    console.error('Error generating metadata for series:', resolvedParams.series, error);

    const seriesName = resolvedParams.series
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return buildPageMetadata({
      title: seriesName,
      description: 'Product details temporarily unavailable. Please try again later.',
      path,
    });
  }
}

export default async function ProductSeriesPage({ params }: Props) {
  const resolvedParams = await params;

  let series = null;
  let company = 'LEVO Lighting';

  devLog(`ProductSeriesPage for ${resolvedParams.series} - Starting data fetch`);

  try {
    const [response, contact] = await Promise.all([
      getProductSeriesBySlug(resolvedParams.series),
      getSiteContact().catch(() => null),
    ]);
    if (response && response.data) {
      series = response.data;
    }
    if (contact?.company_name?.trim()) company = contact.company_name.trim();
  } catch (fetchError) {
    console.error('Error loading series data:', fetchError);
  }

  if (!series || !series.attributes) {
    notFound();
  }

  const { attributes } = series;
  const nestedProducts = Array.isArray(attributes.products?.data) ? attributes.products.data : [];
  let products = nestedProducts;

  if (products.length === 0) {
    devLog(`ProductSeriesPage - Nested products missing for ${resolvedParams.series}, fetching by series slug`);
    products = await getProductsBySeriesSlug(resolvedParams.series);
  }

  const seriesDescription =
    typeof attributes.description === 'string'
      ? attributes.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '';
  const typeSlug = attributes.product_type?.data?.attributes?.slug || resolvedParams.type;
  const typeName = attributes.product_type?.data?.attributes?.name || 'Category';
  const seriesPath = `/products/${typeSlug}/${resolvedParams.series}`;
  const image = seriesFeaturedCatalogUrl(attributes) || seriesFeaturedPageUrl(attributes);

  return (
    <div className="container mx-auto px-4 py-4">
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Products', path: '/products' },
            { name: typeName, path: `/products/${typeSlug}` },
            { name: attributes.name, path: seriesPath },
          ]),
          productJsonLd({
            name: attributes.name,
            description: seriesDescription || attributes.seo_description,
            image,
            path: seriesPath,
            brandName: company,
          }),
        ].filter((item): item is NonNullable<typeof item> => Boolean(item))}
      />
      <SeriesProductsSection
        seriesName={attributes.name}
        seriesDescription={seriesDescription}
        seriesPhrase={typeof attributes.description_phrase === 'string' ? attributes.description_phrase : ''}
        seriesFeaturedImage={seriesFeaturedPageUrl(attributes) || attributes.featured_image}
        seriesImageUrl={resolveSeriesImageUrl(seriesFeaturedPageUrl(attributes) || attributes.featured_image, products)}
        seriesThumbUrl={seriesFeaturedDatasheetUrl(attributes)}
        specifications={attributes.specifications}
        products={products}
        currentSeriesSlug={resolvedParams.series}
        seriesProductCode={attributes.product_code}
        options={Array.isArray(attributes.options) ? attributes.options : []}
        appearancePhotos={Array.isArray(attributes.appearance_photos) ? attributes.appearance_photos : []}
        typeLabels={parseDatasheetLabels(attributes.product_type?.data?.attributes?.datasheet_labels)}
        seriesLabels={parseDatasheetLabels(attributes.datasheet_labels)}
        breadcrumbItems={productRouteItems({
          type: {
            slug: typeSlug,
            name: typeName,
          },
          series: { slug: resolvedParams.series, name: attributes.name },
        })}
      />
    </div>
  );
}
