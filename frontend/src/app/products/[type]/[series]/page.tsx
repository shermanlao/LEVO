import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProductSeriesBySlug, getProductsBySeriesSlug } from '@/lib/sqlite-api';
import { resolveSeriesImageUrl, seriesFeaturedDatasheetUrl, seriesFeaturedPageUrl } from '@/lib/image-utils';
import SeriesProductsSection from '@/components/products/SeriesProductsSection';
import { productRouteItems } from '@/components/layout/pageRouteItems';
import { parseDatasheetLabels } from '@shared/datasheet-labels';
import { devLog } from '@/lib/dev-log';

export const revalidate = 120;

interface Props {
  params: Promise<{
    type: string;
    series: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  
  try {
    devLog(`Generating metadata for series: ${resolvedParams.series}`);
    const { data: series } = await getProductSeriesBySlug(resolvedParams.series);
    return {
      title: `${series.attributes.name} - LEVO Lighting`,
      description: series.attributes.description || '',
    };
  } catch (error) {
    console.error('Error generating metadata for series:', resolvedParams.series, error);
    
    const seriesName = resolvedParams.series
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    
    return {
      title: `${seriesName} - LEVO Lighting`,
      description: 'Product details temporarily unavailable. Please try again later.',
    };
  }
}

export default async function ProductSeriesPage({ params }: Props) {
  const resolvedParams = await params;
  
  let series = null;

  devLog(`ProductSeriesPage for ${resolvedParams.series} - Starting data fetch`);

  try {
    const response = await getProductSeriesBySlug(resolvedParams.series);
    if (response && response.data) {
      series = response.data;
    }
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

  return (
    <div className="container mx-auto px-4 py-4">
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
            slug: attributes.product_type?.data?.attributes?.slug || resolvedParams.type,
            name: attributes.product_type?.data?.attributes?.name || 'Category',
          },
          series: { slug: resolvedParams.series, name: attributes.name },
        })}
      />
    </div>
  );
}
