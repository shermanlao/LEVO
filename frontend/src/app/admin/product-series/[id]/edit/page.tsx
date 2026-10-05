'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { asStrapiEntity, asStrapiList } from '@/lib/strapi-entity';
import { slugify } from '@/lib/slugify';
import { adminFetchJson } from '@/lib/admin-fetch';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import NotFoundView from '@/components/layout/NotFoundView';
import SeriesFeaturedImageEditor, {
  seriesFeaturedPathsFromAttrs,
  type SeriesFeaturedPaths,
} from '@/components/admin/SeriesFeaturedImageEditor';
import SpecificationsEditor, {
  SpecPair,
  recordToSpecPairs,
  specPairsToRecord,
} from '@/components/admin/SpecificationsEditor';

type SeriesAttrs = {
  name?: string;
  description?: string;
  slug?: string;
  specifications?: Record<string, string>;
  product_type?: {
    data?: {
      id: number;
      attributes?: { name: string };
    };
  };
  featured_image?: unknown;
  featured_image_source?: unknown;
  featured_image_page?: unknown;
  featured_image_datasheet?: unknown;
};

type ProductType = {
  id: number;
  attributes: { name: string };
};

function applyFeaturedPaths(target: Record<string, unknown>, paths: Partial<SeriesFeaturedPaths>) {
  (Object.keys(paths) as Array<keyof SeriesFeaturedPaths>).forEach((key) => {
    if (paths[key] === undefined) return;
    target[key] = paths[key] || null;
  });
}

export default function EditProductSeriesPage() {
  const params = useParams();
  const id = Number(params?.id);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [typeId, setTypeId] = useState(0);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [featuredPaths, setFeaturedPaths] = useState<Partial<SeriesFeaturedPaths>>({});
  const [specRows, setSpecRows] = useState<SpecPair[]>([]);

  useEffect(() => {
    if (!Number.isInteger(id) || id <= 0) {
      setLoading(false);
      setMissing(true);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      const [seriesResult, typesResult] = await Promise.all([
        adminFetchJson<{ data?: unknown }>(`/product-series/${id}`),
        adminFetchJson<{ data?: unknown }>('/product-types'),
      ]);
      if (cancelled) return;
      setLoading(false);
      if (!seriesResult.ok) {
        if (seriesResult.status === 404) setMissing(true);
        else setError(seriesResult.error);
        return;
      }
      const entity = asStrapiEntity<SeriesAttrs>(seriesResult.data?.data ?? seriesResult.data);
      if (!entity?.id) {
        setMissing(true);
        return;
      }
      const attrs = entity.attributes || {};
      setName(attrs.name || '');
      setSlug(attrs.slug || '');
      setDescription(attrs.description || '');
      setTypeId(Number(attrs.product_type?.data?.id) || 0);
      setFeaturedPaths(seriesFeaturedPathsFromAttrs(attrs));
      setSpecRows(recordToSpecPairs(attrs.specifications));
      if (typesResult.ok) {
        setProductTypes(asStrapiList(typesResult.data?.data) as ProductType[]);
      }
      setReady(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Name and slug are required fields');
      setSuccess(null);
      return;
    }
    setSaving(true);
    setError(null);
    setSuccess(null);
    const seriesData: Record<string, unknown> = {
      name: name.trim(),
      description,
      slug: slug.trim(),
      specifications: specPairsToRecord(specRows),
      product_type_id: typeId || null,
    };
    applyFeaturedPaths(seriesData, featuredPaths);
    const result = await adminFetchJson(`/product-series/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seriesData),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess('Series updated.');
  }

  if (!Number.isInteger(id) || id <= 0 || missing) {
    return (
      <NotFoundView
        title="Series not found"
        description="This product series is not in the catalog."
        links={[
          {
            href: '/admin/product-series',
            label: 'Back to series',
            helpKey: 'admin.product_series.back_list',
            variant: 'primary',
          },
          { href: '/admin', label: 'Dashboard', helpKey: 'admin.404.dashboard', variant: 'secondary' },
        ]}
      />
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={name ? `Edit ${name}` : 'Edit product series'}
        backHref="/admin/product-series"
        backLabel="Back to series"
        backHelpKey="admin.product_series.back_list"
        actions={
          <Button helpKey="admin.product_series.variants" variant="secondary" href={`/admin/product-series/${id}`}>
            Variants
          </Button>
        }
      />

      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {success ? <AlertBanner variant="success">{success}</AlertBanner> : null}
      {loading ? <p className="text-gray-500">Loading series…</p> : null}

      {ready ? (
        <div className="bg-white shadow-md rounded p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => {
                    const nextName = event.target.value;
                    setName(nextName);
                    setSlug(slugify(nextName));
                  }}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="input-field"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Product Type</label>
                <select
                  value={typeId || ''}
                  onChange={(event) => setTypeId(Number(event.target.value) || 0)}
                  className="input-field"
                >
                  <option value="">None</option>
                  {productTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.attributes.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <SeriesFeaturedImageEditor
                  paths={featuredPaths}
                  seriesSlug={slug}
                  seriesId={id}
                  onChange={(next) => setFeaturedPaths((prev) => ({ ...prev, ...next }))}
                  onError={setError}
                />
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Specifications</h3>
              <SpecificationsEditor
                specs={specRows}
                onChange={setSpecRows}
                helpKeyPrefix="admin.product_series"
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                helpKey="admin.product_series.cancel_edit"
                variant="secondary"
                type="button"
                href="/admin/product-series"
              >
                Cancel
              </Button>
              <Button helpKey="admin.product_series.update" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Update Series'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
