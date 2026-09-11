import { Request, Response } from 'express';
import { Op } from 'sequelize';
import AdminUser, { AdminRole } from '../models/AdminUser';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { hashPassword, verifyPassword } from '../lib/adminPassword';
import { pagesForRole } from '../lib/adminPageAccess';
import {
  canManageUsers,
  isAdminRole,
  migrateStoredRole,
} from '../lib/shared/admin-roles';
import {
  USERNAME_RE,
  isValidEmail,
  normalizeEmail,
  normalizeOptionalText,
} from '../lib/adminUserFields';

export function serializeAdminUser(row: AdminUser) {
  const p = row.get({ plain: true }) as {
    id: number;
    username: string;
    email: string | null;
    full_name: string | null;
    tel: string | null;
    position: string | null;
    division: string | null;
    role: AdminRole;
    active: boolean;
    session_epoch?: number;
    created_at: Date | null;
    updated_at: Date | null;
  };
  return {
    id: p.id,
    username: p.username,
    email: p.email || '',
    full_name: p.full_name || '',
    tel: p.tel || '',
    position: p.position || '',
    division: p.division || '',
    role: migrateStoredRole(p.role),
    active: Boolean(p.active),
    session_epoch: Number(p.session_epoch) || 0,
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

async function countActiveUserManagers(excludeId?: number): Promise<number> {
  return AdminUser.count({
    where: {
      role: { [Op.in]: ['system', 'admin'] },
      active: true,
      ...(excludeId != null ? { id: { [Op.ne]: excludeId } } : {}),
    },
  });
}

function lastManagerError(res: Response) {
  return res.status(400).json({ error: 'Cannot remove or demote the last system or admin user' });
}

async function emailTaken(email: string, excludeId?: number): Promise<boolean> {
  const existing = await AdminUser.findOne({
    where: {
      email,
      ...(excludeId != null ? { id: { [Op.ne]: excludeId } } : {}),
    },
  });
  return Boolean(existing);
}

async function usernameTaken(username: string, excludeId?: number): Promise<boolean> {
  const existing = await AdminUser.findOne({
    where: {
      username,
      ...(excludeId != null ? { id: { [Op.ne]: excludeId } } : {}),
    },
  });
  return Boolean(existing);
}

export const verifyCredentials = asyncHandler(async (req: Request, res: Response) => {
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  if (!email || !password) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const user = await AdminUser.findOne({ where: { email } });
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  const role = migrateStoredRole(user.role);
  res.json({
    username: user.username,
    email: user.email,
    role,
    session_epoch: Number(user.session_epoch) || 0,
    pages: await pagesForRole(role),
  });
});

export const logoutSession = asyncHandler(async (req: Request, res: Response) => {
  const username = String(req.body?.username || req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Missing username' });
  const user = await AdminUser.findOne({ where: { username } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  await user.update({ session_epoch: (Number(user.session_epoch) || 0) + 1 });
  res.json({ ok: true, username: user.username });
});

export const checkSession = asyncHandler(async (req: Request, res: Response) => {
  const username = String(req.query.username || '').trim();
  if (!username) return res.status(400).json({ error: 'Missing username' });
  const user = await AdminUser.findOne({ where: { username } });
  if (!user) return res.status(404).json({ error: 'Not found' });
  const role = migrateStoredRole(user.role);
  res.json({
    username: user.username,
    role,
    active: Boolean(user.active),
    epoch: Number(user.session_epoch) || 0,
    pages: await pagesForRole(role),
  });
});

export const listAdminUsers = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await AdminUser.findAll({ order: [['id', 'ASC']] });
  res.json({ data: rows.map(serializeAdminUser) });
});

export const getAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await AdminUser.findByPk(req.params.id);
  if (!user) return notFound(res, 'User');
  res.json({ data: serializeAdminUser(user) });
});

export const createAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? '').trim();
  const email = normalizeEmail(req.body?.email);
  const password = String(req.body?.password ?? '');
  const role = req.body?.role;
  const full_name = normalizeOptionalText(req.body?.full_name);
  const tel = normalizeOptionalText(req.body?.tel);
  const position = normalizeOptionalText(req.body?.position);
  const division = normalizeOptionalText(req.body?.division);
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 2–32 letters, numbers, _ or -' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'A valid email is required' });
  }
  if (password.length < 10) {
    return res.status(400).json({ error: 'Password must be at least 10 characters' });
  }
  if (!isAdminRole(role)) {
    return res.status(400).json({ error: 'Role must be system, admin, or operation' });
  }
  if (await usernameTaken(username)) {
    return res.status(409).json({ error: 'That username is already in use' });
  }
  if (await emailTaken(email)) {
    return res.status(409).json({ error: 'That email is already in use' });
  }
  const user = await AdminUser.create({
    username,
    email,
    full_name,
    tel,
    position,
    division,
    password_hash: hashPassword(password),
    role,
    active: true,
  });
  res.status(201).json({ data: serializeAdminUser(user) });
});

export const updateAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await AdminUser.findByPk(req.params.id);
  if (!user) return notFound(res, 'User');

  const patch: {
    username?: string;
    email?: string;
    full_name?: string | null;
    tel?: string | null;
    position?: string | null;
    division?: string | null;
    role?: AdminRole;
    active?: boolean;
    password_hash?: string;
    session_epoch?: number;
  } = {};

  if (req.body?.username !== undefined) {
    const username = String(req.body.username).trim();
    if (!USERNAME_RE.test(username)) {
      return res.status(400).json({ error: 'Username must be 2–32 letters, numbers, _ or -' });
    }
    if (await usernameTaken(username, user.id)) {
      return res.status(409).json({ error: 'That username is already in use' });
    }
    patch.username = username;
  }
  if (req.body?.email !== undefined) {
    const email = normalizeEmail(req.body.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (await emailTaken(email, user.id)) {
      return res.status(409).json({ error: 'That email is already in use' });
    }
    patch.email = email;
  }
  if (req.body?.full_name !== undefined) {
    patch.full_name = normalizeOptionalText(req.body.full_name);
  }
  if (req.body?.tel !== undefined) {
    patch.tel = normalizeOptionalText(req.body.tel);
  }
  if (req.body?.position !== undefined) {
    patch.position = normalizeOptionalText(req.body.position);
  }
  if (req.body?.division !== undefined) {
    patch.division = normalizeOptionalText(req.body.division);
  }
  if (req.body?.role !== undefined) {
    if (!isAdminRole(req.body.role)) {
      return res.status(400).json({ error: 'Role must be system, admin, or operation' });
    }
    patch.role = req.body.role;
  }
  if (req.body?.active !== undefined) {
    patch.active = Boolean(req.body.active);
  }
  if (req.body?.password != null && String(req.body.password).length > 0) {
    const password = String(req.body.password);
    if (password.length < 10) {
      return res.status(400).json({ error: 'Password must be at least 10 characters' });
    }
    patch.password_hash = hashPassword(password);
  }

  const identityChanged =
    (patch.username !== undefined && patch.username !== user.username) ||
    (patch.email !== undefined && patch.email !== user.email);
  if (
    patch.role !== undefined ||
    patch.active !== undefined ||
    patch.password_hash ||
    identityChanged
  ) {
    patch.session_epoch = (Number(user.session_epoch) || 0) + 1;
  }

  const nextRole = patch.role ?? migrateStoredRole(user.role);
  const nextActive = patch.active !== undefined ? patch.active : user.active;
  const wasManager = canManageUsers(migrateStoredRole(user.role)) && user.active;
  const staysManager = canManageUsers(nextRole) && nextActive;
  if (wasManager && !staysManager) {
    const others = await countActiveUserManagers(user.id);
    if (others < 1) return lastManagerError(res);
  }

  await user.update(patch);
  res.json({ data: serializeAdminUser(user) });
});

export const deleteAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await AdminUser.findByPk(req.params.id);
  if (!user) return notFound(res, 'User');
  if (canManageUsers(migrateStoredRole(user.role)) && user.active) {
    const others = await countActiveUserManagers(user.id);
    if (others < 1) return lastManagerError(res);
  }
  await user.destroy();
  deleteSuccess(res);
});
