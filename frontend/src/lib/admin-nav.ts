export type AdminNavLink = {
  href: string;
  label: string;
  helpKey: string;
};

export type AdminNavSection = {
  id: 'catalog' | 'projects' | 'settings' | 'users';
  label: string;
  description?: string;
  helpKey: string;
  adminOnly?: boolean;
  links: AdminNavLink[];
  secondaryLinks?: AdminNavLink[];
};

export const ADMIN_NAV_SECTIONS: AdminNavSection[] = [
  {
    id: 'catalog',
    label: 'Catalog',
    description: 'Product Types → Series → Variants',
    helpKey: 'admin.nav.catalog',
    links: [
      { href: '/admin/product-types', label: 'Product Types', helpKey: 'admin.dash.link.types' },
      { href: '/admin/product-series', label: 'Product Series', helpKey: 'admin.dash.link.series' },
      { href: '/admin/variant-options', label: 'Variant', helpKey: 'admin.dash.link.variant_options' },
    ],
    secondaryLinks: [
      { href: '/admin/external-catalog', label: 'Partner catalog (LightX)', helpKey: 'admin.dash.link.lightx' },
      { href: '/admin/ldt-library', label: 'LDT library', helpKey: 'admin.dash.link.ldt' },
      { href: '/admin/ai', label: 'AI settings', helpKey: 'admin.dash.link.ai' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    helpKey: 'admin.nav.projects',
    links: [
      { href: '/admin/projects', label: 'Manage Projects', helpKey: 'admin.dash.link.projects' },
      { href: '/admin/inquiries', label: 'Contact inquiries', helpKey: 'admin.dash.link.inquiries' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Brand, homepage, contact, resources, and SEO.',
    helpKey: 'admin.nav.settings',
    links: [
      { href: '/admin/settings', label: 'Site settings', helpKey: 'admin.dash.link.settings' },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    description: 'Admin and staff logins',
    helpKey: 'admin.nav.users',
    adminOnly: true,
    links: [
      { href: '/admin/users', label: 'Manage users', helpKey: 'admin.users.open' },
    ],
  },
];

export function isAdminChromePath(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return false;
  return true;
}

export function visibleAdminNavSections(role: 'admin' | 'staff' | null): AdminNavSection[] {
  return ADMIN_NAV_SECTIONS.filter((section) => !section.adminOnly || role === 'admin');
}
