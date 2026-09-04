import NotFoundView, { DEFAULT_NOT_FOUND_LINKS } from '@/components/layout/NotFoundView';
import { getNotFoundCategoryLinks } from '@/lib/not-found-links';

export default async function CategoryNotFound() {
  const categories = await getNotFoundCategoryLinks();
  return (
    <NotFoundView
      title="Category not found"
      description="This product category is not in the LEVO catalog. Browse all products or choose another category."
      links={[...DEFAULT_NOT_FOUND_LINKS, ...categories]}
    />
  );
}
