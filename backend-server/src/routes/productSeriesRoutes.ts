import { Router } from 'express';
import {
  getAllProductSeries,
  getFeaturedProductSeries,
  getProductSeriesById,
  getProductSeriesBySlug,
  createProductSeries,
  updateProductSeries,
  deleteProductSeries
} from '../controllers/productSeriesController';
import {
  deleteSeriesAppearancePhoto,
  listSeriesAppearancePhotos,
  upsertSeriesAppearancePhoto,
} from '../controllers/appearancePhotosController';

const router = Router();

router.get('/', getAllProductSeries);
router.get('/featured', getFeaturedProductSeries);
router.get('/by-slug/:slug', getProductSeriesBySlug);
router.get('/:id/appearance-photos', listSeriesAppearancePhotos);
router.put('/:id/appearance-photos', upsertSeriesAppearancePhoto);
router.delete('/:id/appearance-photos', deleteSeriesAppearancePhoto);
router.get('/:id', getProductSeriesById);
router.post('/', createProductSeries);
router.put('/:id', updateProductSeries);
router.delete('/:id', deleteProductSeries);

export default router; 