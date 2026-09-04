import CatalogCard from '@/components/ui/CatalogCard';

interface SeriesCardProps {
  id: number;
  name: string;
  slug: string;
  categorySlug: string;
  description: string;
  imageUrl: string;
  productCount: number;
}

export default function SeriesCard({
  name,
  slug,
  categorySlug,
  description,
  imageUrl,
  productCount,
}: SeriesCardProps) {
  return (
    <CatalogCard href={`/products/${categorySlug}/${slug}`} imageUrl={imageUrl} title={name}>
      {description ? <div className="text-gray-600 mb-3 line-clamp-2">{description}</div> : null}
      <div className="text-sm font-medium text-blue-600">
        {productCount} {productCount === 1 ? 'option' : 'options'}
      </div>
    </CatalogCard>
  );
}
