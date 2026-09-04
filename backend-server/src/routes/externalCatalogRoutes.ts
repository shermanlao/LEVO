import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  testSettings,
  searchProducts,
  importProducts,
  streamSearchPhoto,
} from '../controllers/externalCatalogController';

const router = Router();

router.get('/settings', getSettings);
router.put('/settings', updateSettings);
router.post('/settings/test', testSettings);
router.get('/products', searchProducts);
router.get('/photo/:id', streamSearchPhoto);
router.post('/import', importProducts);

export default router;
