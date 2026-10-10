import CatalogCard from '@/components/ui/CatalogCard';

interface CategoryCardProps {
  id: number;
  slug: string;
  name: string;
  description: string;
  imageUrl: string;
  href?: string;
}

export default function CategoryCard({ slug, name, description, imageUrl, href }: CategoryCardProps) {
  return (
    <CatalogCard href={href || `/products/${slug}`} imageUrl={imageUrl} title={name}>
      <div className="text-gray-600">{description}</div>
    </CatalogCard>
  );
}
