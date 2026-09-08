import AdminRolePermission from '../models/AdminRolePermission';
import {
  ADMIN_ROLES,
  defaultPagesForRole,
  defaultRolePageMatrix,
  matrixWithNewDefaultPages,
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
  if (count === 0) {
    await saveRolePageMatrix(defaultRolePageMatrix());
    return;
  }
  const rows = await AdminRolePermission.findAll();
  const current = await loadRolePageMatrix();
  const next = matrixWithNewDefaultPages(
    current,
    rows.map((row) => row.page_key)
  );
  const changed = ADMIN_ROLES.some((role) => next[role].join(',') !== current[role].join(','));
  if (changed) await saveRolePageMatrix(next);
}

export function serializeRolePages(role: AdminRole, pages: AdminPageKey[]): AdminPageKey[] {
  return sanitizeRolePages(role, pages);
}
