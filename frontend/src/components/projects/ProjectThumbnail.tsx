'use client';

import React, { useState } from 'react';
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
  thumbnailPath,
  alt,
  className = '',
  priority = false,
}: ProjectThumbnailProps) {
  const [failed, setFailed] = useState(false);
  const src = !failed && thumbnailPath ? thumbnailPath : '';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
          onError={() => setFailed(true)}
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
