export const ADMIN_ROLES = ['system', 'admin', 'operation'] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_PAGE_KEYS = [
  'catalog',
  'lightx',
  'ldt',
  'projects',
  'inquiries',
  'settings',
  'ai',
  'users',
  'permissions',
] as const;

export type AdminPageKey = (typeof ADMIN_PAGE_KEYS)[number];

export const ADMIN_PAGES: { key: AdminPageKey; label: string }[] = [
  { key: 'catalog', label: 'Catalog' },
  { key: 'lightx', label: 'Partner catalog' },
  { key: 'ldt', label: 'LDT library' },
  { key: 'projects', label: 'Projects' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'settings', label: 'Settings' },
  { key: 'ai', label: 'AI' },
  { key: 'users', label: 'Users' },
  { key: 'permissions', label: 'Page access' },
];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  system: 'System',
  admin: 'Admin',
  operation: 'Operation',
};

export const ADMIN_ROLE_HINTS: Record<AdminRole, string> = {
  system: 'Full access. Users and page-access settings stay on.',
  admin: 'Most pages, including users and page access by default.',
  operation: 'Catalog and day-to-day work. No user or page-access management.',
};

/** Pages that cannot be turned off for a role. */
export const LOCKED_ROLE_PAGES: Partial<Record<AdminRole, readonly AdminPageKey[]>> = {
  system: ['users', 'permissions'],
};

/** Pages that cannot be turned on for a role. */
export const FORBIDDEN_ROLE_PAGES: Partial<Record<AdminRole, readonly AdminPageKey[]>> = {
  operation: ['users', 'permissions'],
};

const ALL_PAGES = [...ADMIN_PAGE_KEYS];

export const DEFAULT_ROLE_PAGES: Record<AdminRole, AdminPageKey[]> = {
  system: ALL_PAGES,
  admin: ALL_PAGES,
  operation: ['catalog', 'lightx', 'ldt', 'projects', 'inquiries', 'settings', 'ai'],
};

export function isAdminRole(value: unknown): value is AdminRole {
  return value === 'system' || value === 'admin' || value === 'operation';
}

export function isAdminPageKey(value: unknown): value is AdminPageKey {
  return typeof value === 'string' && (ADMIN_PAGE_KEYS as readonly string[]).includes(value);
}

/** Map leftover `staff` logins to operation. `admin` stays admin. */
export function migrateStoredRole(value: unknown): AdminRole {
  if (value === 'staff') return 'operation';
  if (isAdminRole(value)) return value;
  return 'operation';
}

export function normalizeAdminRole(value: unknown): AdminRole | null {
  if (value === 'staff') return 'operation';
  return isAdminRole(value) ? value : null;
}

export function canManageUsers(role: AdminRole | string | null | undefined): boolean {
  return role === 'system' || role === 'admin';
}

export function canManagePermissions(role: AdminRole | string | null | undefined): boolean {
  return role === 'system' || role === 'admin';
}

export function uniquePageKeys(values: unknown): AdminPageKey[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<AdminPageKey>();
  for (const value of values) {
    if (isAdminPageKey(value)) seen.add(value);
  }
  return ADMIN_PAGE_KEYS.filter((key) => seen.has(key));
}

export function sanitizeRolePages(role: AdminRole, values: unknown): AdminPageKey[] {
  const granted = new Set(uniquePageKeys(values));
  for (const key of LOCKED_ROLE_PAGES[role] || []) granted.add(key);
  for (const key of FORBIDDEN_ROLE_PAGES[role] || []) granted.delete(key);
  return ADMIN_PAGE_KEYS.filter((key) => granted.has(key));
}

export function defaultPagesForRole(role: AdminRole): AdminPageKey[] {
  return sanitizeRolePages(role, DEFAULT_ROLE_PAGES[role]);
}

export function roleCanOpenPage(
  role: AdminRole,
  page: AdminPageKey,
  granted: readonly AdminPageKey[] = DEFAULT_ROLE_PAGES[role]
): boolean {
  if ((FORBIDDEN_ROLE_PAGES[role] || []).includes(page)) return false;
  if ((LOCKED_ROLE_PAGES[role] || []).includes(page)) return true;
  return granted.includes(page);
}

export function pageKeyForAdminPath(pathname: string): AdminPageKey | null {
  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (path === '/admin' || path === '/admin/login' || path.startsWith('/admin/login/')) return null;
  if (path === '/admin/users/access' || path.startsWith('/admin/users/access/')) return 'permissions';
  if (path === '/admin/users' || path.startsWith('/admin/users/')) return 'users';
  if (path.startsWith('/admin/external-catalog')) return 'lightx';
  if (path.startsWith('/admin/ldt-library')) return 'ldt';
  if (path.startsWith('/admin/inquiries')) return 'inquiries';
  if (path.startsWith('/admin/projects')) return 'projects';
  if (path.startsWith('/admin/settings')) return 'settings';
  if (path.startsWith('/admin/ai')) return 'ai';
  if (
    path.startsWith('/admin/product-types') ||
    path.startsWith('/admin/product-series') ||
    path.startsWith('/admin/products') ||
    path.startsWith('/admin/variant-options')
  ) {
    return 'catalog';
  }
  return null;
}

export function pageKeyForBackendPath(suffix: string): AdminPageKey | null {
  const first = String(suffix || '').split('/').filter(Boolean)[0] || '';
  if (first === 'projects') return 'projects';
  if (
    first === 'products' ||
    first === 'product-types' ||
    first === 'product-series' ||
    first === 'variant-options' ||
    first === 'upload'
  ) {
    return 'catalog';
  }
  return null;
}

export function emptyRolePageMatrix(): Record<AdminRole, AdminPageKey[]> {
  return {
    system: [],
    admin: [],
    operation: [],
  };
}

export function defaultRolePageMatrix(): Record<AdminRole, AdminPageKey[]> {
  return {
    system: defaultPagesForRole('system'),
    admin: defaultPagesForRole('admin'),
    operation: defaultPagesForRole('operation'),
  };
}

export function sanitizeRolePageMatrix(
  input: unknown
): Record<AdminRole, AdminPageKey[]> {
  const next = defaultRolePageMatrix();
  if (!input || typeof input !== 'object') return next;
  const record = input as Record<string, unknown>;
  for (const role of ADMIN_ROLES) {
    if (record[role] !== undefined) {
      next[role] = sanitizeRolePages(role, record[role]);
    }
  }
  return next;
}
