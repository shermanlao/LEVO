'use client';

import React from 'react';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface ProjectGalleryImageProps {
  src: string;
  alt: string;
  isLarge?: boolean;
}

export default function ProjectGalleryImage({ src, alt, isLarge = false }: ProjectGalleryImageProps) {
  return (
    <div className={`${isLarge ? 'md:col-span-2' : ''} group`}>
      <div className={`relative ${isLarge ? 'h-[500px]' : 'h-[400px]'} overflow-hidden`}>
        <ImageLightbox src={src} alt={alt} preserveAspectRatio={true} />
      </div>
    </div>
  );
} 