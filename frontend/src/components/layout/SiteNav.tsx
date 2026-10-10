'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchButton from '@/components/layout/SearchButton';
import HeaderAuthButton from '@/components/layout/HeaderAuthButton';
import MobileNav from '@/components/layout/MobileNav';
import AdminNavSectionBody from '@/components/admin/AdminNavSectionBody';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import Card from '@/components/ui/Card';
import { isAdminChromePath, visibleAdminNavSections, type AdminNavSection } from '@/lib/admin-nav';
import type { PublicNavLink } from '@/lib/public-nav';
import { useAdminMe } from '@/lib/use-admin-me';

function AdminNavDropdown({
  section,
  alignEnd,
}: {
  section: AdminNavSection;
  alignEnd: boolean;
}) {
  return (
    <div className="relative group">
      <HelpButton
        helpKey={section.helpKey}
        type="button"
        className="inline-flex items-center leading-none font-bold hover:text-gray-600 bg-transparent p-0 border-0 cursor-pointer"
        aria-haspopup="true"
      >
        {section.label}
      </HelpButton>
      <div
        className={`invisible opacity-0 pointer-events-none absolute top-full z-50 pt-3 delay-150 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:delay-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:delay-0 ${
          alignEnd ? 'right-0' : 'left-0'
        }`}
      >
        <Card className="w-72 shadow-lg">
          <AdminNavSectionBody section={section} />
        </Card>
      </div>
    </div>
  );
}

const NAV_LABEL_CLASS = 'inline-flex items-center leading-none font-bold hover:text-gray-600';

const MENU_PANEL_CLASS =
  'invisible opacity-0 pointer-events-none absolute top-full left-0 z-50 pt-3 delay-150 group-hover:visible group-hover:opacity-100 group-hover:pointer-events-auto group-hover:delay-0 group-focus-within:visible group-focus-within:opacity-100 group-focus-within:pointer-events-auto group-focus-within:delay-0';

function NavHoverMenu({
  href,
  label,
  helpKey,
  items,
  itemHelpKey,
}: {
  href: string;
  label: string;
  helpKey: string;
  items: PublicNavLink[];
  itemHelpKey: string;
}) {
  if (items.length === 0) {
    return (
      <HelpLink helpKey={helpKey} href={href} className={NAV_LABEL_CLASS}>
        {label}
      </HelpLink>
    );
  }

  return (
    <div className="relative group">
      <HelpLink helpKey={helpKey} href={href} className={NAV_LABEL_CLASS} ariaHasPopup>
        {label}
      </HelpLink>
      <div className={MENU_PANEL_CLASS}>
        <div className="min-w-48 max-h-80 overflow-y-auto rounded-md bg-white py-1 shadow-lg">
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <HelpLink
                  helpKey={itemHelpKey}
                  href={item.href}
                  className="block px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
                >
                  {item.label}
                </HelpLink>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SiteNav({
  productCategories = [],
  projectCategories = [],
}: {
  productCategories?: PublicNavLink[];
  projectCategories?: PublicNavLink[];
}) {
  const pathname = usePathname() || '';
  const isAdmin = isAdminChromePath(pathname);
  const { me } = useAdminMe();
  const adminSections = visibleAdminNavSections(me?.role ?? null, me?.pages ?? null);

  if (isAdmin) {
    return (
      <nav className="flex items-center" aria-label="Admin">
        <div className="hidden md:flex items-center space-x-8">
          <HelpLink helpKey="admin.nav.home" href="/" className="inline-flex items-center leading-none font-bold hover:text-gray-600">
            Home
          </HelpLink>
          {adminSections.map((section, index) => (
            <AdminNavDropdown key={section.id} section={section} alignEnd={index >= 2} />
          ))}
          <HeaderAuthButton />
        </div>
        <div className="flex items-center gap-4 md:hidden">
          <HeaderAuthButton />
          <MobileNav variant="admin" sections={adminSections} />
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center" aria-label="Main">
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/" className={NAV_LABEL_CLASS}>
          Home
        </Link>
        <NavHoverMenu
          href="/products"
          label="Products"
          helpKey="catalog.nav.products"
          items={productCategories}
          itemHelpKey="catalog.nav.product_category"
        />
        <NavHoverMenu
          href="/projects"
          label="Projects"
          helpKey="catalog.nav.projects"
          items={projectCategories}
          itemHelpKey="catalog.nav.project_category"
        />
        <Link href="/contact" className={NAV_LABEL_CLASS}>
          Contact Us
        </Link>
        <SearchButton />
        <HeaderAuthButton />
      </div>
      <div className="flex items-center space-x-4 md:hidden">
        <SearchButton />
        <HeaderAuthButton />
        <MobileNav productCategories={productCategories} projectCategories={projectCategories} />
      </div>
    </nav>
  );
}
