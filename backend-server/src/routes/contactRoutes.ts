import { Router } from 'express';
import { createContactInquiry, getSiteContact } from '../controllers/contactController';
import { rateLimit } from '../lib/rateLimit';

const router = Router();
router.get('/', getSiteContact);
router.post(
  '/inquiries',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 8, name: 'contact' }),
  createContactInquiry
);
export default router;
