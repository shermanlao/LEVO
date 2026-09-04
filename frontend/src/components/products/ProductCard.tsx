import CatalogCard from '@/components/ui/CatalogCard';

interface ProductCardProps {
  id: number;
  name: string;
  slug: string;
  href?: string;
  categorySlug: string;
  seriesSlug: string;
  imageUrl: string;
  wattage: number;
  cct: string;
  beamAngle: string;
  priority?: boolean;
}

export default function ProductCard({
  name,
  slug,
  href,
  categorySlug,
  seriesSlug,
  imageUrl,
  wattage,
  cct,
  beamAngle,
  priority = false,
}: ProductCardProps) {
  return (
    <CatalogCard
      href={href || `/products/${categorySlug}/${seriesSlug}/${slug}`}
      imageUrl={imageUrl}
      title={name}
      aspect="square"
      imageFit="contain"
      priority={priority}
    >
      <div className="text-sm text-gray-600 space-y-1">
        <p>{wattage}W</p>
        <p>{cct}</p>
        <p>{beamAngle}°</p>
      </div>
    </CatalogCard>
  );
}
