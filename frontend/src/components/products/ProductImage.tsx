'use client';

import React, { useState, useEffect } from 'react';
import { resolveProductDisplaySrc } from '@/lib/image-utils';

// Base64 placeholder image as a fallback
const PLACEHOLDER_IMAGE = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCADIAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIHMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD+/iiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigA';

interface ProductImageProps {
  productId: number;
  imageType: 'main_image_A' | 'main_image_B' | 'size_image' | 'application_image' | 'photometric_image' | 'featured_image';
  className?: string;
  alt?: string;
  onClick?: () => void;
  isEditMode?: boolean;
  seriesSlug?: string;
  imagePath?: unknown;
  refreshKey?: number;
}

/**
 * ProductImage component handles displaying product images with fallbacks
 * Even if no image path is provided from the API, it will generate a default path
 */
const ProductImage: React.FC<ProductImageProps> = ({ 
  productId, 
  imageType, 
  className = "object-cover w-full h-full",
  alt = "Product image",
  onClick,
  isEditMode = false,
  seriesSlug,
  imagePath,
  refreshKey
}) => {
  const getImagePath = () => {
    return resolveProductDisplaySrc(imagePath, {
      seriesSlug,
      cacheKey: refreshKey,
    }) || null;
  };
  
  const [imageSrc, setImageSrc] = useState<string | null>(getImagePath());
  const [error, setError] = useState<boolean>(false);
  
  // Add a state to track if we've already logged an error for this image
  // This prevents multiple error logs for the same missing image
  const [errorLogged, setErrorLogged] = useState<boolean>(false);
  
  // Update image source when props change
  useEffect(() => {
    // Reset the error state
    setError(false);
    setErrorLogged(false);
    
    // Update the image source based on current props
    setImageSrc(getImagePath());
    
    // Add a timestamp to force image reload and avoid caching issues
    console.log(`Updating image for ${imageType} with productId ${productId}`);
  }, [productId, imageType, seriesSlug, refreshKey, imagePath]);
  
  // Handle image load error. Do not console.error — Next.js treats that as an app overlay.
  const handleError = () => {
    if (!errorLogged) {
      setErrorLogged(true);
    }
    setImageSrc(PLACEHOLDER_IMAGE);
    setError(true);
  };

  // Handle click with a specific stop propagation
  const handleClick = (e: React.MouseEvent) => {
    if (onClick && isEditMode) {
      e.preventDefault();
      e.stopPropagation();
      console.log(`Image clicked: ${imageType}`);
      onClick();
    }
  };

  return (
    <div 
      className={`relative h-48 w-full border border-gray-300 rounded overflow-hidden bg-gray-100 flex items-center justify-center p-1 ${isEditMode ? 'cursor-pointer hover:bg-gray-200' : ''}`}
      onClick={handleClick}
    >
      {imageSrc ? (
        <img 
          src={imageSrc}
          alt={alt}
          className="max-w-full max-h-full object-contain"
          onError={handleError}
        />
      ) : (
        <div className="text-center p-4">
          <svg className="w-12 h-12 mx-auto text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="mt-2 text-sm text-gray-500">No image uploaded</p>
        </div>
      )}
      {error && (
        <div className="absolute bottom-0 left-0 right-0 bg-red-100 text-red-800 text-xs p-1 text-center">
          Image not found
        </div>
      )}
      {isEditMode && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200 bg-black bg-opacity-30">
          <div className="bg-white rounded p-1 shadow">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductImage; 