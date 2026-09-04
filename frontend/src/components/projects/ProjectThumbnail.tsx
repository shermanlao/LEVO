'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';

interface ProjectThumbnailProps {
  projectId: string;
  projectSlug: string;
  thumbnailPath?: string;
  alt: string;
  className?: string;
  priority?: boolean;
}

export default function ProjectThumbnail({
  projectId,
  projectSlug,
  thumbnailPath,
  alt,
  className = '',
  priority = false
}: ProjectThumbnailProps) {
  const [imageSrc, setImageSrc] = useState<string>(thumbnailPath || '');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    // If no thumbnail path provided, or if the path is invalid, try to fix it
    if (!thumbnailPath || error) {
      const fixThumbnail = async () => {
        try {
          const response = await fetch(`/api/fix-project-thumbnail?id=${projectId || projectSlug}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.thumbnailExists && data.newThumbnailPath) {
              console.log(`Fixed thumbnail path for ${projectId}: ${data.newThumbnailPath}`);
              setImageSrc(data.newThumbnailPath);
              setError(false);
            } else {
              // If we still can't find a valid path, use a fallback
              // Using a placeholder gradient instead of a missing image
              setImageSrc('');
              console.log(`Could not find valid thumbnail for ${projectId}, using placeholder`);
            }
          }
        } catch (err) {
          console.error('Error fixing thumbnail:', err);
          // Using a placeholder instead of trying to load a non-existent image
          setImageSrc('');
        } finally {
          setLoading(false);
        }
      };

      fixThumbnail();
    } else {
      setImageSrc(thumbnailPath);
      setLoading(false);
    }
  }, [thumbnailPath, projectId, projectSlug, error]);

  const handleImageError = () => {
    console.error(`Failed to load thumbnail image: ${imageSrc}`);
    if (!error) {
      setError(true);
      // This will trigger the useEffect to try to fix the thumbnail
    }
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {loading ? (
        <div className="absolute inset-0 bg-gray-100 animate-pulse" />
      ) : imageSrc ? (
        <Image
          src={imageSrc}
          alt={alt}
          fill
          className="object-cover"
          onError={handleImageError}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          priority={priority}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-200 to-gray-300">
          <div className="text-center p-4">
            <div className="text-gray-600 font-medium">{alt}</div>
            <div className="text-gray-500 text-sm mt-1">Image not available</div>
          </div>
        </div>
      )}
    </div>
  );
} 