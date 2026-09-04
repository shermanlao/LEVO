import { Router } from 'express';
import { getHelpTips } from '../controllers/helpTipController';

const router = Router();
router.get('/', getHelpTips);
export default router;
