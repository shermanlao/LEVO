'use client';

import React, { useState, useEffect } from 'react';
import { AdminHoverPreview } from '@/components/admin/AdminPhotoSlot';
import ProductImage from './ProductImage';
import { extractImageSrc, productImageFolder } from '@/lib/image-utils';
import { useImageCutboard } from '@/components/ui/ImageCutboard';
import { IMAGE_FRAMES, validateImageFile } from '@/lib/image-frames';

interface ProductImageUploaderProps {
  productId: number;
  imageType: string; // Now expecting database field names: main_image_A, main_image_B, size_image, etc.
  imagePath?: unknown;
  onUpload: (file: File, imageType: string) => Promise<void>;
  onRemove: () => void;
  isEditMode: boolean;
  seriesSlug: string;
  extraActions?: React.ReactNode;
  onPreviewClick?: () => void;
}

function resolvePreviewPath(imagePath: unknown, seriesSlug: string): string | null {
  const src = extractImageSrc(imagePath);
  if (!src) return null;
  if (src.startsWith('http') || src.startsWith('/') || src.startsWith('blob:')) {
    return src;
  }
  return `/images/products/${productImageFolder(seriesSlug)}/${src}`;
}

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productId,
  imageType,
  imagePath,
  onUpload,
  onRemove,
  isEditMode,
  seriesSlug,
  extraActions,
  onPreviewClick,
}) => {
  const { requestCrop, cutboard } = useImageCutboard();
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState<number>(Date.now());
  
  // Format the image type for display
  const formattedImageType = imageType
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  // Use the database image type directly without conversion
  const getFormattedImageType = (type: string): string => {
    // Return the exact type from the database without any conversion
    return type;
  };

  // Initialize preview (image fields may be a string URL or a Strapi media object)
  useEffect(() => {
    const fullImagePath = resolvePreviewPath(imagePath, seriesSlug);
    if (fullImagePath) {
      const formattedType = getFormattedImageType(imageType);
      setPreview(fullImagePath);
      setFileName(`${productId}-${formattedType}`);
      setRefreshTimestamp(Date.now());
    } else {
      setPreview(null);
      setFileName(null);
    }
  }, [imagePath, seriesSlug, productId, imageType]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !isEditMode) return;
    
    const invalid = validateImageFile(file);
    if (invalid) {
      alert(invalid);
      return;
    }
    const cropped = await requestCrop(file, IMAGE_FRAMES.product);
    if (!cropped) return;

    const objectUrl = URL.createObjectURL(cropped);
    setPreview(objectUrl);
    
    // Use standardized filename format
    const formattedType = getFormattedImageType(imageType);
    const standardizedFileName = `${productId}-${formattedType}.jpg`;
    setFileName(standardizedFileName);
    
    setIsUploading(true);
    setUploadSuccess(false);
    
    try {
      // Log the file details for debugging
      console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);
      
      await onUpload(cropped, imageType);
      setUploadSuccess(true);
      setRefreshTimestamp(Date.now());
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Upload failed:', error);
      // Reset to previous state if upload fails
      const fullImagePath = resolvePreviewPath(imagePath, seriesSlug);
      if (fullImagePath) {
        const formattedType = getFormattedImageType(imageType);
        const standardizedFileName = `${productId}-${formattedType}.jpg`;
        setPreview(fullImagePath);
        setFileName(standardizedFileName);
      } else {
        setPreview(null);
        setFileName(null);
      }
    } finally {
      setIsUploading(false);
      
      // Clean up object URL to avoid memory leaks
      // Don't revoke immediately, wait until we're sure we don't need it
      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 3000);
    }
  };

  // Handle image removal
  const handleRemove = () => {
    if (!isEditMode) {
      return;
    }
    
    // Show confirmation dialog
    if (window.confirm('Are you sure you want to remove this image?')) {
      // Clear the local preview and filename
      setPreview(null);
      setFileName(null);
      
      // Trigger the parent component's onRemove callback
      onRemove();
      
      // Show temporary success message
      setUploadSuccess(false);
    }
  };

  return (
    <>
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="p-3 bg-gray-50 border-b">
        <h3 className="font-medium text-gray-800">{formattedImageType}</h3>
      </div>
      
      {/* Image Preview */}
      <AdminHoverPreview src={preview} className="block">
      <div
        className={`aspect-square relative overflow-hidden bg-gray-100 flex items-center justify-center ${
          preview && onPreviewClick && isEditMode ? 'cursor-pointer' : ''
        }`}
        onClick={() => {
          if (preview && onPreviewClick && isEditMode) onPreviewClick();
        }}
      >
        {preview ? (
          <ProductImage
            productId={productId}
            imageType={imageType as any}
            alt={`${formattedImageType} preview`}
            className="object-contain w-full h-full p-2"
            imagePath={preview}
            seriesSlug={seriesSlug}
            refreshKey={refreshTimestamp}
          />
        ) : (
          <div className="text-center p-4">
            <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
          </div>
        )}
      </div>
      </AdminHoverPreview>
      
      {/* Action Buttons */}
      <div className="p-3 flex gap-2">
        <label className={`flex-1 ${isEditMode ? 'cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}>
          <div className="bg-blue-500 hover:bg-blue-600 text-white text-center py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center">
            {isUploading ? (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : uploadSuccess ? (
              <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="-ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
            {isUploading ? 'Uploading...' : uploadSuccess ? 'Uploaded!' : 'Upload Image'}
          </div>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            onChange={handleFileChange}
            disabled={!isEditMode || isUploading}
          />
        </label>
        
        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={!isEditMode || isUploading}
            className={`bg-red-100 text-red-600 hover:bg-red-200 py-2 px-3 rounded-md text-sm font-medium
              ${!isEditMode || isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
      {extraActions ? <div className="px-3 pb-3 flex flex-wrap gap-2">{extraActions}</div> : null}
    </div>
    {cutboard}
    </>
  );
};

export default ProductImageUploader; 