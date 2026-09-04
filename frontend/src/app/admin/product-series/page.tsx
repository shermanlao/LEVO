'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import { API_CONFIG } from '@/lib/api-config';
import { asStrapiList } from '@/lib/strapi-entity';
import { slugify } from '@/lib/slugify';
import { toPublicImagePath } from '@/lib/image-utils';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import { IMAGE_FRAMES } from '@/lib/image-frames';
import SeriesFeaturedImageEditor, {
  seriesFeaturedPathsFromAttrs,
  type SeriesFeaturedPaths,
} from '@/components/admin/SeriesFeaturedImageEditor';
import SpecificationsEditor, {
  SpecPair,
  recordToSpecPairs,
  specPairsToRecord,
} from '@/components/admin/SpecificationsEditor';

interface ProductSeries {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    product_type?: {
      data: {
        id: number;
        attributes: {
          name: string;
        }
      }
    };
    featured_image?: unknown;
    featured_image_source?: unknown;
    featured_image_page?: unknown;
    featured_image_datasheet?: unknown;
    specifications?: Record<string, string>;
    createdAt: string;
    updatedAt: string;
  };
}

interface ProductType {
  id: number;
  attributes: {
    name: string;
  };
}

export default function ProductSeriesAdminPage() {
  const router = useRouter();
  const [series, setSeries] = useState<ProductSeries[]>([]);
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingSeries, setEditingSeries] = useState<ProductSeries | null>(null);
  const [createFeaturedPaths, setCreateFeaturedPaths] = useState<Partial<SeriesFeaturedPaths>>({});
  const [editFeaturedPaths, setEditFeaturedPaths] = useState<Partial<SeriesFeaturedPaths>>({});
  const [createSpecRows, setCreateSpecRows] = useState<SpecPair[]>([]);
  const [editSpecRows, setEditSpecRows] = useState<SpecPair[]>([]);
  
  const apiUrl = API_CONFIG.apiUrl;

  const applyFeaturedPaths = (
    target: Record<string, unknown>,
    paths: Partial<SeriesFeaturedPaths>
  ) => {
    if (paths.featured_image_source) target.featured_image_source = paths.featured_image_source;
    if (paths.featured_image) target.featured_image = paths.featured_image;
    if (paths.featured_image_page) target.featured_image_page = paths.featured_image_page;
    if (paths.featured_image_datasheet) target.featured_image_datasheet = paths.featured_image_datasheet;
  };
  
  const [newSeries, setNewSeries] = useState({
    name: '',
    description: '',
    slug: '',
    specifications: {} as Record<string, string>,
    product_type_id: 0
  });
  
  useEffect(() => {
    fetchProductSeries();
    fetchProductTypes();
  }, []);
  
  const fetchProductSeries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // First try the admin API endpoint
      const response = await fetch(`${apiUrl}/product-series`);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      setSeries(asStrapiList(data.data) as ProductSeries[]);
    } catch (err: any) {
      console.error('Error fetching product series:', err);
      setError(err.message || 'An error occurred while fetching product series');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProductTypes = async () => {
    try {
      const response = await fetch(`${apiUrl}/product-types`);
      
      if (!response.ok) {
        console.error(`API error: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      setProductTypes(asStrapiList(data.data) as ProductType[]);
    } catch (err) {
      console.error('Error fetching product types:', err);
    }
  };
  
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Basic validation
      if (!newSeries.name || !newSeries.slug) {
        setError('Name and slug are required fields');
        return;
      }
      
      const seriesData: Record<string, unknown> = {
        name: newSeries.name,
        description: newSeries.description,
        slug: newSeries.slug,
        specifications: specPairsToRecord(createSpecRows),
        product_type_id: newSeries.product_type_id || null
      };

      applyFeaturedPaths(seriesData, createFeaturedPaths);
      
      console.log('Sending create data:', seriesData);
      
      // Send to our minimal API server instead of CMS
      const response = await fetch(`${apiUrl}/product-series`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seriesData),
      });
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (err) {
        errorData = { error: 'Failed to parse response' };
      }
      
      if (!response.ok) {
        const errorMessage = errorData.error || 'Failed to create product series';
        throw new Error(errorMessage);
      }
      
      // Reset form and refresh product series
      setNewSeries({
        name: '',
        description: '',
        slug: '',
        specifications: {},
        product_type_id: 0
      });
      setCreateSpecRows([]);
      setCreateFeaturedPaths({});
      setIsCreating(false);
      fetchProductSeries();
      
    } catch (err: any) {
      console.error('Error creating product series:', err);
      setError(err.message || 'An error occurred while creating the product series');
    }
  };
  
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Basic validation
      if (!editingSeries?.attributes.name || !editingSeries?.attributes.slug) {
        setError('Name and slug are required fields');
        return;
      }
      
      const seriesData: Record<string, unknown> = {
        name: editingSeries.attributes.name,
        description: editingSeries.attributes.description,
        slug: editingSeries.attributes.slug,
        specifications: specPairsToRecord(editSpecRows),
        product_type_id: editingSeries.attributes.product_type?.data?.id || null
      };

      applyFeaturedPaths(seriesData, editFeaturedPaths);
      
      console.log('Sending update data:', seriesData);
      
      const response = await fetch(`${apiUrl}/product-series/${editingSeries.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(seriesData),
      });
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (err) {
        errorData = { error: 'Failed to parse response' };
      }
      
      if (!response.ok) {
        const errorMessage = errorData.error || 'Failed to update product series';
        throw new Error(errorMessage);
      }
      
      // Reset form and refresh product series
      setEditingSeries(null);
      setEditFeaturedPaths({});
      fetchProductSeries();
      
    } catch (err: any) {
      console.error('Error updating product series:', err);
      setError(err.message || 'An error occurred while updating the product series');
    }
  };
  
  const handleDeleteSeries = async (id: number) => {
    if (!confirm('Delete this product series? Products in it stay in the catalog but will no longer belong to a series.')) {
      return;
    }
    
    try {
      const response = await fetch(`${apiUrl}/product-series/${id}`, {
        method: 'DELETE',
      });
      
      let errorData;
      try {
        errorData = await response.json();
      } catch (err) {
        errorData = { error: 'Failed to parse response' };
      }
      
      if (!response.ok) {
        const errorMessage = errorData.error || 'Failed to delete product series';
        throw new Error(errorMessage);
      }
      
      // Refresh product series
      fetchProductSeries();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while deleting the product series');
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, isNewForm: boolean) => {
    const name = e.target.value;
    const slug = slugify(name);
    
    if (isNewForm) {
      setNewSeries({
        ...newSeries,
        name,
        slug
      });
    } else if (editingSeries) {
      const updatedSeries = {
        ...editingSeries,
        attributes: {
          ...editingSeries.attributes,
          name,
          slug
        }
      };
      setEditingSeries(updatedSeries);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Product Series Management</h1>
        <div className="flex justify-center items-center py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  // Render error state with retry button — only when the list itself failed to load
  if (error && series.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Product Series Management</h1>
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center">
          <p className="mb-4">Try the following:</p>
          <ol className="list-decimal pl-6 mb-6">
            <li>Check if the API server is running (node index.js in levo-api folder)</li>
            <li>Verify the API server port (3333) is not blocked</li>
            <li>Check for any error messages in the API server console</li>
          </ol>
            <Button helpKey="admin.product_series.retry" onClick={fetchProductSeries}>
              Retry Connection
            </Button>
          
          {/* Add debug section */}
          <div className="mt-8 w-full max-w-lg p-4 bg-gray-50 border rounded text-sm">
            <h3 className="font-semibold mb-2">Connection Debug Info</h3>
            <div className="mb-2">
              <span className="font-medium">API URL:</span> {apiUrl}
            </div>
            <div className="mb-2">
              <span className="font-medium">CMS URL:</span> {API_CONFIG.cmsUrl}
            </div>
            <div className="mb-2">
              <span className="font-medium">Browser:</span> {typeof window !== 'undefined' ? window.navigator.userAgent : 'Server-side'}
            </div>
            <div className="mt-4">
              <h4 className="font-medium mb-1">Manual connection check:</h4>
              <div className="flex space-x-2">
                <button
                  onClick={() => window.open(`${apiUrl}/product-series`, '_blank')}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs"
                >
                  Test API
                </button>
                <button
                  onClick={() => window.open(`${API_CONFIG.cmsUrl}`, '_blank')}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs"
                >
                  Test CMS
                </button>
                <button
                  onClick={() => window.open(`${apiUrl}/check-cors`, '_blank')}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1 rounded text-xs"
                >
                  Check CORS
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title="Product Series Management"
        actions={
          <Button
            helpKey="admin.product_series.add"
            onClick={() => {
              setIsCreating(!isCreating);
              setCreateFeaturedPaths({});
            }}
          >
            {isCreating ? 'Cancel' : 'Add New Series'}
          </Button>
        }
      />

      {error && <AlertBanner>{error}</AlertBanner>}

      {/* Create form */}
      {isCreating && (
        <div className="bg-white shadow-md rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Create New Product Series</h2>
          <form onSubmit={handleCreateSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={newSeries.name}
                  onChange={(e) => handleNameChange(e, true)}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={newSeries.slug}
                  onChange={(e) => setNewSeries({...newSeries, slug: e.target.value})}
                  className="input-field"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={newSeries.description}
                  onChange={(e) => setNewSeries({...newSeries, description: e.target.value})}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Product Type</label>
                <select
                  value={newSeries.product_type_id || ''}
                  onChange={(e) => setNewSeries({...newSeries, product_type_id: Number(e.target.value) || 0})}
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
                  paths={createFeaturedPaths}
                  seriesSlug={newSeries.slug}
                  onChange={(next) => setCreateFeaturedPaths((prev) => ({ ...prev, ...next }))}
                  onError={setError}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Specifications</h3>
              <SpecificationsEditor
                specs={createSpecRows}
                onChange={setCreateSpecRows}
                helpKeyPrefix="admin.product_series"
              />
            </div>
            
            <div className="flex justify-end">
              <Button helpKey="admin.product_series.create" type="submit">
                Create Series
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit form */}
      {editingSeries && (
        <div className="bg-white shadow-md rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Edit Product Series</h2>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingSeries.attributes.name}
                  onChange={(e) => handleNameChange(e, false)}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={editingSeries.attributes.slug}
                  onChange={(e) => setEditingSeries({
                    ...editingSeries,
                    attributes: {
                      ...editingSeries.attributes,
                      slug: e.target.value
                    }
                  })}
                  className="input-field"
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Description</label>
                <textarea
                  value={editingSeries.attributes.description}
                  onChange={(e) => setEditingSeries({
                    ...editingSeries,
                    attributes: {
                      ...editingSeries.attributes,
                      description: e.target.value
                    }
                  })}
                  className="w-full border border-gray-300 rounded px-3 py-2 h-32"
                ></textarea>
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Product Type</label>
                <select
                  value={editingSeries.attributes.product_type?.data?.id || ''}
                  onChange={(e) => {
                    const typeId = Number(e.target.value) || null;
                    const selectedType = productTypes.find(t => t.id === typeId);
                    
                    setEditingSeries({
                      ...editingSeries,
                      attributes: {
                        ...editingSeries.attributes,
                        product_type: typeId ? {
                          data: {
                            id: typeId,
                            attributes: {
                              name: selectedType?.attributes.name || ''
                            }
                          }
                        } : undefined
                      }
                    });
                  }}
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
                  paths={editFeaturedPaths}
                  seriesSlug={editingSeries.attributes.slug}
                  seriesId={editingSeries.id}
                  onChange={(next) => setEditFeaturedPaths((prev) => ({ ...prev, ...next }))}
                  onError={setError}
                />
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Specifications</h3>
              <SpecificationsEditor
                specs={editSpecRows}
                onChange={setEditSpecRows}
                helpKeyPrefix="admin.product_series"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                helpKey="admin.product_series.cancel_edit"
                variant="secondary"
                type="button"
                onClick={() => {
                  setEditingSeries(null);
                  setEditFeaturedPaths({});
                }}
              >
                Cancel
              </Button>
              <Button helpKey="admin.product_series.update" type="submit">
                Update Series
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Product series list */}
      <div className="bg-white shadow-md rounded overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {series.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No product series found. Create one to get started!
                </td>
              </tr>
            ) : (
              series.map((item) => {
                const attrs = item?.attributes;
                const imageUrl = toPublicImagePath(attrs?.featured_image);
                return (
                <tr
                  key={item.id}
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => router.push(`/admin/product-series/${item.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <AdminHoverPreview src={imageUrl || null} className="flex-shrink-0 w-16">
                      <div className={`relative w-16 overflow-hidden rounded ${IMAGE_FRAMES.catalog.className}`}>
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt={attrs?.name || 'Series'}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-500 text-xs">No img</span>
                          </div>
                        )}
                      </div>
                      </AdminHoverPreview>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{attrs?.name || 'Untitled'}</div>
                        <div className="text-xs text-gray-500">{attrs?.slug || ''}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {attrs?.product_type?.data?.attributes?.name || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 truncate max-w-xs">
                      {attrs?.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        helpKey="admin.product_series.variants"
                        variant="secondary"
                        href={`/admin/product-series/${item.id}`}
                      >
                        Variants
                      </Button>
                      <Button
                        helpKey="admin.product_series.edit"
                        variant="secondary"
                        onClick={() => {
                          setEditingSeries(item);
                          setEditFeaturedPaths(seriesFeaturedPathsFromAttrs(item.attributes));
                          setEditSpecRows(recordToSpecPairs(item.attributes.specifications));
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        helpKey="admin.product_series.delete"
                        variant="danger"
                        onClick={() => handleDeleteSeries(item.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 