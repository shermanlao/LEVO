import type { Metadata } from 'next';
import { getSiteContact } from '@/lib/sqlite-api';
import PageRoute from '@/components/layout/PageRoute';
import AlertBanner from '@/components/ui/AlertBanner';
import BrandSlogan from '@/components/layout/BrandSlogan';
import Button from '@/components/ui/Button';
import JsonLd from '@/components/layout/JsonLd';
import { buildPageMetadata, stripHtml } from '@/lib/seo';
import { breadcrumbJsonLd } from '@/lib/seo-jsonld';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const contact = await getSiteContact();
    const title = contact.about_title?.trim() || 'About Us';
    const description =
      stripHtml(contact.about_body) ||
      `Learn about ${contact.company_name?.trim() || 'LEVO Lighting'} and our architectural LED lighting.`;
    return buildPageMetadata({ title, description, path: '/about' });
  } catch {
    return buildPageMetadata({
      title: 'About Us',
      description: 'Learn about LEVO Lighting and our architectural LED lighting.',
      path: '/about',
    });
  }
}

export default async function AboutPage() {
  let contact = null;
  let loadError: string | null = null;

  try {
    contact = await getSiteContact();
  } catch (error) {
    console.error('AboutPage - Failed to load site settings:', error);
    loadError = 'Could not load this page. Check that the API and database are available.';
  }

  const title = contact?.about_title?.trim() || 'About Us';
  const body = contact?.about_body?.trim() || '';
  const slogan = contact?.slogan?.trim() || '';
  const company = contact?.company_name?.trim() || 'LEVO Lighting';

  return (
    <div className="max-w-5xl mx-auto">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: 'Home', path: '/' },
          { name: title, path: '/about' },
        ])}
      />
      <PageRoute
        items={[
          { label: 'Home', href: '/', helpKey: 'catalog.breadcrumb.home' },
          { label: title },
        ]}
      />
      {loadError ? <AlertBanner>{loadError}</AlertBanner> : null}
      <BrandSlogan slogan={slogan} className="mb-2" />
      <h1 className="text-4xl font-bold mb-6">{title}</h1>
      {body ? (
        <div className="bg-gray-50 p-6 rounded-lg whitespace-pre-line text-lg text-gray-800 mb-8">
          {body}
        </div>
      ) : null}
      <p className="text-gray-600 mb-6">
        Browse the {company} catalog or contact us for project support.
      </p>
      <div className="flex flex-wrap gap-3">
        <Button helpKey="catalog.about.products" href="/products">
          Explore Products
        </Button>
        <Button helpKey="catalog.about.contact" href="/contact" variant="secondary">
          Contact Us
        </Button>
      </div>
    </div>
  );
}
