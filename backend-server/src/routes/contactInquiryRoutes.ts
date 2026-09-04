import { Router } from 'express';
import { getContactInquiry, listContactInquiries } from '../controllers/contactController';

const router = Router();
router.get('/', listContactInquiries);
router.get('/:id', getContactInquiry);
export default router;
