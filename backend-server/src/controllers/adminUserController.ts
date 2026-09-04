import { Request, Response } from 'express';
import { Op } from 'sequelize';
import AdminUser, { AdminRole } from '../models/AdminUser';
import { asyncHandler, deleteSuccess, notFound } from '../lib/asyncHandler';
import { hashPassword, verifyPassword } from '../lib/adminPassword';

const USERNAME_RE = /^[a-zA-Z0-9_-]{2,32}$/;

function isRole(value: unknown): value is AdminRole {
  return value === 'admin' || value === 'staff';
}

export function serializeAdminUser(row: AdminUser) {
  const p = row.get({ plain: true }) as {
    id: number;
    username: string;
    role: AdminRole;
    active: boolean;
    created_at: Date | null;
    updated_at: Date | null;
  };
  return {
    id: p.id,
    username: p.username,
    role: p.role,
    active: Boolean(p.active),
    created_at: p.created_at,
    updated_at: p.updated_at,
  };
}

async function countActiveAdmins(excludeId?: number): Promise<number> {
  return AdminUser.count({
    where: {
      role: 'admin',
      active: true,
      ...(excludeId != null ? { id: { [Op.ne]: excludeId } } : {}),
    },
  });
}

function lastAdminError(res: Response) {
  return res.status(400).json({ error: 'Cannot remove or demote the last admin' });
}

export const verifyCredentials = asyncHandler(async (req: Request, res: Response) => {
  const username = String(req.body?.username ?? req.body?.id ?? '').trim();
  const password = String(req.body?.password ?? '');
  if (!username || !password) {
    return res.status(401).json({ error: 'Invalid ID or password' });
  }
  const user = await AdminUser.findOne({ where: { username } });
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid ID or password' });
  }
  res.json({ username: user.username, role: user.role });
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
  const password = String(req.body?.password ?? '');
  const role = req.body?.role;
  if (!USERNAME_RE.test(username)) {
    return res.status(400).json({ error: 'Username must be 2–32 letters, numbers, _ or -' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  if (!isRole(role)) {
    return res.status(400).json({ error: 'Role must be admin or staff' });
  }
  const existing = await AdminUser.findOne({ where: { username } });
  if (existing) {
    return res.status(409).json({ error: 'That ID is already in use' });
  }
  const user = await AdminUser.create({
    username,
    password_hash: hashPassword(password),
    role,
    active: true,
  });
  res.status(201).json({ data: serializeAdminUser(user) });
});

export const updateAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await AdminUser.findByPk(req.params.id);
  if (!user) return notFound(res, 'User');

  const patch: { role?: AdminRole; active?: boolean; password_hash?: string } = {};
  if (req.body?.role !== undefined) {
    if (!isRole(req.body.role)) {
      return res.status(400).json({ error: 'Role must be admin or staff' });
    }
    patch.role = req.body.role;
  }
  if (req.body?.active !== undefined) {
    patch.active = Boolean(req.body.active);
  }
  if (req.body?.password != null && String(req.body.password).length > 0) {
    const password = String(req.body.password);
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    patch.password_hash = hashPassword(password);
  }

  const nextRole = patch.role ?? user.role;
  const nextActive = patch.active !== undefined ? patch.active : user.active;
  const wasActiveAdmin = user.role === 'admin' && user.active;
  const staysActiveAdmin = nextRole === 'admin' && nextActive;
  if (wasActiveAdmin && !staysActiveAdmin) {
    const others = await countActiveAdmins(user.id);
    if (others < 1) return lastAdminError(res);
  }

  await user.update(patch);
  res.json({ data: serializeAdminUser(user) });
});

export const deleteAdminUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await AdminUser.findByPk(req.params.id);
  if (!user) return notFound(res, 'User');
  if (user.role === 'admin' && user.active) {
    const others = await countActiveAdmins(user.id);
    if (others < 1) return lastAdminError(res);
  }
  await user.destroy();
  deleteSuccess(res);
});
