'use client';

import React, { useEffect, useMemo, useState } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import { collectProductGalleryImages } from '@/lib/image-utils';

interface ImageCarouselProps {
  product: any;
  compact?: boolean;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({ product, compact = false }) => {
  const images = useMemo(() => collectProductGalleryImages(product), [product]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const visibleImages = useMemo(
    () => images.filter((image) => !hiddenIds.has(image.id)),
    [images, hiddenIds]
  );
  const [selectedUrl, setSelectedUrl] = useState<string | null>(images[0]?.url ?? null);
  const [failed, setFailed] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const hideImage = (id: string) => {
    setHiddenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  useEffect(() => {
    setSelectedUrl((current) => {
      if (current && visibleImages.some((img) => img.url === current)) return current;
      return visibleImages[0]?.url ?? null;
    });
  }, [visibleImages]);

  useEffect(() => {
    setFailed(false);
  }, [selectedUrl]);

  useEffect(() => {
    if (!showZoom) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        setShowZoom(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [showZoom]);

  if (!product) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
        <span className="text-gray-500 text-center p-4">No product data available</span>
      </div>
    );
  }

  if (visibleImages.length === 0 || !selectedUrl) {
    return (
      <div className="w-full aspect-square bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
          <div className="text-xl font-bold text-gray-700 mb-3">{product?.attributes?.name}</div>
          <div className="text-sm text-gray-600">
            {product?.attributes?.wattage ? `${product.attributes.wattage}W LED` : 'LED lighting'}
          </div>
        </div>
      </div>
    );
  }

  const selected = visibleImages.find((img) => img.url === selectedUrl) || visibleImages[0];

  const thumbs = visibleImages.length > 1 ? (
    <div
      className={
        compact
          ? 'flex flex-row gap-2 overflow-x-auto'
          : 'flex flex-row sm:flex-col gap-2 overflow-x-auto sm:overflow-y-auto sm:max-h-[500px] w-full sm:w-auto order-2 sm:order-1 shrink-0'
      }
    >
      {visibleImages.map((image) => (
        <button
          key={image.id}
          type="button"
          onClick={() => setSelectedUrl(image.url)}
          className={`relative rounded ${
            compact ? 'w-12 h-12' : 'w-14 h-14 sm:w-16 sm:h-16'
          } ${
            selectedUrl === image.url
              ? 'border-2 border-blue-500 ring-2 ring-blue-200'
              : 'border border-gray-200 hover:border-gray-300'
          } overflow-hidden flex-shrink-0 bg-gray-100`}
        >
          <img
            src={image.url}
            alt={image.alt}
            loading="lazy"
            decoding="async"
            className="object-cover w-full h-full"
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) hideImage(image.id);
            }}
            onError={() => hideImage(image.id)}
          />
        </button>
      ))}
    </div>
  ) : null;

  return (
    <div
      className={
        compact
          ? 'flex flex-col gap-2 w-full min-w-0'
          : 'flex flex-col sm:flex-row gap-3 sm:gap-4 items-start w-full min-w-0'
      }
    >
      {!compact ? thumbs : null}

      <div
        className={
          compact
            ? 'relative w-full aspect-square bg-white rounded-lg overflow-hidden group border border-gray-200 self-start'
            : 'relative w-full max-w-[400px] min-w-0 self-start bg-white rounded-lg overflow-hidden group order-1 sm:order-2 aspect-[4/5]'
        }
      >
        <button
          type="button"
          onClick={() => setShowZoom(true)}
          className={compact ? 'w-full h-full cursor-zoom-in' : 'block w-full h-full cursor-zoom-in'}
          aria-label={`Zoom ${selected.alt}`}
        >
          <img
            src={selectedUrl}
            alt={selected.alt}
            className={
              compact
                ? 'object-contain object-top w-full h-full'
                : 'object-cover w-full h-full'
            }
            fetchPriority="high"
            decoding="async"
            ref={(img) => {
              if (img?.complete && img.naturalWidth === 0) setFailed(true);
            }}
            onLoad={() => setFailed(false)}
            onError={() => setFailed(true)}
          />
          {failed && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 pointer-events-none">
              <span className="text-gray-500 text-center p-4">
                No image available
                <span className="block text-sm text-red-500 mt-2">Error loading image</span>
              </span>
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-300">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white bg-opacity-80 rounded-full p-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m4-3H6" />
              </svg>
            </div>
          </div>
        </button>
      </div>

      {compact ? thumbs : null}

      {showZoom && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center px-4"
          style={{
            paddingTop: 'max(4.25rem, calc(env(safe-area-inset-top, 0px) + 3.25rem))',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          }}
          onClick={() => setShowZoom(false)}
        >
          <HelpButton
            helpKey="catalog.image.zoom_close"
            className="overlay-safe-close"
            aria-label="Close zoomed image"
            onClick={(event) => {
              event.stopPropagation();
              setShowZoom(false);
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </HelpButton>
          <div className="relative w-full max-w-4xl max-h-full" onClick={(event) => event.stopPropagation()}>
            <div className="bg-white w-full overflow-hidden rounded-lg shadow-2xl">
              <div className="relative w-full flex items-center justify-center max-h-[min(80dvh,calc(100dvh-6rem))]">
                <img
                  src={selectedUrl}
                  alt={`${product?.attributes?.name || 'Product'} product view - zoomed`}
                  className="object-contain max-w-full max-h-[min(80dvh,calc(100dvh-6rem))]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
