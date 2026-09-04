import { Router } from 'express';
import {
  createAdminUser,
  deleteAdminUser,
  getAdminUser,
  listAdminUsers,
  updateAdminUser,
  verifyCredentials,
} from '../controllers/adminUserController';

export const authRoutes = Router();
authRoutes.post('/verify', verifyCredentials);

const adminUserRoutes = Router();
adminUserRoutes.get('/', listAdminUsers);
adminUserRoutes.get('/:id', getAdminUser);
adminUserRoutes.post('/', createAdminUser);
adminUserRoutes.put('/:id', updateAdminUser);
adminUserRoutes.delete('/:id', deleteAdminUser);

export default adminUserRoutes;
