'use client';

import { useState, type ReactNode } from 'react';
import ImageLightbox from '@/components/ui/ImageLightbox';

type AdminPhotoSlotProps = {
  src?: string | null;
  alt?: string;
  /** Keep the square small (appearance rows). Size-pack cells fill their column. */
  compact?: boolean;
  className?: string;
};

function HoverEnlarge({ src }: { src: string }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white p-3 shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-contain" />
    </div>
  );
}

/** Square admin photo cell: hover shows a larger preview; click opens the lightbox. */
export default function AdminPhotoSlot({
  src,
  alt = '',
  compact = false,
  className = '',
}: AdminPhotoSlotProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`relative aspect-square bg-gray-50 rounded ${
        compact ? 'w-36 sm:w-40 shrink-0' : 'w-full'
      } ${className}`.trim()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="absolute inset-0 overflow-hidden rounded bg-gray-50">
        {src ? (
          <ImageLightbox src={src} alt={alt} preserveAspectRatio unoptimized />
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400">No photo</div>
        )}
      </div>
      {src && hover ? <HoverEnlarge src={src} /> : null}
    </div>
  );
}

type AdminHoverPreviewProps = {
  src?: string | null;
  className?: string;
  children: ReactNode;
};

/** Wrap an existing admin image so hover shows an enlarged preview. */
export function AdminHoverPreview({ src, className = '', children }: AdminHoverPreviewProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`relative ${className}`.trim()}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
      {src && hover ? <HoverEnlarge src={src} /> : null}
    </div>
  );
}
