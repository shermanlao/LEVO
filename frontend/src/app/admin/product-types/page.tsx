'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import { API_CONFIG } from '@/lib/api-config';
import { resolveImageUrl, toPublicImagePath } from '@/lib/image-utils';
import { asStrapiList } from '@/lib/strapi-entity';
import { slugify } from '@/lib/slugify';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { showSaveNotice } from '@/components/ui/SaveNotice';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import SeoGenerateButton from '@/components/admin/SeoGenerateButton';
import { IMAGE_FRAMES } from '@/lib/image-frames';
import TypeFeaturedImageEditor, {
  type TypeFeaturedPaths,
} from '@/components/admin/TypeFeaturedImageEditor';

interface ProductType {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    seo_title?: string;
    seo_description?: string;
    featured_image?: unknown;
    featured_image_source?: unknown;
    createdAt: string;
    updatedAt: string;
  };
}

function applyFeaturedPaths(target: Record<string, unknown>, paths: Partial<TypeFeaturedPaths>) {
  (Object.keys(paths) as Array<keyof TypeFeaturedPaths>).forEach((key) => {
    if (paths[key] === undefined) return;
    target[key] = paths[key] || null;
  });
}

export default function ProductTypesAdminPage() {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createFeaturedPaths, setCreateFeaturedPaths] = useState<Partial<TypeFeaturedPaths>>({});

  const [newType, setNewType] = useState({
    name: '',
    description: '',
    slug: '',
    seo_title: '',
    seo_description: '',
  });

  const { apiUrl } = API_CONFIG.getApiUrls();

  const extractImageUrl = (type: ProductType): string | null => {
    const src = toPublicImagePath(type?.attributes?.featured_image);
    return src || null;
  };

  const fetchProductTypes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/product-types`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      const data = await response.json();
      setProductTypes(asStrapiList(data.data) as ProductType[]);
    } catch (err) {
      console.error('Could not load product types:', err);
      setProductTypes([]);
      setError('Could not load product types. Check that the API server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductTypes();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const payload: Record<string, unknown> = { ...newType };
      applyFeaturedPaths(payload, createFeaturedPaths);

      const response = await fetch(`${apiUrl}/product-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product type');
      }

      setNewType({
        name: '',
        description: '',
        slug: '',
        seo_title: '',
        seo_description: '',
      });
      setCreateFeaturedPaths({});
      setIsCreating(false);
      showSaveNotice('Product type created.');
      fetchProductTypes();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred while creating the product type';
      setError(message);
      showSaveNotice(message, 'error');
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Are you sure you want to delete this product type? This may affect products associated with this type.')) {
      return;
    }
    try {
      const response = await fetch(`${apiUrl}/product-types/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to delete product type');
      }
      fetchProductTypes();
    } catch (err: unknown) {
      console.error('Product type delete error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting the product type');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setNewType({
      ...newType,
      name,
      slug: slugify(name),
    });
  };

  return (
    <div>
      <AdminPageHeader
        title="Product Types Management"
        actions={
          <Button
            helpKey="admin.product_types.add"
            onClick={() => {
              if (isCreating) setCreateFeaturedPaths({});
              setIsCreating(!isCreating);
            }}
          >
            {isCreating ? 'Cancel' : 'Add New Type'}
          </Button>
        }
      />

      {error && <AlertBanner>{error}</AlertBanner>}

      {isCreating && (
        <div className="bg-white shadow-md rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Product Type</h2>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={handleNameChange}
                  className="input-field"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={newType.slug}
                  onChange={(e) => setNewType({ ...newType, slug: e.target.value })}
                  className="input-field"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Auto-generated from name, but you can customize it
                </p>
              </div>

              <div className="md:col-span-2">
                <TypeFeaturedImageEditor
                  paths={createFeaturedPaths}
                  typeSlug={newType.slug}
                  onChange={(next) => setCreateFeaturedPaths((prev) => ({ ...prev, ...next }))}
                  onError={setError}
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={newType.description}
                onChange={(e) => setNewType({ ...newType, description: e.target.value })}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              ></textarea>
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
                  value={newType.seo_title}
                  onChange={(e) => setNewType({ ...newType, seo_title: e.target.value })}
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
                  value={newType.seo_description}
                  onChange={(e) => setNewType({ ...newType, seo_description: e.target.value })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-24"
                  data-help-key="admin.product_types.seo_description"
                />
              </div>
              <SeoGenerateButton
                className="md:col-span-2"
                kind="product_type"
                helpKey="admin.product_types.seo_ai"
                name={newType.name}
                description={newType.description}
                existingTitle={newType.seo_title}
                existingDescription={newType.seo_description}
                onGenerated={({ title, description }) =>
                  setNewType((prev) => ({ ...prev, seo_title: title, seo_description: description }))
                }
              />
            </div>

            <div className="flex justify-end">
              <Button helpKey="admin.product_types.create" type="submit">
                Create Product Type
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white shadow-md rounded overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Image
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">Loading product types...</td>
              </tr>
            ) : productTypes.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center">No product types found.</td>
              </tr>
            ) : (
              productTypes.map((type) => (
                <tr key={type.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <AdminHoverPreview src={extractImageUrl(type) ? resolveImageUrl(extractImageUrl(type)) : null} className="w-20">
                    <div className={`relative w-20 overflow-hidden ${IMAGE_FRAMES.catalog.className}`}>
                      {extractImageUrl(type) ? (
                        <Image
                          src={resolveImageUrl(extractImageUrl(type))}
                          alt={type.attributes?.name || 'Product type'}
                          fill
                          className="object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                          }}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                          No image
                        </div>
                      )}
                    </div>
                    </AdminHoverPreview>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{type.attributes?.name}</div>
                    <div className="text-sm text-gray-500">{type.attributes?.slug}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 max-w-md truncate">
                      {type.attributes.description || 'No description'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <HelpLink
                      helpKey="admin.product_types.edit"
                      href={`/admin/product-types/${type.id}/edit`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </HelpLink>
                    <button
                      onClick={() => handleDeleteType(type.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
