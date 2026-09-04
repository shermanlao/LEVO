import { Router } from 'express';
import { getGeneralLabel, getProductLabel } from '../controllers/labelController';

const router = Router();

router.get('/general', getGeneralLabel);
router.get('/:slug', getProductLabel);

export default router;
