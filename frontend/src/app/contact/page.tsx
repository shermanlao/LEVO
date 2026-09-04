import { Metadata } from 'next';
import { getSiteContact } from '@/lib/sqlite-api';
import ContactForm from '@/components/layout/ContactForm';
import AlertBanner from '@/components/ui/AlertBanner';
import BrandSlogan from '@/components/layout/BrandSlogan';

export const revalidate = 120;

export async function generateMetadata(): Promise<Metadata> {
  try {
    const contact = await getSiteContact();
    const company = contact.company_name?.trim() || 'LEVO Lighting';
    const slogan = contact.slogan?.trim() || '';
    return {
      title: `Contact Us - ${company}`,
      description: slogan
        ? `Contact ${company} (${slogan}) for product inquiries, project support, and partnership questions.`
        : `Contact ${company} for product inquiries, project support, and partnership questions.`,
    };
  } catch {
    return {
      title: 'Contact Us - LEVO Lighting',
      description: 'Contact LEVO Lighting for product inquiries, project support, and partnership questions.',
    };
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

  return (
    <div className="max-w-5xl mx-auto">
      <section className="mb-12">
        <BrandSlogan slogan={contact?.slogan} className="brand-slogan-hero" />
        <h1 className="text-4xl font-bold mb-6">{contact?.heading || 'Contact Us'}</h1>
        {loadError && <AlertBanner>{loadError}</AlertBanner>}
        {contact && (
          <div className="bg-gray-50 p-8 rounded-lg">
            <p className="text-lg">{contact.intro}</p>
          </div>
        )}
      </section>

      <section className="mb-12">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
            {contact ? (
              <ul className="space-y-3 text-lg">
                <li>
                  <span className="font-semibold">Email: </span>
                  <a href={`mailto:${contact.email}`} className="hover:text-gray-600">
                    {contact.email}
                  </a>
                </li>
                <li>
                  <span className="font-semibold">Phone: </span>
                  <a href={`tel:${contact.phone}`} className="hover:text-gray-600">
                    {contact.phone}
                  </a>
                </li>
                <li>
                  <span className="font-semibold">Address: </span>
                  {contact.address}
                </li>
                <li>
                  <span className="font-semibold">Hours: </span>
                  {contact.hours}
                </li>
              </ul>
            ) : (
              <p className="text-lg text-gray-600">Contact details will appear here once the API is available.</p>
            )}
          </div>
          <div className="md:w-1/2">
            <h2 className="text-3xl font-bold mb-4">Send a message</h2>
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
