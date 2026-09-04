'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import HelpButton from '@/components/admin/HelpButton';
import Pagination from '@/components/ui/Pagination';
import { API_CONFIG } from '@/lib/api-config';

type PartnerProduct = {
  id: string;
  brand?: string;
  model?: string;
  article?: string;
  wattage?: string | number;
  category?: { name?: string } | null;
  photos?: { main?: string | null } | null;
  lifecycleStatus?: string;
};

type SearchResponse = {
  products?: PartnerProduct[];
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  error?: string;
};

type ImportSummary = {
  created: number;
  updated: number;
  skipped: number;
};

type CatalogType = { id: number; name: string };
type CatalogSeries = { id: number; name: string; productTypeId: number | null };

function PartnerThumb({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className="text-xs text-gray-400">No image</span>;
  }
  return (
    <img
      src={src}
      alt=""
      className="h-12 w-12 object-contain bg-gray-100"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

function normalizeType(row: any): CatalogType | null {
  const id = Number(row?.id);
  const name = row?.attributes?.name || row?.name;
  if (!id || !name) return null;
  return { id, name: String(name) };
}

function normalizeSeries(row: any): CatalogSeries | null {
  const id = Number(row?.id);
  if (!id) return null;
  const name = row?.attributes?.name || row?.name;
  const productTypeId =
    row?.attributes?.product_type_id ??
    row?.attributes?.product_type?.data?.id ??
    row?.product_type_id ??
    null;
  return {
    id,
    name: String(name || 'Series'),
    productTypeId: productTypeId != null ? Number(productTypeId) : null,
  };
}

export default function PartnerImportPanel({
  onImported,
  lockedTypeId,
  lockedSeriesId,
}: {
  onImported?: () => void;
  lockedTypeId?: number;
  lockedSeriesId?: number;
}) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [results, setResults] = useState<PartnerProduct[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [productTypes, setProductTypes] = useState<CatalogType[]>([]);
  const [productSeries, setProductSeries] = useState<CatalogSeries[]>([]);
  const [typeId, setTypeId] = useState<number>(lockedTypeId || 0);
  const [seriesId, setSeriesId] = useState<number>(lockedSeriesId || 0);

  useEffect(() => {
    if (lockedTypeId) setTypeId(lockedTypeId);
    if (lockedSeriesId) setSeriesId(lockedSeriesId);
  }, [lockedTypeId, lockedSeriesId]);

  useEffect(() => {
    fetch('/api/admin/external-catalog/settings', { cache: 'no-store' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setConfigured(false);
          setError(data.error || 'Could not load partner API settings.');
          return;
        }
        const row = data?.data;
        setConfigured(Boolean(row?.api_key && row?.password_saved));
      })
      .catch((err) => {
        setConfigured(false);
        setError(err instanceof Error ? err.message : 'Could not load partner API settings.');
      });
  }, []);

  useEffect(() => {
    const { apiUrl } = API_CONFIG.getApiUrls();
    Promise.all([
      fetch(`${apiUrl}/product-types`, { cache: 'no-store' }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load product types.');
        return Array.isArray(data.data) ? data.data : [];
      }),
      fetch(`${apiUrl}/product-series`, { cache: 'no-store' }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Could not load product series.');
        return Array.isArray(data.data) ? data.data : [];
      }),
    ])
      .then(([types, series]: [unknown[], unknown[]]) => {
        setProductTypes(types.map((row) => normalizeType(row)).filter((row): row is CatalogType => Boolean(row)));
        setProductSeries(series.map((row) => normalizeSeries(row)).filter((row): row is CatalogSeries => Boolean(row)));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Could not load LEVO categories.');
      });
  }, []);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );

  const seriesOptions = useMemo(
    () => (typeId ? productSeries.filter((row) => row.productTypeId === typeId) : []),
    [productSeries, typeId]
  );

  const allOnPageSelected =
    results.length > 0 && results.every((row) => selected[row.id]);

  async function runSearch(nextPage = 1) {
    setSearching(true);
    setError(null);
    setSummary(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        limit: '20',
      });
      if (query.trim()) params.set('search', query.trim());
      const response = await fetch(`/api/admin/external-catalog/products?${params.toString()}`, {
        cache: 'no-store',
      });
      const data: SearchResponse = await response.json();
      if (!response.ok) throw new Error(data.error || 'Partner search failed');
      setResults(Array.isArray(data.products) ? data.products : []);
      setPage(data.page || nextPage);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Partner search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    runSearch(1);
  }

  function toggleAllOnPage() {
    const next = { ...selected };
    const enable = !allOnPageSelected;
    for (const row of results) {
      next[row.id] = enable;
    }
    setSelected(next);
  }

  async function importSelected() {
    if (selectedIds.length === 0 || !typeId || !seriesId) return;
    setImporting(true);
    setError(null);
    setSummary(null);
    try {
      const response = await fetch('/api/admin/external-catalog/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: selectedIds,
          product_type_id: typeId,
          series_id: seriesId,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Import failed');
      setSummary(data.summary);
      setSelected({});
      onImported?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="bg-white shadow-md rounded p-6 mb-8">
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h2 className="text-xl font-semibold">Import from partner</h2>
        <Link href="/admin/external-catalog" className="text-blue-600 hover:underline text-sm">
          Partner API settings
        </Link>
      </div>

      {configured === false && (
        <p className="text-gray-600 mb-4">
          Add the LightX API key and password on the{' '}
          <Link href="/admin/external-catalog" className="text-blue-600 hover:underline">
            partner catalog settings
          </Link>{' '}
          page before searching.
        </p>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}
      {summary && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>
            Imported: {summary.created} created, {summary.updated} updated, {summary.skipped} skipped.
          </p>
        </div>
      )}

      {!lockedTypeId && !lockedSeriesId ? (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="partner-import-type" className="block text-gray-700">
              Product type *
            </label>
            <HelpButton
              helpKey="admin.products.partner_import_type"
              type="button"
              className="text-xs text-gray-500 border border-gray-300 rounded px-1 leading-none"
              aria-label="Help: product type"
            >
              ?
            </HelpButton>
          </div>
          <select
            id="partner-import-type"
            data-help-key="admin.products.partner_import_type"
            value={typeId || ''}
            onChange={(e) => {
              const nextTypeId = Number(e.target.value) || 0;
              setTypeId(nextTypeId);
              const current = productSeries.find((row) => row.id === seriesId);
              if (!current || current.productTypeId !== nextTypeId) {
                setSeriesId(0);
              }
            }}
            className="w-full border border-gray-300 rounded px-3 py-2"
          >
            <option value="">Select a product type</option>
            {productTypes.map((pt) => (
              <option key={pt.id} value={pt.id}>
                {pt.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <label htmlFor="partner-import-series" className="block text-gray-700">
              Series *
            </label>
            <HelpButton
              helpKey="admin.products.partner_import_series"
              type="button"
              className="text-xs text-gray-500 border border-gray-300 rounded px-1 leading-none"
              aria-label="Help: series"
            >
              ?
            </HelpButton>
          </div>
          <select
            id="partner-import-series"
            data-help-key="admin.products.partner_import_series"
            value={seriesId || ''}
            onChange={(e) => setSeriesId(Number(e.target.value) || 0)}
            className="w-full border border-gray-300 rounded px-3 py-2"
            disabled={!typeId}
          >
            <option value="">
              {!typeId ? 'Select a product type first' : 'Select a LEVO series'}
            </option>
            {seriesOptions.map((series) => (
              <option key={series.id} value={series.id}>
                {series.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      ) : (
        <p className="text-sm text-gray-600 mb-4">
          Imports are added to this series. Unique wattage, size, CCT, beam, dimming, and other spec
          values are merged into the series option lists.
        </p>
      )}

      <form onSubmit={handleSearch} className="flex flex-wrap gap-3 mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search partner products"
          className="flex-1 min-w-[200px] border border-gray-300 rounded px-3 py-2"
        />
        <HelpButton
          helpKey="admin.products.partner_search"
          type="submit"
          disabled={searching || configured === false}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-60"
        >
          {searching ? 'Searching...' : 'Search'}
        </HelpButton>
        <HelpButton
          helpKey="admin.products.partner_import"
          type="button"
          onClick={importSelected}
          disabled={importing || selectedIds.length === 0 || !typeId || !seriesId}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-60"
        >
          {importing ? 'Importing...' : `Import selected (${selectedIds.length})`}
        </HelpButton>
      </form>

      {results.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            {total} partner product{total === 1 ? '' : 's'} · page {page} of {totalPages}
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={toggleAllOnPage}
                      aria-label="Select all on this page"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Photo</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Article</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Brand</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wattage</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((row) => (
                  <tr key={row.id} className={selected[row.id] ? 'bg-blue-50' : ''}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={Boolean(selected[row.id])}
                        onChange={() =>
                          setSelected((prev) => ({ ...prev, [row.id]: !prev[row.id] }))
                        }
                        aria-label={`Select ${row.article || row.model || row.id}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      {row.photos?.main ? (
                        <PartnerThumb src={row.photos.main} />
                      ) : (
                        <span className="text-xs text-gray-400">No image</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-sm">{row.article || '—'}</td>
                    <td className="px-3 py-2 text-sm">{row.model || '—'}</td>
                    <td className="px-3 py-2 text-sm">{row.brand || '—'}</td>
                    <td className="px-3 py-2 text-sm">{row.category?.name || '—'}</td>
                    <td className="px-3 py-2 text-sm">{row.wattage ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={runSearch}
            disabled={searching}
            helpKey="admin.products.partner_page"
          />
        </>
      )}
    </div>
  );
}
