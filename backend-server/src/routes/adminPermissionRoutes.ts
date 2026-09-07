import { Router } from 'express';
import {
  listRolePages,
  resetRolePages,
  updateRolePages,
} from '../controllers/adminPermissionController';

const adminPermissionRoutes = Router();
adminPermissionRoutes.get('/', listRolePages);
adminPermissionRoutes.put('/', updateRolePages);
adminPermissionRoutes.post('/reset', resetRolePages);

export default adminPermissionRoutes;
