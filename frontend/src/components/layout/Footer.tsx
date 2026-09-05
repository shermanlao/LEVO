import type { ReactNode } from 'react';
import Link from 'next/link';
import type { SiteContact } from '@/lib/sqlite-api';
import { HelpLink } from '@/components/admin/HelpButton';
import BrandSlogan from '@/components/layout/BrandSlogan';
import { BrandLogoMark, LEVO_LOGO_SRC } from '@/components/layout/Logo';
import { safeHttpUrl } from '@/lib/safe-http-url';

const LINK_CLASS = 'hover:text-gray-600';
const ICON_CLASS = 'h-5 w-5';

function FacebookIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M14 9h3V6h-3c-2.2 0-4 1.8-4 4v2H8v3h2v7h3v-7h2.6l.4-3H13v-2c0-.6.4-1 1-1z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      <circle cx="12" cy="12" r="3.5" />
      <circle cx="17" cy="7" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ThreadsIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path
        strokeLinecap="round"
        d="M9.2 11.3c.4-2.6 2-4 4.4-4 2.6 0 4.1 1.5 4.1 4.2 0 3.6-1.6 6.5-4.6 6.5-1.7 0-2.9-1-3.3-2.6m3.6-1.6c2.6.4 4-1 4-2.5 0-2.4-3.3-2.8-4.6-.4-.3.5-.5 1.1-.6 1.8-.2 1.3.4 2.4 1.6 2.6 1.3.2 2.4-.6 2.6-1.7"
      />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={ICON_CLASS} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 3C7.6 3 4.5 6.2 4.5 10.5c0 3.1 1.8 5.7 4.5 6.7-.1-.6-.2-1.5 0-2.1.2-.7 1.3-5.4 1.3-5.4s-.3-.7-.3-1.6c0-1.5.9-2.7 2-2.7.9 0 1.4.7 1.4 1.5 0 .9-.6 2.3-.9 3.6-.3 1.1.5 1.9 1.6 1.9 1.9 0 3.2-2.4 3.2-5.3 0-2.2-1.5-3.8-4.2-3.8-3.1 0-5 2.3-5 4.8 0 .9.3 1.8.7 2.4.1.1.1.2.1.3l-.3 1c-.1.3-.2.4-.5.2-1.7-.7-2.5-2.6-2.5-4.7C5.3 6.7 8 4.2 12.1 4.2c3.3 0 5.8 2.4 5.8 5.6 0 3.8-2.1 6.7-5.2 6.7-1 0-2-.6-2.3-1.2l-.6 2.4c-.2.9-.9 2-1.3 2.7.9.3 1.9.4 2.9.4 4.4 0 8-3.6 8-8S16.4 3 12 3z" />
    </svg>
  );
}

type MediaLink = {
  href: string;
  label: string;
  helpKey: string;
  icon: ReactNode;
};

export default function Footer({ contact }: { contact: SiteContact | null }) {
  const companyName = contact?.company_name?.trim() || 'LEVO Lighting';
  const logoSrc = contact?.logo_header?.trim() || LEVO_LOGO_SRC;
  const media: MediaLink[] = [
    {
      href: contact?.social_facebook?.trim() || '',
      label: 'Facebook',
      helpKey: 'catalog.footer.facebook',
      icon: <FacebookIcon />,
    },
    {
      href: contact?.social_instagram?.trim() || '',
      label: 'Instagram',
      helpKey: 'catalog.footer.instagram',
      icon: <InstagramIcon />,
    },
    {
      href: contact?.social_threads?.trim() || '',
      label: 'Threads',
      helpKey: 'catalog.footer.threads',
      icon: <ThreadsIcon />,
    },
    {
      href: contact?.social_pinterest?.trim() || '',
      label: 'Pinterest',
      helpKey: 'catalog.footer.pinterest',
      icon: <PinterestIcon />,
    },
  ].filter((item) => item.href);

  const safeMedia = media
    .map((item) => ({ ...item, href: safeHttpUrl(item.href) || '' }))
    .filter((item) => item.href);

  return (
    <footer className="site-chrome border-t mt-16 py-8">
      <div className="container mx-auto px-4">
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-8${safeMedia.length ? ' lg:grid-cols-4' : ''}`}>
          <div>
            <h3 className="text-lg font-bold mb-4">Contact Us</h3>
            {contact ? (
              <>
                <p>Email: {contact.email}</p>
                <p>Phone: {contact.phone}</p>
              </>
            ) : (
              <p>Contact details are unavailable.</p>
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/products" className={LINK_CLASS}>
                  Products
                </Link>
              </li>
              <li>
                <Link href="/projects" className={LINK_CLASS}>
                  Projects
                </Link>
              </li>
              <li>
                <Link href="/contact" className={LINK_CLASS}>
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-4">Resources</h3>
            <ul className="space-y-2">
              <li>
                <HelpLink href="/warranty" helpKey="catalog.footer.warranty" className={LINK_CLASS}>
                  Warranty
                </HelpLink>
              </li>
              <li>
                <HelpLink href="/certifications" helpKey="catalog.footer.certifications" className={LINK_CLASS}>
                  Certifications
                </HelpLink>
              </li>
              <li>
                <HelpLink href="/technical" helpKey="catalog.footer.technical" className={LINK_CLASS}>
                  Technical Underneath
                </HelpLink>
              </li>
            </ul>
          </div>
          {safeMedia.length ? (
            <div>
              <h3 className="text-lg font-bold mb-4">Media</h3>
              <ul className="space-y-2">
                {safeMedia.map((item) => (
                  <li key={item.helpKey}>
                    <HelpLink
                      href={item.href}
                      helpKey={item.helpKey}
                      className={`${LINK_CLASS} inline-flex items-center`}
                      target="_blank"
                      rel="noreferrer"
                      ariaLabel={item.label}
                    >
                      {item.icon}
                    </HelpLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200 text-center">
          <div className="flex justify-center mb-3">
            <BrandLogoMark src={logoSrc} alt={companyName} width={120} height={36} className="h-7" />
          </div>
          <BrandSlogan slogan={contact?.slogan} className="mb-2" />
          <p>
            &copy; {new Date().getFullYear()} {companyName}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
