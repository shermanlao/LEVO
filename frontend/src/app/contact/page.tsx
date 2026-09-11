import { Metadata } from 'next';
import { Suspense } from 'react';
import { getSiteContact } from '@/lib/sqlite-api';
import ContactForm from '@/components/layout/ContactForm';
import AlertBanner from '@/components/ui/AlertBanner';
import BrandSlogan from '@/components/layout/BrandSlogan';
import { visibleContactFields } from '@/lib/site-contact-display';
import { safeHttpUrl } from '@/lib/safe-http-url';
import { buildPageMetadata } from '@/lib/seo';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const contact = await getSiteContact();
    const company = contact.company_name?.trim() || 'LEVO Lighting';
    const slogan = contact.slogan?.trim() || '';
    return buildPageMetadata({
      title: 'Contact Us',
      description: slogan
        ? `Contact ${company} (${slogan}) for product inquiries, project support, and partnership questions.`
        : `Contact ${company} for product inquiries, project support, and partnership questions.`,
      path: '/contact',
    });
  } catch {
    return buildPageMetadata({
      title: 'Contact Us',
      description: 'Contact LEVO Lighting for product inquiries, project support, and partnership questions.',
      path: '/contact',
    });
  }
}

export default async function ContactPage() {
  let contact = null;
  let loadError: string | null = null;

  try {
    contact = await getSiteContact();
  } catch (error) {
    console.error('ContactPage - Failed to load contact details:', error);
    loadError = 'Could not load contact details. Check that the API and database are available.';
  }

  const intro = contact?.intro?.trim() || '';
  const contactLines = visibleContactFields(contact).map((item) => ({
    ...item,
    href: item.key === 'website' ? safeHttpUrl(item.value) || '' : item.href,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <section className="mb-12">
        <BrandSlogan slogan={contact?.slogan} className="brand-slogan-hero" />
        <h1 className="text-4xl font-bold mb-6">{contact?.heading || 'Contact Us'}</h1>
        {loadError && <AlertBanner>{loadError}</AlertBanner>}
        {intro ? (
          <div className="bg-gray-50 p-8 rounded-lg">
            <p className="text-lg">{intro}</p>
          </div>
        ) : null}
      </section>

      <section className="mb-12">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
            {contactLines.length ? (
              <ul className="space-y-3 text-lg">
                {contactLines.map((item) => (
                  <li key={item.key}>
                    <span className="font-semibold">{item.label}: </span>
                    {item.href ? (
                      <a
                        href={item.href}
                        className="hover:text-gray-600"
                        {...(item.key === 'website' ? { target: '_blank', rel: 'noreferrer' } : {})}
                      >
                        {item.value}
                      </a>
                    ) : (
                      item.value
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-lg text-gray-600">
                {loadError
                  ? 'Contact details will appear here once the API is available.'
                  : 'Contact details will appear here when they are added.'}
              </p>
            )}
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Send a message</h2>
            <Suspense fallback={<p className="text-gray-600">Loading form…</p>}>
              <ContactForm />
            </Suspense>
          </div>
        </div>
      </section>
    </div>
  );
}
