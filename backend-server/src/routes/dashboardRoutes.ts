import { Router } from 'express';
import {
  getDashboardStats,
  getVisitorAnalysis,
  recordVisitorEvent,
} from '../controllers/dashboardController';
import { rateLimit } from '../lib/rateLimit';

export const visitorRoutes = Router();
visitorRoutes.get('/', getVisitorAnalysis);
visitorRoutes.post(
  '/',
  rateLimit({ windowMs: 60 * 1000, max: 80, name: 'visitor-hit' }),
  recordVisitorEvent
);

const dashboardRoutes = Router();
dashboardRoutes.get('/', getDashboardStats);

export default dashboardRoutes;
