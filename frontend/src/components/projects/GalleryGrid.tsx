'use client';

import React, { useState, useEffect } from 'react';
import ImageLightbox from '@/components/ui/ImageLightbox';

interface GalleryGridProps {
  images: string[];
  title: string;
}

export default function GalleryGrid({ images, title }: GalleryGridProps) {
  const [imageOrientations, setImageOrientations] = useState<Record<number, 'portrait' | 'landscape' | null>>({});
  const [loading, setLoading] = useState(true);
  const [imagesLoaded, setImagesLoaded] = useState(0);

  // Function to check image orientation
  const checkImageOrientation = (src: string, index: number) => {
    const img = new Image();
    img.onload = () => {
      const isPortrait = img.height > img.width;
      setImageOrientations(prev => ({
        ...prev,
        [index]: isPortrait ? 'portrait' : 'landscape'
      }));
      setImagesLoaded(prev => prev + 1);
    };
    img.onerror = () => {
      setImageOrientations(prev => ({
        ...prev,
        [index]: null
      }));
      setImagesLoaded(prev => prev + 1);
    };
    img.src = src;
  };

  // Initialize image orientation detection
  useEffect(() => {
    setLoading(true);
    setImagesLoaded(0);
    images.forEach((src, index) => {
      checkImageOrientation(src, index);
    });
  }, [images]);

  // When all images are loaded, set loading to false
  useEffect(() => {
    if (imagesLoaded === images.length) {
      setLoading(false);
    }
  }, [imagesLoaded, images.length]);

  // Group portrait images in pairs
  const renderGalleryItems = () => {
    const items = [];
    let portraitPair = [];

    for (let i = 0; i < images.length; i++) {
      const orientation = imageOrientations[i];
      
      if (orientation === 'landscape' || orientation === null) {
        // First flush any pending portrait pair
        if (portraitPair.length > 0) {
          items.push(
            <div key={`portrait-pair-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full">
              {portraitPair.map((pIndex) => (
                <div key={pIndex} className="group">
                  <div className="relative h-[450px] overflow-hidden">
                    <ImageLightbox 
                      src={images[pIndex]} 
                      alt={`${title} - Gallery image ${pIndex + 2}`}
                      preserveAspectRatio={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
          portraitPair = [];
        }
        
        // Add landscape image as full width
        items.push(
          <div key={i} className="group mb-6 w-full">
            <div className="relative h-[450px] overflow-hidden">
              <ImageLightbox 
                src={images[i]} 
                alt={`${title} - Gallery image ${i + 2}`}
                preserveAspectRatio={true}
              />
            </div>
          </div>
        );
      } else if (orientation === 'portrait') {
        // It's a portrait image, add to pair
        portraitPair.push(i);
        
        // If we have a pair or this is the last image, render the pair
        if (portraitPair.length === 2 || i === images.length - 1) {
          items.push(
            <div key={`portrait-pair-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 w-full">
              {portraitPair.map((pIndex) => (
                <div key={pIndex} className="group">
                  <div className="relative h-[450px] overflow-hidden">
                    <ImageLightbox 
                      src={images[pIndex]} 
                      alt={`${title} - Gallery image ${pIndex + 2}`}
                      preserveAspectRatio={true}
                    />
                  </div>
                </div>
              ))}
            </div>
          );
          portraitPair = [];
        }
      }
    }

    return items;
  };

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex justify-center items-center h-40 w-full">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
        </div>
      ) : (
        renderGalleryItems()
      )}
    </div>
  );
} 