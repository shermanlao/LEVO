import SeriesCard from '@/components/ui/SeriesCard';
import EmptyState from '@/components/ui/EmptyState';
import { toPublicImagePath } from '@/lib/image-utils';
import { seriesOptionCount } from '@/lib/catalog-filters';
import type { SeriesOptionDto } from '@shared/series-options';

export type SeriesGridRow = {
  id: number;
  attributes: {
    name?: string;
    slug?: string;
    description?: string;
    featured_image?: unknown;
    options?: SeriesOptionDto[];
    option_count?: number;
    product_type?: { data?: { attributes?: { slug?: string } } };
  };
};

function seriesDescription(value: unknown): string {
  return typeof value === 'string' ? value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '';
}

export default function SeriesGrid({
  seriesList,
  typeSlug,
  emptyText = 'No series found.',
}: {
  seriesList: SeriesGridRow[];
  typeSlug?: string;
  emptyText?: string;
}) {
  if (!seriesList.length) {
    return (
      <EmptyState>
        <p>{emptyText}</p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {seriesList.map((series) => {
          const attrs = series.attributes;
          if (!attrs?.slug) return null;
          const categorySlug = typeSlug || attrs.product_type?.data?.attributes?.slug || 'products';
          const imageUrl = toPublicImagePath(attrs.featured_image) || '/images/placeholder.jpg';
          return (
            <SeriesCard
              key={series.id}
              id={series.id}
              name={attrs.name || 'Untitled series'}
              slug={attrs.slug}
              categorySlug={categorySlug}
              description={seriesDescription(attrs.description)}
              imageUrl={imageUrl}
              productCount={seriesOptionCount(attrs.options, attrs.option_count || 0)}
            />
          );
        })}
      </div>
    </>
  );
}
