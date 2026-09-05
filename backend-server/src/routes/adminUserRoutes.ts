import { Router } from 'express';
import {
  checkSession,
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUser,
  verifyCredentials,
} from '../controllers/adminUserController';
import { rateLimit } from '../lib/rateLimit';

export const authRoutes = Router();
authRoutes.post('/verify', rateLimit({ windowMs: 15 * 60 * 1000, max: 12, name: 'auth-verify' }), verifyCredentials);
authRoutes.get('/session-check', checkSession);

const adminUserRoutes = Router();
adminUserRoutes.get('/', listAdminUsers);
adminUserRoutes.get('/:id', getAdminUser);
adminUserRoutes.post('/', createAdminUser);
adminUserRoutes.put('/:id', updateAdminUser);
adminUserRoutes.delete('/:id', deleteAdminUser);

export default adminUserRoutes;
