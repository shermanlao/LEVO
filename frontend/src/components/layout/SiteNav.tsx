'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchButton from '@/components/layout/SearchButton';
import MobileNav from '@/components/layout/MobileNav';
import AdminNavSectionBody from '@/components/admin/AdminNavSectionBody';
import HelpButton, { HelpLink } from '@/components/admin/HelpButton';
import Card from '@/components/ui/Card';
import { ADMIN_NAV_SECTIONS, isAdminChromePath, type AdminNavSection } from '@/lib/admin-nav';

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
        className="font-bold hover:text-gray-600 bg-transparent p-0 border-0 cursor-pointer"
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

export default function SiteNav() {
  const pathname = usePathname() || '';
  const isAdmin = isAdminChromePath(pathname);

  if (isAdmin) {
    return (
      <nav className="flex items-center" aria-label="Admin">
        <div className="hidden md:flex items-center space-x-8">
          <HelpLink helpKey="admin.nav.home" href="/" className="font-bold hover:text-gray-600">
            Home
          </HelpLink>
          {ADMIN_NAV_SECTIONS.map((section, index) => (
            <AdminNavDropdown key={section.id} section={section} alignEnd={index >= 2} />
          ))}
        </div>
        <div className="flex items-center md:hidden">
          <MobileNav variant="admin" sections={ADMIN_NAV_SECTIONS} />
        </div>
      </nav>
    );
  }

  return (
    <nav className="flex items-center" aria-label="Main">
      <div className="hidden md:flex items-center space-x-8">
        <Link href="/" className="font-bold hover:text-gray-600">
          Home
        </Link>
        <Link href="/products" className="font-bold hover:text-gray-600">
          Products
        </Link>
        <Link href="/projects" className="font-bold hover:text-gray-600">
          Projects
        </Link>
        <Link href="/contact" className="font-bold hover:text-gray-600">
          Contact Us
        </Link>
        <SearchButton />
      </div>
      <div className="flex items-center space-x-4 md:hidden">
        <SearchButton />
        <MobileNav />
      </div>
    </nav>
  );
}
