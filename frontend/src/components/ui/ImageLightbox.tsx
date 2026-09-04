'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { shouldSkipImageOptimize } from '@/lib/image-utils';

interface ImageLightboxProps {
  src: string;
  alt: string;
  preserveAspectRatio?: boolean;
  unoptimized?: boolean;
}

function shouldSkipOptimize(src: string, unoptimized?: boolean) {
  return Boolean(unoptimized) || shouldSkipImageOptimize(src);
}

export default function ImageLightbox({
  src,
  alt,
  preserveAspectRatio = false,
  unoptimized = false,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPanning, setIsPanning] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset zoom and position when lightbox is opened or closed
  useEffect(() => {
    setZoomLevel(1);
    setPosition({ x: 0, y: 0 });
  }, [isOpen]);

  // Handle ESC key press to close the lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle zoom with mouse wheel
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    setZoomLevel((prev) => Math.max(1, Math.min(3, prev + delta)));
  };

  // Handle mouse down for panning
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPanning(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  // Handle mouse move for panning
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && zoomLevel > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      setDragStart({ x: e.clientX, y: e.clientY });
    }
  };

  // Handle mouse up to end panning
  const handleMouseUp = () => {
    setIsPanning(false);
  };

  return (
    <>
      {/* Clickable thumbnail */}
      <div
        className="group relative cursor-pointer w-full h-full"
        onClick={() => setIsOpen(true)}
        aria-label={`Click to enlarge ${alt}`}
      >
        {shouldSkipOptimize(src, unoptimized) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className={`absolute inset-0 h-full w-full ${preserveAspectRatio ? 'object-contain' : 'object-cover'} transition-transform duration-300 group-hover:scale-105`}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            fill
            className={`${preserveAspectRatio ? 'object-contain' : 'object-cover'} transition-transform duration-500 group-hover:scale-105`}
          />
        )}
      </div>

      {/* Lightbox modal */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center"
          onClick={() => setIsOpen(false)}
        >
          {/* Close button */}
          <button 
            className="overlay-safe-close"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            aria-label="Close enlarged image"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Zoom controls */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-4 text-white z-10">
            <button 
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel((prev) => Math.max(1, prev - 0.5));
              }}
              disabled={zoomLevel <= 1}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button 
              className="p-2 bg-gray-800 rounded-full hover:bg-gray-700"
              onClick={(e) => {
                e.stopPropagation();
                setZoomLevel((prev) => Math.min(3, prev + 0.5));
              }}
              disabled={zoomLevel >= 3}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Image container */}
          <div 
            className="relative max-w-full max-h-full overflow-hidden"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={(e) => e.stopPropagation()}
            style={{ cursor: isPanning ? 'grabbing' : zoomLevel > 1 ? 'grab' : 'default' }}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
            <div
              className="transform transition-transform"
              style={{
                transform: `scale(${zoomLevel}) translate(${position.x / zoomLevel}px, ${position.y / zoomLevel}px)`,
              }}
            >
              {shouldSkipOptimize(src, unoptimized) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt={alt}
                  className="max-w-full max-h-[80vh] object-contain"
                  onLoad={() => setIsLoading(false)}
                />
              ) : (
                <Image
                  src={src}
                  alt={alt}
                  width={1200}
                  height={900}
                  className="max-w-full max-h-[80vh] object-contain"
                  onLoad={() => setIsLoading(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 