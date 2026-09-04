'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import { API_CONFIG } from '@/lib/api-config';
import { resolveImageUrl, storedProductImagePath, toPublicImagePath } from '@/lib/image-utils';
import { asStrapiList } from '@/lib/strapi-entity';
import { slugify } from '@/lib/slugify';
import AdminPageHeader from '@/components/admin/AdminPageHeader';
import Button from '@/components/ui/Button';
import AlertBanner from '@/components/ui/AlertBanner';
import HelpButton from '@/components/admin/HelpButton';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, assignFileToInput, validateImageFile } from '@/lib/image-frames';

interface ProductType {
  id: number;
  attributes: {
    name: string;
    description: string;
    slug: string;
    featured_image?: {
      data: {
        id: number;
        attributes: {
          url: string;
        }
      }
    };
    createdAt: string;
    updatedAt: string;
  };
}

export default function ProductTypesAdminPage() {
  const [productTypes, setProductTypes] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingType, setEditingType] = useState<ProductType | null>(null);
  
  // File input refs
  const featuredImageRef = useRef<HTMLInputElement>(null);
  const editFeaturedImageRef = useRef<HTMLInputElement>(null);
  const { requestCrop, cutboard } = useImageCutboard();

  // Image preview states
  const [featuredImagePreview, setFeaturedImagePreview] = useState<string | null>(null);
  const [editFeaturedImagePreview, setEditFeaturedImagePreview] = useState<string | null>(null);
  
  // New product type form state
  const [newType, setNewType] = useState({
    name: '',
    description: '',
    slug: ''
  });
  
  // Get API URLs from configuration
  const { apiUrl } = API_CONFIG.getApiUrls();
  
  // Helper function to safely extract image URL from various data structures
  const extractImageUrl = (type: ProductType): string | null => {
    const src = toPublicImagePath(type?.attributes?.featured_image);
    return src || null;
  };
  
  const uploadTypeImage = async (file: File) => {
    const formData = new FormData();
    formData.append('files', file);
    const response = await fetch(`${apiUrl}/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) throw new Error('Failed to upload category image');
    const data = await response.json();
    const fileInfo = data.files?.[0] || data[0];
    return storedProductImagePath(fileInfo) || '';
  };

  const handleFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const cropped = await requestCrop(file, IMAGE_FRAMES.catalog);
    if (!cropped) return;
    assignFileToInput(featuredImageRef.current, cropped);
    setFeaturedImagePreview(URL.createObjectURL(cropped));
  };
  
  const handleEditFeaturedImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const invalid = validateImageFile(file);
    if (invalid) {
      setError(invalid);
      return;
    }
    const cropped = await requestCrop(file, IMAGE_FRAMES.catalog);
    if (!cropped) return;
    assignFileToInput(editFeaturedImageRef.current, cropped);
    setEditFeaturedImagePreview(URL.createObjectURL(cropped));
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
      const createFile = featuredImageRef.current?.files?.[0];
      if (createFile) {
        const featuredImage = await uploadTypeImage(createFile);
        if (featuredImage) payload.featured_image = featuredImage;
      }

      const response = await fetch(`${apiUrl}/product-types`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create product type');
      }
      
      // Reset form and refresh product types
      setNewType({
        name: '',
        description: '',
        slug: ''
      });
      setFeaturedImagePreview(null);
      setIsCreating(false);
      fetchProductTypes();
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating the product type');
    }
  };
  
  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingType) return;
    
    try {
      console.log(`Attempting to update product type ID: ${editingType.id}`);
      
      const typeData: Record<string, unknown> = {
        name: editingType.attributes.name,
        description: editingType.attributes.description,
        slug: editingType.attributes.slug
      };

      const editFile = editFeaturedImageRef.current?.files?.[0];
      if (editFile) {
        const featuredImage = await uploadTypeImage(editFile);
        if (featuredImage) typeData.featured_image = featuredImage;
      }

      const apiResponse = await fetch(`${apiUrl}/product-types/${editingType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(typeData),
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to update product type: ${apiResponse.statusText}`);
      }
      
      // Refresh the product types list
      fetchProductTypes();
      
      // Clear editing state
      setEditingType(null);
    } catch (error: unknown) {
      console.error('Error updating product type:', error);
      // Safely extract error message based on error type
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error occurred';
      setError(`Failed to update product type: ${errorMessage}`);
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
    } catch (err: any) {
      console.error('Product type delete error:', err);
      setError(err.message || 'An error occurred while deleting the product type');
    }
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>, isNewForm: boolean) => {
    const name = e.target.value;
    const slug = slugify(name);
    
    if (isNewForm) {
      setNewType({
        ...newType,
        name,
        slug
      });
    } else if (editingType) {
      setEditingType({
        ...editingType,
        attributes: {
          ...editingType.attributes,
          name,
          slug
        }
      });
    }
  };
  
  return (
    <div>
      <AdminPageHeader
        title="Product Types Management"
        actions={
          <Button helpKey="admin.product_types.add" onClick={() => setIsCreating(!isCreating)}>
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
                  onChange={(e) => handleNameChange(e, true)}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={newType.slug}
                  onChange={(e) => setNewType({...newType, slug: e.target.value})}
                  className="input-field"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Auto-generated from name, but you can customize it
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Featured Image</label>
                <input
                  type="file"
                  ref={featuredImageRef}
                  onChange={handleFeaturedImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <HelpButton
                  helpKey="admin.product_types.featured_image"
                  type="button"
                  className="btn-secondary text-center py-2 px-3 text-sm font-medium"
                  onClick={() => featuredImageRef.current?.click()}
                >
                  {featuredImagePreview ? 'Replace image' : 'Upload image'}
                </HelpButton>
                <p className="text-xs text-gray-500 mt-1">16:9 crop, same as the public category card.</p>
                {featuredImagePreview && (
                  <AdminHoverPreview src={featuredImagePreview} className="mt-2 w-full max-w-xs">
                  <div className={`relative w-full border border-gray-300 overflow-hidden ${IMAGE_FRAMES.catalog.className}`}>
                    <Image 
                      src={featuredImagePreview}
                      alt="Featured image preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                  </AdminHoverPreview>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={newType.description}
                onChange={(e) => setNewType({...newType, description: e.target.value})}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <Button helpKey="admin.product_types.create" type="submit">
                Create Product Type
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {editingType && (
        <div className="bg-white shadow-md rounded p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Edit Product Type</h2>
          <form onSubmit={handleUpdateSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-gray-700 mb-2">Name *</label>
                <input
                  type="text"
                  value={editingType.attributes.name}
                  onChange={(e) => handleNameChange(e, false)}
                  className="input-field"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2">Slug *</label>
                <input
                  type="text"
                  value={editingType.attributes.slug}
                  onChange={(e) => setEditingType({
                    ...editingType,
                    attributes: {
                      ...editingType.attributes,
                      slug: e.target.value
                    }
                  })}
                  className="input-field"
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Auto-generated from name, but you can customize it
                </p>
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-gray-700 mb-2">Featured Image</label>
                <input
                  type="file"
                  ref={editFeaturedImageRef}
                  onChange={handleEditFeaturedImageChange}
                  accept="image/*"
                  className="hidden"
                />
                <HelpButton
                  helpKey="admin.product_types.featured_image"
                  type="button"
                  className="btn-secondary text-center py-2 px-3 text-sm font-medium"
                  onClick={() => editFeaturedImageRef.current?.click()}
                >
                  {editFeaturedImagePreview || extractImageUrl(editingType)
                    ? 'Replace image'
                    : 'Upload image'}
                </HelpButton>
                <p className="text-xs text-gray-500 mt-1">16:9 crop, same as the public category card.</p>
                {/* Show current featured image or preview of new upload */}
                {(editFeaturedImagePreview || (editingType && extractImageUrl(editingType))) && (
                  <AdminHoverPreview
                    src={editFeaturedImagePreview || resolveImageUrl(extractImageUrl(editingType))}
                    className="mt-2 w-full max-w-xs"
                  >
                  <div className={`relative w-full border border-gray-300 overflow-hidden ${IMAGE_FRAMES.catalog.className}`}>
                    <Image 
                      src={editFeaturedImagePreview || 
                           resolveImageUrl(extractImageUrl(editingType))}
                      alt="Featured image"
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/placeholder.jpg';
                      }}
                    />
                  </div>
                  </AdminHoverPreview>
                )}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-700 mb-2">Description</label>
              <textarea
                value={editingType.attributes.description}
                onChange={(e) => setEditingType({
                  ...editingType,
                  attributes: {
                    ...editingType.attributes,
                    description: e.target.value
                  }
                })}
                className="w-full border border-gray-300 rounded px-3 py-2 h-32"
              ></textarea>
            </div>
            
            <div className="flex justify-end">
              <Button helpKey="admin.product_types.update" type="submit">
                Update Product Type
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Product Types Table */}
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
                    <button
                      onClick={() => setEditingType(type)}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Edit
                    </button>
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
      {cutboard}
    </div>
  );
} 