import type { Metadata } from 'next';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Search',
  description: 'Search the LEVO Lighting product catalog.',
  path: '/search',
  noIndex: true,
});

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
