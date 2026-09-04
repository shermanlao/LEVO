import { Router } from 'express';
import { getProductDatasheet, getProductInstallation } from '../controllers/datasheetController';

const router = Router();

router.get('/:slug/installation', getProductInstallation);
router.get('/:slug', getProductDatasheet);

export default router;
