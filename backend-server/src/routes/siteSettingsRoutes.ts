import { Router } from 'express';
import {
  deleteSiteAssetSlot,
  getSiteSettings,
  siteAssetUpload,
  updateSiteSettings,
  uploadSiteAsset,
} from '../controllers/siteSettingsController';

const router = Router();

router.get('/', getSiteSettings);
router.put('/', updateSiteSettings);
router.post('/logo', siteAssetUpload.single('file'), uploadSiteAsset);
router.delete('/logo', deleteSiteAssetSlot);

export default router;
