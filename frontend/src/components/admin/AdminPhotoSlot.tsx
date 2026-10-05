'use client';

import { useState, type ReactNode } from 'react';
import HelpButton from '@/components/admin/HelpButton';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { IMAGE_INTAKE_HINT } from '@/lib/image-file-intake';

type AdminPhotoSlotProps = {
  src?: string | null;
  alt?: string;
  /** Keep the square small (appearance rows). Size-pack cells fill their column. */
  compact?: boolean;
  className?: string;
  /** Override the default square frame, e.g. `aspect-video` for catalog thumbs. */
  frameClassName?: string;
  /** Width / height of the file. When set, the box matches the photo instead of a fixed frame. */
  aspectRatio?: number;
  emptyLabel?: string;
  /** When set, a filled photo opens this action instead of the enlarge lightbox. */
  onImageClick?: () => void;
  /** Tip for the clickable photo. Required with `onImageClick`. */
  helpKey?: string;
};

function HoverEnlarge({ src }: { src: string }) {
  return (
    <div className="pointer-events-none fixed left-1/2 top-1/2 z-[60] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded border border-gray-200 bg-white p-3 shadow-2xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="h-full w-full object-contain" />
    </div>
  );
}

/** Admin photo cell: hover shows a larger preview; click opens the lightbox. Pass `onImageClick` to open another dialog instead. Empty slots show drop / paste / choose. */
export default function AdminPhotoSlot({
  src,
  alt = '',
  compact = false,
  className = '',
  frameClassName = 'aspect-square',
  aspectRatio,
  emptyLabel = IMAGE_INTAKE_HINT,
  onImageClick,
  helpKey,
}: AdminPhotoSlotProps) {
  const fitted = typeof aspectRatio === 'number' && aspectRatio > 0;
  const [hover, setHover] = useState(false);
  const [enlarged, setEnlarged] = useState(false);
  return (
    <div
      className={`relative bg-gray-50 rounded ${fitted ? '' : frameClassName} ${
        compact ? 'w-36 sm:w-40 shrink-0' : 'w-full'
      } ${className}`.trim()}
      style={fitted ? { aspectRatio: String(aspectRatio) } : undefined}
      onMouseEnter={() => {
        if (!enlarged) setHover(true);
      }}
      onMouseLeave={() => setHover(false)}
    >
      <div className="absolute inset-0 overflow-hidden rounded bg-gray-50">
        {src ? (
          onImageClick && helpKey ? (
            <HelpButton
              helpKey={helpKey}
              aria-label={`Edit ${alt} with AI`}
              className="group relative h-full w-full cursor-pointer border-0 bg-transparent p-0"
              onClick={(event) => {
                event.stopPropagation();
                setHover(false);
                onImageClick();
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={alt}
                className="pointer-events-none absolute inset-0 h-full w-full object-contain"
              />
            </HelpButton>
          ) : (
            <ImageLightbox
              src={src}
              alt={alt}
              preserveAspectRatio
              unoptimized
              onOpenChange={(open) => {
                setEnlarged(open);
                if (open) setHover(false);
              }}
            />
          )
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-gray-400 text-center px-2">
            {emptyLabel}
          </div>
        )}
      </div>
      {src && hover && !enlarged && !onImageClick ? <HoverEnlarge src={src} /> : null}
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
