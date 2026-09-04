import CatalogFilterLayout from './CatalogFilterLayout';
import SeriesGrid, { type SeriesGridRow } from './SeriesGrid';
import EmptyState from '@/components/ui/EmptyState';
import type { RouteCrumb } from '@/components/layout/pageRouteItems';
import {
  CatalogFilterOptions,
  CatalogSearchParams,
  hasActiveCatalogFilters,
  seriesMatchesFilters,
} from '@/lib/catalog-filters';

export type CategorySeriesRow = SeriesGridRow;

type CategoryCatalogSectionProps = {
  typeName: string;
  typeSlug: string;
  breadcrumbItems: RouteCrumb[];
  seriesList: CategorySeriesRow[];
  options: CatalogFilterOptions;
  searchParams?: CatalogSearchParams;
};

export default function CategoryCatalogSection({
  typeName,
  typeSlug,
  breadcrumbItems,
  seriesList,
  options,
  searchParams = {},
}: CategoryCatalogSectionProps) {
  const filtersActive = hasActiveCatalogFilters(searchParams);
  const visible = filtersActive
    ? seriesList.filter((series) => seriesMatchesFilters(series.attributes?.options, searchParams))
    : seriesList;

  return (
    <CatalogFilterLayout
      title={typeName}
      titleHidden
      breadcrumbItems={breadcrumbItems}
      options={options}
      toggleHelpKey="catalog.category.filter_toggle"
      clearHelpKey="catalog.category.filter_clear"
    >
      {visible.length > 0 ? (
        <SeriesGrid
          seriesList={visible}
          typeSlug={typeSlug}
          emptyText="No series match your filters."
        />
      ) : (
        <EmptyState>
          <p>{filtersActive ? 'No series match your filters.' : 'No series available in this category yet.'}</p>
        </EmptyState>
      )}
    </CatalogFilterLayout>
  );
}
