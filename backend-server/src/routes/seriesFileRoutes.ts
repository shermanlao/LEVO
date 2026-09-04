import { Router } from 'express';
import { getSeriesDatasheet, getSeriesFamilyDatasheet, getSeriesInstallation, getSeriesLdt, getSeriesPolar } from '../controllers/seriesFileController';

const router = Router();

router.get('/:slug/family-datasheet', getSeriesFamilyDatasheet);
router.get('/:slug/installation', getSeriesInstallation);
router.get('/:slug/ldt', getSeriesLdt);
router.get('/:slug/polar', getSeriesPolar);
router.get('/:slug/datasheet', getSeriesDatasheet);

export default router;
