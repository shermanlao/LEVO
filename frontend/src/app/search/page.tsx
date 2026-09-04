'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { asStrapiList } from '@/lib/strapi-entity';
import SeriesGrid, { type SeriesGridRow } from '@/components/products/SeriesGrid';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import EmptyState from '@/components/ui/EmptyState';

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="text-gray-600">Loading search…</div>}>
      <SearchPageInner />
    </Suspense>
  );
}

function SearchPageInner() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SeriesGridRow[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchTerm(query);
      performSearch(query);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm)}`);
      performSearch(searchTerm);
    }
  };

  const performSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(`/api/product-series?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setResults(asStrapiList(data?.data) as SeriesGridRow[]);
    } catch (error) {
      console.error('Error searching series:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Search Products</h1>
      <form onSubmit={handleSubmit} className="mb-8 flex">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search for series..."
          className="input-field rounded-r-none"
          aria-label="Search series"
        />
        <Button helpKey="catalog.search.submit" type="submit" className="rounded-l-none">
          Search
        </Button>
      </form>
      {isSearching ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : results.length > 0 ? (
        <SeriesGrid seriesList={results} emptyText={`No series found matching "${searchParams.get('q')}"`} />
      ) : searchParams.has('q') ? (
        <EmptyState>
          <p className="text-lg">No series found matching "{searchParams.get('q')}"</p>
          <p className="mt-2">Try using different keywords or browse our product categories.</p>
        </EmptyState>
      ) : null}
    </div>
  );
}
