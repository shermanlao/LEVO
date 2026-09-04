import Link from 'next/link';
import { ReactNode } from 'react';
import RobustImage from '@/components/ui/robust-image';
import { IMAGE_FRAMES } from '@/lib/image-frames';

export default function CatalogCard({
  href,
  imageUrl,
  title,
  children,
  aspect = 'video',
  imageFit = 'cover',
  priority = false,
}: {
  href: string;
  imageUrl: string;
  title: string;
  children?: ReactNode;
  aspect?: 'video' | 'square';
  imageFit?: 'cover' | 'contain';
  priority?: boolean;
}) {
  const src = imageUrl || '/images/placeholder.jpg';
  return (
    <Link href={href} className="block group">
      <div className="bg-white rounded-lg shadow-md overflow-hidden transition-transform duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
        <div className={`relative ${aspect === 'square' ? IMAGE_FRAMES.product.className : IMAGE_FRAMES.catalog.className}`}>
          <RobustImage
            src={src}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            priority={priority}
            fallbackSrc="/images/placeholder.jpg"
            className={`${imageFit === 'contain' ? 'object-contain' : 'object-cover'} w-full h-full`}
          />
        </div>
        <div className={aspect === 'square' ? 'p-4' : 'p-6'}>
          <h2 className={`${aspect === 'square' ? 'text-lg' : 'text-xl'} font-semibold mb-2 group-hover:text-gray-700`}>
            {title}
          </h2>
          {children}
        </div>
      </div>
    </Link>
  );
}
