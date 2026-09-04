import { Product } from '@/types/product';
import { Suspense } from 'react';
import SeriesConfigurator from './SeriesConfigurator';
import SeriesFamilyTitle from './SeriesFamilyTitle';
import EmptyState from '@/components/ui/EmptyState';
import ImageCarousel from './ImageCarousel';
import { uniqueSeriesPhotoUrls } from '@/lib/image-utils';
import PageRoute from '@/components/layout/PageRoute';
import type { RouteCrumb } from '@/components/layout/pageRouteItems';
import type { SeriesOptionDto } from '@shared/series-options';
import type { DatasheetLabel } from '@shared/datasheet-labels';

type SeriesProductsSectionProps = {
  seriesName: string;
  seriesDescription?: string;
  seriesPhrase?: string;
  seriesFeaturedImage?: unknown;
  seriesImageUrl?: string;
  seriesThumbUrl?: string;
  specifications?: Record<string, unknown>;
  products: Product[];
  currentSeriesSlug: string;
  seriesProductCode?: string | null;
  options?: SeriesOptionDto[];
  appearancePhotos?: import('@shared/appearance-photos').AppearancePhotoDto[];
  typeLabels?: DatasheetLabel[];
  seriesLabels?: DatasheetLabel[];
  breadcrumbItems?: RouteCrumb[];
};

export default function SeriesProductsSection({
  seriesName,
  seriesDescription,
  seriesPhrase,
  seriesFeaturedImage,
  seriesImageUrl = '',
  seriesThumbUrl = '',
  specifications,
  products,
  currentSeriesSlug,
  seriesProductCode,
  options = [],
  appearancePhotos = [],
  typeLabels = [],
  seriesLabels = [],
  breadcrumbItems = [],
}: SeriesProductsSectionProps) {
  const hasProducts = Array.isArray(products) && products.length > 0;
  const specEntries =
    specifications && typeof specifications === 'object'
      ? Object.entries(specifications)
      : [];
  const photos = uniqueSeriesPhotoUrls(seriesFeaturedImage, products);
  const galleryProduct =
    photos.length > 0
      ? {
          attributes: {
            name: seriesName,
            images: {
              data: photos.map((photo, index) => ({
                id: index,
                attributes: { url: photo.url },
              })),
            },
          },
        }
      : null;

  const gallery = galleryProduct ? <ImageCarousel product={galleryProduct} /> : null;

  const specBlock =
    specEntries.length > 0 ? (
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4">Series Specifications</h2>
        <div className="bg-white rounded-lg shadow-md p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {specEntries.map(([key, value]) => (
              <div key={key}>
                <dt className="text-sm text-gray-600 mb-1">{key}</dt>
                <dd className="text-lg">{String(value ?? '')}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    ) : null;

  if (!hasProducts && options.length === 0) {
    return (
      <div>
        {breadcrumbItems.length > 0 ? <PageRoute items={breadcrumbItems} /> : null}
        <div className="flex flex-col md:flex-row gap-8 mb-10 items-start">
          {gallery ? <div className="w-full md:w-1/2 min-w-0">{gallery}</div> : null}
          <div className={gallery ? 'w-full md:w-1/2 min-w-0' : undefined}>
            <SeriesFamilyTitle seriesName={seriesName} seriesSlug={currentSeriesSlug} />
            {seriesDescription ? (
              <div className="prose max-w-none">
                <p>{seriesDescription}</p>
              </div>
            ) : null}
          </div>
        </div>
        {specBlock}
        <EmptyState>
          <p>No options available in this series yet.</p>
        </EmptyState>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div>
          {breadcrumbItems.length > 0 ? <PageRoute items={breadcrumbItems} /> : null}
          <div className="flex flex-col md:flex-row gap-8 mb-10 items-start">
            {gallery ? <div className="w-full md:w-1/2 min-w-0">{gallery}</div> : null}
            <div className={gallery ? 'w-full md:w-1/2 min-w-0' : 'w-full'}>
              <SeriesFamilyTitle seriesName={seriesName} seriesSlug={currentSeriesSlug} />
              {seriesDescription ? (
                <div className="prose max-w-none">
                  <p>{seriesDescription}</p>
                </div>
              ) : null}
              <p className="text-sm text-gray-500 mt-4">Loading options…</p>
            </div>
          </div>
          {specBlock}
        </div>
      }
    >
      <SeriesConfigurator
        seriesName={seriesName}
        seriesDescription={seriesDescription}
        seriesPhrase={seriesPhrase}
        seriesProductCode={seriesProductCode}
        gallery={gallery}
        breadcrumbItems={breadcrumbItems}
        seriesSlug={currentSeriesSlug}
        options={options}
        typeLabels={typeLabels}
        seriesLabels={seriesLabels}
        products={products}
        appearancePhotos={appearancePhotos}
        currentSeriesSlug={currentSeriesSlug}
        seriesImageUrl={seriesImageUrl}
        seriesThumbUrl={seriesThumbUrl}
      >
        {specBlock}
      </SeriesConfigurator>
    </Suspense>
  );
}
