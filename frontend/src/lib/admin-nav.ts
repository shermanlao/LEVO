import {
  defaultPagesForRole,
  roleCanOpenPage,
  type AdminPageKey,
  type AdminRole,
} from '@shared/admin-roles';

export type AdminNavLink = {
  href: string;
  label: string;
  helpKey: string;
  variant?: 'primary' | 'ghost';
  pageKey?: AdminPageKey;
};

export type AdminNavSection = {
  id: 'catalog' | 'projects' | 'settings' | 'ai' | 'users';
  label: string;
  description?: string;
  helpKey: string;
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
      { href: '/admin/product-types', label: 'Product Types', helpKey: 'admin.dash.link.types', pageKey: 'catalog' },
      { href: '/admin/product-series', label: 'Product Series', helpKey: 'admin.dash.link.series', pageKey: 'catalog' },
      { href: '/admin/variant-options', label: 'Variant', helpKey: 'admin.dash.link.variant_options', pageKey: 'catalog' },
    ],
    secondaryLinks: [
      { href: '/admin/external-catalog', label: 'Partner catalog (LightX)', helpKey: 'admin.dash.link.lightx', pageKey: 'lightx' },
      { href: '/admin/ldt-library', label: 'LDT library', helpKey: 'admin.dash.link.ldt', pageKey: 'ldt' },
    ],
  },
  {
    id: 'projects',
    label: 'Projects',
    helpKey: 'admin.nav.projects',
    links: [
      { href: '/admin/projects', label: 'Manage Projects', helpKey: 'admin.dash.link.projects', pageKey: 'projects' },
      { href: '/admin/inquiries', label: 'Contact inquiries', helpKey: 'admin.dash.link.inquiries', pageKey: 'inquiries' },
    ],
  },
  {
    id: 'settings',
    label: 'Settings',
    description: 'Brand, homepage, contact, resources, and SEO.',
    helpKey: 'admin.nav.settings',
    links: [
      { href: '/admin/settings', label: 'Site settings', helpKey: 'admin.dash.link.settings', pageKey: 'settings' },
    ],
  },
  {
    id: 'ai',
    label: 'AI',
    description: 'Keys, catalog photo style, and usage.',
    helpKey: 'admin.nav.ai',
    links: [
      {
        href: '/admin/ai',
        label: 'Open AI settings',
        helpKey: 'admin.dash.link.ai',
        variant: 'primary',
        pageKey: 'ai',
      },
    ],
  },
  {
    id: 'users',
    label: 'Users',
    description: 'System, admin, and operation logins',
    helpKey: 'admin.nav.users',
    links: [
      { href: '/admin/users', label: 'Manage users', helpKey: 'admin.users.open', pageKey: 'users' },
      { href: '/admin/users/access', label: 'Page access', helpKey: 'admin.users.access', pageKey: 'permissions' },
    ],
  },
];

export function isAdminChromePath(pathname: string): boolean {
  if (!pathname.startsWith('/admin')) return false;
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) return false;
  return true;
}

function linkVisible(link: AdminNavLink, role: AdminRole, pages: AdminPageKey[]): boolean {
  if (!link.pageKey) return true;
  return roleCanOpenPage(role, link.pageKey, pages);
}

export function visibleAdminNavSections(
  role: AdminRole | null,
  pages?: AdminPageKey[] | null
): AdminNavSection[] {
  if (!role) return [];
  const granted = pages && pages.length ? pages : defaultPagesForRole(role);
  return ADMIN_NAV_SECTIONS.map((section) => {
    const links = section.links.filter((link) => linkVisible(link, role, granted));
    const secondaryLinks = (section.secondaryLinks || []).filter((link) =>
      linkVisible(link, role, granted)
    );
    return { ...section, links, secondaryLinks };
  }).filter((section) => section.links.length > 0 || (section.secondaryLinks?.length || 0) > 0);
}
