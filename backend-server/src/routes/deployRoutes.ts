import { Router } from 'express';
import { getDeployStatus, postDeployAction } from '../controllers/deployController';
import { rateLimit } from '../lib/rateLimit';

const deployRoutes = Router();
deployRoutes.get('/', getDeployStatus);
deployRoutes.post(
  '/',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 12, name: 'deploy' }),
  postDeployAction
);

export default deployRoutes;
