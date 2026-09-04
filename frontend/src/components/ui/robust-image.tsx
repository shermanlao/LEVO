'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { shouldSkipImageOptimize } from '@/lib/image-utils';

interface RobustImageProps {
  src: string;
  alt: string;
  fallbackSrc?: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function RobustImage({
  src,
  alt,
  fallbackSrc = '/images/products/general/placeholder-project.jpg',
  fill = false,
  width,
  height,
  className = '',
  priority = false,
  ...props
}: RobustImageProps & Omit<React.ComponentProps<typeof Image>, 'src' | 'alt' | 'fill' | 'width' | 'height' | 'className'>) {
  const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
  const [didFallback, setDidFallback] = useState(false);

  useEffect(() => {
    setImgSrc(src || fallbackSrc);
    setDidFallback(false);
  }, [src, fallbackSrc]);

  const handleError = () => {
    if (didFallback || imgSrc === fallbackSrc) return;
    if (process.env.NODE_ENV === 'development') {
      console.warn(`Image failed to load: ${src}. Using fallback image.`);
    }
    setDidFallback(true);
    setImgSrc(fallbackSrc);
  };

  const skipOptimize = shouldSkipImageOptimize(imgSrc);

  if (fill) {
    return (
      <Image
        src={imgSrc}
        alt={alt || 'Image'}
        fill
        className={className}
        onError={handleError}
        priority={priority}
        {...props}
        unoptimized={skipOptimize}
      />
    );
  }

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width || 800}
      height={height || 600}
      className={className}
      onError={handleError}
      priority={priority}
      {...props}
      unoptimized={skipOptimize}
    />
  );
} 