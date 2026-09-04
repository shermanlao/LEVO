import { Router } from 'express';
import {
  getAllProductTypes,
  getProductTypeById,
  getProductTypeBySlug,
  createProductType,
  updateProductType,
  deleteProductType
} from '../controllers/productTypeController';

const router = Router();

router.get('/', getAllProductTypes);
router.get('/by-slug/:slug', getProductTypeBySlug);
router.get('/:id', getProductTypeById);
router.post('/', createProductType);
router.put('/:id', updateProductType);
router.delete('/:id', deleteProductType);

export default router; 