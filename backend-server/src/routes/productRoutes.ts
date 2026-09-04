import { Router } from 'express';
import {
  getAllProducts,
  getProductById,
  getProductBySlug,
  getProductByPath,
  getFeaturedProducts,
  getProductLdt,
  getProductLdtOptions,
  putProductLdtOptions,
  createProduct,
  updateProduct,
  deleteProduct
} from '../controllers/productController';

const router = Router();

router.get('/', getAllProducts);
router.get('/featured', getFeaturedProducts);
router.get('/by-slug/:slug', getProductBySlug);
router.get('/by-path/:type/:series/:slug', getProductByPath);
router.put('/:id/ldt-options', putProductLdtOptions);
router.get('/:id/ldt-options', getProductLdtOptions);
router.get('/:id/ldt', getProductLdt);
router.get('/:id', getProductById);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', deleteProduct);

export default router; 