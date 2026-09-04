'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HelpLink } from '@/components/admin/HelpButton';
import type { AdminNavSection } from '@/lib/admin-nav';

export default function MobileNav({
  variant = 'public',
  sections = [],
}: {
  variant?: 'public' | 'admin';
  sections?: AdminNavSection[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (isOpen && !target.closest('#mobile-menu') && !target.closest('#menu-button')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="md:hidden">
      <button
        id="menu-button"
        className="text-black focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="w-8 h-8">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {isOpen && (
        <div id="mobile-menu" className="absolute top-16 right-0 left-0 z-50 bg-white shadow-lg">
          {variant === 'admin' ? (
            <div className="flex flex-col py-4">
              <HelpLink
                href="/"
                helpKey="admin.nav.home"
                className="py-3 px-6 font-bold hover:bg-gray-100"
              >
                Home
              </HelpLink>
              {sections.map((section) => (
                <div key={section.id} className="border-t border-gray-100">
                  <div className="py-3 px-6 font-bold">{section.label}</div>
                  {section.links.map((link) => (
                    <HelpLink
                      key={link.href}
                      href={link.href}
                      helpKey={link.helpKey}
                      className="block py-2 px-10 text-gray-800 hover:bg-gray-100"
                    >
                      {link.label}
                    </HelpLink>
                  ))}
                  {section.secondaryLinks?.map((link) => (
                    <HelpLink
                      key={link.href}
                      href={link.href}
                      helpKey={link.helpKey}
                      className="block py-2 px-10 text-gray-800 hover:bg-gray-100"
                    >
                      {link.label}
                    </HelpLink>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col py-4">
              <Link href="/" className="py-3 px-6 font-bold hover:bg-gray-100">
                Home
              </Link>
              <Link href="/products" className="py-3 px-6 font-bold hover:bg-gray-100">
                Products
              </Link>
              <Link href="/projects" className="py-3 px-6 font-bold hover:bg-gray-100">
                Projects
              </Link>
              <Link href="/contact" className="py-3 px-6 font-bold hover:bg-gray-100">
                Contact Us
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
