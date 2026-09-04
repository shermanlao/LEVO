import CatalogCard from '@/components/ui/CatalogCard';

interface CategoryCardProps {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
}

export default function CategoryCard({ slug, name, description, imageUrl }: CategoryCardProps) {
  return (
    <CatalogCard href={`/products/${slug}`} imageUrl={imageUrl} title={name}>
      <div className="text-gray-600">{description}</div>
    </CatalogCard>
  );
}
