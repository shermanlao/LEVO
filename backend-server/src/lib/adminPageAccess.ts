import AdminRolePermission from '../models/AdminRolePermission';
import {
  ADMIN_ROLES,
  defaultPagesForRole,
  defaultRolePageMatrix,
  sanitizeRolePageMatrix,
  sanitizeRolePages,
  type AdminPageKey,
  type AdminRole,
} from './shared/admin-roles';

export async function loadRolePageMatrix(): Promise<Record<AdminRole, AdminPageKey[]>> {
  const rows = await AdminRolePermission.findAll();
  if (rows.length === 0) return defaultRolePageMatrix();
  const raw: Record<string, AdminPageKey[]> = {
    system: [],
    admin: [],
    operation: [],
  };
  for (const row of rows) {
    if (!ADMIN_ROLES.includes(row.role)) continue;
    raw[row.role].push(row.page_key);
  }
  return sanitizeRolePageMatrix(raw);
}

export async function pagesForRole(role: AdminRole): Promise<AdminPageKey[]> {
  const matrix = await loadRolePageMatrix();
  return matrix[role] || defaultPagesForRole(role);
}

export async function saveRolePageMatrix(
  input: unknown
): Promise<Record<AdminRole, AdminPageKey[]>> {
  const matrix = sanitizeRolePageMatrix(input);
  await AdminRolePermission.destroy({ where: {} });
  const rows: { role: AdminRole; page_key: AdminPageKey }[] = [];
  for (const role of ADMIN_ROLES) {
    for (const page_key of matrix[role]) {
      rows.push({ role, page_key });
    }
  }
  if (rows.length) await AdminRolePermission.bulkCreate(rows);
  return matrix;
}

export async function ensureDefaultRolePages(): Promise<void> {
  const count = await AdminRolePermission.count();
  if (count > 0) return;
  await saveRolePageMatrix(defaultRolePageMatrix());
}

export function serializeRolePages(role: AdminRole, pages: AdminPageKey[]): AdminPageKey[] {
  return sanitizeRolePages(role, pages);
}
