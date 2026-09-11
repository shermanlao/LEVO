import { Metadata } from 'next';
import NotFoundView, { DEFAULT_NOT_FOUND_LINKS } from '@/components/layout/NotFoundView';
import { getNotFoundCategoryLinks } from '@/lib/not-found-links';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = {
  ...buildPageMetadata({
    title: 'Page not found',
    description: 'This page is not on LEVO Lighting.',
    path: '/',
    noIndex: true,
  }),
};

export default async function NotFound() {
  const categories = await getNotFoundCategoryLinks();
  return <NotFoundView links={[...DEFAULT_NOT_FOUND_LINKS, ...categories]} />;
}
