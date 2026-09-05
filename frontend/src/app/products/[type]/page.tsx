import { Metadata } from 'next';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { getProductType, getProductSeries } from '@/lib/sqlite-api';
import { ProductType } from '@/types/product';
import { asStrapiList } from '@/lib/strapi-entity';
import { productRouteItems } from '@/components/layout/pageRouteItems';
import { collectFilterOptionsFromSeries } from '@/lib/catalog-filters';
import { devLog } from '@/lib/dev-log';
import AlertBanner from '@/components/ui/AlertBanner';
import PageRoute from '@/components/layout/PageRoute';
import CategoryCatalogSection from '@/components/products/CategoryCatalogSection';

export const revalidate = 120;

interface Props {
  params: Promise<{ type: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type SeriesRow = {
  id: number;
  attributes: {
    name?: string;
    slug?: string;
    description?: string;
    product_type_id?: number | null;
    featured_image?: unknown;
    options?: import('@shared/series-options').SeriesOptionDto[];
    option_count?: number;
    product_type?: {
      data?: {
        id?: number;
        attributes?: { slug?: string; name?: string };
      };
    };
  };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const { type } = resolvedParams;

  try {
    const { data: productType } = await getProductType(type);
    if (!productType) {
      return {
        title: 'Category Not Found - LEVO Lighting',
        description: 'The requested product category could not be found.',
      };
    }
    return {
      title: `${productType.attributes?.name || 'Products'} - LEVO Lighting`,
      description: productType.attributes?.description || '',
    };
  } catch (error) {
    console.error('Error generating metadata for category:', type, error);
    const formattedTitle = type
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    return {
      title: `${formattedTitle} - LEVO Lighting`,
      description: `Product information for ${formattedTitle} is temporarily unavailable.`,
    };
  }
}

export default async function ProductCategoryPage({ params, searchParams }: Props) {
  const resolvedParams = await params;
  const resolvedSearch = await searchParams;
  const { type } = resolvedParams;

  let productType: ProductType | undefined;
  let seriesList: SeriesRow[] = [];
  let apiConnectionError = false;

  try {
    const productTypeResponse = await getProductType(type);
    productType = productTypeResponse.data;

    if (!productType) {
      notFound();
    }

    try {
      const seriesResponse = await getProductSeries({ type });
      seriesList = asStrapiList(seriesResponse?.data) as SeriesRow[];
    } catch (loadError) {
      console.error('ProductCategoryPage - Error loading series:', loadError);
      apiConnectionError = true;
      seriesList = [];
    }
  } catch (error) {
    console.error('Error loading category data (getProductType failed):', error);
    notFound();
  }

  if (!productType || !productType.attributes) {
    notFound();
  }

  const { attributes } = productType;
  const filterOptions = collectFilterOptionsFromSeries(seriesList);
  const breadcrumbItems = productRouteItems({
    type: { slug: attributes.slug || type, name: attributes.name },
  });
  devLog('ProductCategoryPage - Series count:', seriesList.length);

  return (
    <div className="container mx-auto px-4 py-4">
      {apiConnectionError && (
        <AlertBanner>
          Error: Could not load series data for this category. The API might be temporarily unavailable.
        </AlertBanner>
      )}

      <Suspense
        fallback={
          <>
            <PageRoute items={breadcrumbItems} />
            <p className="text-sm text-gray-500">Loading catalog…</p>
          </>
        }
      >
        <CategoryCatalogSection
          typeName={attributes.name}
          typeSlug={attributes.slug || type}
          breadcrumbItems={breadcrumbItems}
          seriesList={seriesList}
          options={filterOptions}
          searchParams={resolvedSearch}
        />
      </Suspense>
    </div>
  );
}
