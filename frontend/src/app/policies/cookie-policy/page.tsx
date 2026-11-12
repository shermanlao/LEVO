import type { Metadata } from 'next';
import { getSiteContact } from '@/lib/sqlite-api';
import PageRoute from '@/components/layout/PageRoute';
import { resourceRouteItems } from '@/components/layout/pageRouteItems';
import AlertBanner from '@/components/ui/AlertBanner';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 120;

const FALLBACK_TITLE = 'Cookie policy';
const PATH = '/policies/cookie-policy';

export async function generateMetadata(): Promise<Metadata> {
  try {
    const contact = await getSiteContact();
    const title = contact.cookie_policy_title?.trim() || FALLBACK_TITLE;
    const description = (contact.cookie_policy_body || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    return buildPageMetadata({
      title,
      description: description || 'How LEVO Lighting uses cookies.',
      path: PATH,
    });
  } catch {
    return buildPageMetadata({
      title: FALLBACK_TITLE,
      description: 'How LEVO Lighting uses cookies.',
      path: PATH,
    });
  }
}

export default async function CookiePolicyPage() {
  let title = FALLBACK_TITLE;
  let body = '';
  let loadError: string | null = null;

  try {
    const contact = await getSiteContact();
    title = contact.cookie_policy_title?.trim() || FALLBACK_TITLE;
    body = contact.cookie_policy_body?.trim() || '';
  } catch (error) {
    console.error('CookiePolicyPage - Failed to load site settings:', error);
    loadError = 'Could not load this page. Check that the API and database are available.';
  }

  return (
    <div className="max-w-5xl mx-auto">
      <PageRoute items={resourceRouteItems(title)} />
      <h1 className="text-4xl font-bold mb-6">{title}</h1>
      {loadError ? <AlertBanner>{loadError}</AlertBanner> : null}
      {body ? (
        <div className="bg-gray-50 p-8 rounded-lg">
          <p className="text-lg whitespace-pre-wrap">{body}</p>
        </div>
      ) : null}
    </div>
  );
}
