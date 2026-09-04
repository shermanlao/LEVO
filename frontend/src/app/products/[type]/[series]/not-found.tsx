import NotFoundView, { DEFAULT_NOT_FOUND_LINKS } from '@/components/layout/NotFoundView';
import { getNotFoundCategoryLinks } from '@/lib/not-found-links';

export default async function SeriesNotFound() {
  const categories = await getNotFoundCategoryLinks();
  return (
    <NotFoundView
      title="Series not found"
      description="This product series is not in the LEVO catalog. Browse all products or choose a category."
      links={[...DEFAULT_NOT_FOUND_LINKS, ...categories]}
    />
  );
}
