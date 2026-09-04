'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import the GalleryGrid component
const GalleryGrid = dynamic(() => import('./GalleryGrid'), { 
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-40">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
    </div>
  )
});

interface ProjectGalleryWrapperProps {
  images: string[];
  title: string;
}

export default function ProjectGalleryWrapper({ images, title }: ProjectGalleryWrapperProps) {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center h-40">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
      </div>
    }>
      <GalleryGrid images={images} title={title} />
    </Suspense>
  );
} 