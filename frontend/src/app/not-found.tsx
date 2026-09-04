import { Metadata } from 'next';
import NotFoundView, { DEFAULT_NOT_FOUND_LINKS } from '@/components/layout/NotFoundView';
import { getNotFoundCategoryLinks } from '@/lib/not-found-links';

export const metadata: Metadata = {
  title: 'Page not found | LEVO Lighting',
  description: 'This page is not on LEVO Lighting.',
};

export default async function NotFound() {
  const categories = await getNotFoundCategoryLinks();
  return <NotFoundView links={[...DEFAULT_NOT_FOUND_LINKS, ...categories]} />;
}
