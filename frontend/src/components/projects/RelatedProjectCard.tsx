'use client';

import React from 'react';
import Link from 'next/link';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface RelatedProjectCardProps {
  title: string;
  description: string;
  imageUrl: string;
  projectUrl: string;
}

export default function RelatedProjectCard({ 
  title, 
  description, 
  imageUrl, 
  projectUrl 
}: RelatedProjectCardProps) {
  return (
    <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 transition-transform hover:shadow-md hover:scale-[1.01]">
      <div className="relative h-44">
        <ImageLightbox 
          src={imageUrl}
          alt={`${title} project`}
        />
      </div>
      <Link href={projectUrl} className="block p-4">
        <h3 className="text-lg font-semibold mb-1">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </Link>
    </div>
  );
} 