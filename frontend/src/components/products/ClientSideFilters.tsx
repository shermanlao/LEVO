'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import ProductFilter from './ProductFilter';
import Button from '@/components/ui/Button';

import { CatalogFilterOptions } from '@/lib/catalog-filters';

interface ClientSideFiltersProps {
  options: CatalogFilterOptions;
  clearHelpKey?: string;
}

export default function ClientSideFilters({
  options,
  clearHelpKey = 'catalog.category.filter_clear',
}: ClientSideFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState({
    wattage: searchParams.get('wattage') || '',
    size: searchParams.get('size') || '',
    cct: searchParams.get('cct') || '',
    beam_angle: searchParams.get('beam_angle') || '',
    dimming: searchParams.get('dimming') || '',
  });

  const hasActiveFilters = Object.values(filters).some((value) => value !== '');

  const handleFilterChange = (newFilters: Record<string, string | number | null>) => {
    const params = new URLSearchParams();

    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, String(value));
      }
    });

    const newUrl = `${pathname}?${params.toString()}`;
    router.push(newUrl);

    setFilters(newFilters as any);
  };

  const clearFilters = () => {
    const resetFilters = {
      wattage: '',
      size: '',
      cct: '',
      beam_angle: '',
      dimming: '',
    };

    router.push(pathname);

    setFilters(resetFilters);
  };

  return (
    <div
      id="catalog-product-filters"
      className="bg-white p-4 lg:p-6 rounded-lg shadow-sm border border-gray-100 lg:sticky lg:top-8"
    >
      <h3 className="hidden lg:block text-xl font-semibold mb-4">Filter Products</h3>
      <ProductFilter
        options={options}
        onFilterChange={handleFilterChange}
        initialValues={filters}
      />

      {hasActiveFilters && (
        <div className="mt-6">
          <Button
            helpKey={clearHelpKey}
            variant="secondary"
            onClick={clearFilters}
            className="w-full"
          >
            Clear All Filters
          </Button>
        </div>
      )}
    </div>
  );
}
