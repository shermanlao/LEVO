'use client';

import { ReactNode, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ClientSideFilters from './ClientSideFilters';
import CatalogFunnelToggle from './CatalogFunnelToggle';
import PageRoute from '@/components/layout/PageRoute';
import type { RouteCrumb } from '@/components/layout/pageRouteItems';
import { CatalogFilterOptions, CATALOG_FILTER_KEYS, hasFilterChoices } from '@/lib/catalog-filters';

type CatalogFilterLayoutProps = {
  title: string;
  titleHidden?: boolean;
  breadcrumbItems: RouteCrumb[];
  options: CatalogFilterOptions;
  toggleHelpKey: string;
  clearHelpKey: string;
  children: ReactNode;
};

export default function CatalogFilterLayout({
  title,
  titleHidden = false,
  breadcrumbItems,
  options,
  toggleHelpKey,
  clearHelpKey,
  children,
}: CatalogFilterLayoutProps) {
  const urlParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showFilters = hasFilterChoices(options);
  const hasActiveFilters = CATALOG_FILTER_KEYS.some((key) => Boolean(urlParams.get(key)));

  return (
    <div>
      <PageRoute
        items={breadcrumbItems}
        end={
          showFilters ? (
            <CatalogFunnelToggle
              helpKey={toggleHelpKey}
              open={mobileOpen}
              onToggle={() => setMobileOpen((open) => !open)}
              hasActive={hasActiveFilters}
              controlsId="catalog-product-filters"
              label="Filter products"
            />
          ) : null
        }
      />
      {titleHidden ? <h1 className="sr-only">{title}</h1> : <h1 className="text-4xl font-bold mb-4">{title}</h1>}

      {showFilters ? (
        <div className="flex flex-col lg:flex-row gap-8">
          <div className={`lg:w-1/4 ${mobileOpen ? 'block' : 'max-lg:hidden'}`}>
            <ClientSideFilters options={options} clearHelpKey={clearHelpKey} />
          </div>
          <div className="lg:w-3/4">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
