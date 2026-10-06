'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { asStrapiEntity } from '@/lib/strapi-entity';
import { slugify } from '@/lib/slugify';
import { adminFetchJson } from '@/lib/admin-fetch';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import NotFoundView from '@/components/layout/NotFoundView';
import HelpButton from '@/components/admin/HelpButton';
import SeoGenerateButton from '@/components/admin/SeoGenerateButton';
import TypeFeaturedImageEditor, {
  typeFeaturedPathsFromAttrs,
  type TypeFeaturedPaths,
} from '@/components/admin/TypeFeaturedImageEditor';

type TypeAttrs = {
  name?: string;
  description?: string;
  slug?: string;
  seo_title?: string;
  seo_description?: string;
  featured_image?: unknown;
  featured_image_source?: unknown;
};

function applyFeaturedPaths(target: Record<string, unknown>, paths: Partial<TypeFeaturedPaths>) {
  (Object.keys(paths) as Array<keyof TypeFeaturedPaths>).forEach((key) => {
    if (paths[key] === undefined) return;
    target[key] = paths[key] || null;
  });
}

export default function EditProductTypePage() {
  const params = useParams();
  const id = Number(params?.id);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDescription, setSeoDescription] = useState('');
  const [featuredPaths, setFeaturedPaths] = useState<Partial<TypeFeaturedPaths>>({});

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
      const result = await adminFetchJson<{ data?: unknown }>(`/product-types/${id}`);
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        if (result.status === 404) setMissing(true);
        else setError(result.error);
        return;
      }
      const entity = asStrapiEntity<TypeAttrs>(result.data?.data ?? result.data);
      if (!entity?.id) {
        setMissing(true);
        return;
      }
      const attrs = entity.attributes || {};
      setName(attrs.name || '');
      setSlug(attrs.slug || '');
      setDescription(attrs.description || '');
      setSeoTitle(attrs.seo_title || '');
      setSeoDescription(attrs.seo_description || '');
      setFeaturedPaths(typeFeaturedPathsFromAttrs(attrs));
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
      const message = 'Name and slug are required fields';
      setError(message);
      showSaveNotice(message, 'error');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        description,
        slug: slug.trim(),
        seo_title: seoTitle,
        seo_description: seoDescription,
      };
      applyFeaturedPaths(payload, featuredPaths);
      const result = await adminFetchJson(`/product-types/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!result.ok) throw new Error(result.error);
      showSaveNotice('Product type updated.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update product type';
      setError(message);
      showSaveNotice(message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (!Number.isInteger(id) || id <= 0 || missing) {
    return (
      <NotFoundView
        title="Product type not found"
        description="This category is not in the catalog."
        links={[
          {
            href: '/admin/product-types',
            label: 'Back to product types',
            helpKey: 'admin.product_types.back_list',
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
        title={name ? `Edit ${name}` : 'Edit product type'}
        backHref="/admin/product-types"
        backLabel="Back to product types"
        backHelpKey="admin.product_types.back_list"
      />

      {error ? <AlertBanner>{error}</AlertBanner> : null}
      {loading ? <p className="text-gray-500">Loading product type…</p> : null}

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
                <p className="text-sm text-gray-500 mt-1">
                  Auto-generated from name, but you can customize it
                </p>
              </div>

              <div className="md:col-span-2">
                <TypeFeaturedImageEditor
                  paths={featuredPaths}
                  typeSlug={slug}
                  typeId={id}
                  onChange={(next) => setFeaturedPaths((prev) => ({ ...prev, ...next }))}
                  onError={setError}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">
                  SEO title{' '}
                  <HelpButton helpKey="admin.product_types.seo_title" type="button" className="text-xs text-gray-500">
                    ?
                  </HelpButton>
                </label>
                <input
                  type="text"
                  value={seoTitle}
                  onChange={(event) => setSeoTitle(event.target.value)}
                  className="input-field"
                  data-help-key="admin.product_types.seo_title"
                />
              </div>
              <div>
                <label className="block text-gray-700 mb-2">
                  SEO description{' '}
                  <HelpButton helpKey="admin.product_types.seo_description" type="button" className="text-xs text-gray-500">
                    ?
                  </HelpButton>
                </label>
                <textarea
                  value={seoDescription}
                  onChange={(event) => setSeoDescription(event.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                  data-help-key="admin.product_types.seo_description"
                />
              </div>
              <SeoGenerateButton
                className="md:col-span-2"
                kind="product_type"
                helpKey="admin.product_types.seo_ai"
                name={name}
                description={description}
                existingTitle={seoTitle}
                existingDescription={seoDescription}
                onGenerated={({ title, description: nextDescription }) => {
                  setSeoTitle(title);
                  setSeoDescription(nextDescription);
                }}
              />
            </div>

            <div className="flex justify-end space-x-3">
              <Button
                helpKey="admin.product_types.cancel_edit"
                variant="secondary"
                href="/admin/product-types"
              >
                Cancel
              </Button>
              <Button helpKey="admin.product_types.update" type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Update Product Type'}
              </Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
