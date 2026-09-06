import { Router } from 'express';
import {
  deleteProductPhotoStyle,
  deleteSizeDrawingStyle,
  getAiSettings,
  getAiUsage,
  sizeDrawingStyleUpload,
  testAiSettings,
  updateAiSettings,
  uploadProductPhotoStyle,
  uploadSizeDrawingStyle,
} from '../controllers/aiSettingsController';
import {
  postEditProductPhoto,
  postGenerateAppearancePhoto,
  postGenerateDatasheetLabel,
  postGenerateDescriptionPhrase,
  postGenerateSizeDrawing,
  postRefineSizeDrawing,
  postStylizeProductPhoto,
} from '../controllers/aiImageController';

const router = Router();

router.get('/settings', getAiSettings);
router.put('/settings', updateAiSettings);
router.post('/settings/test', testAiSettings);
router.get('/usage', getAiUsage);
router.post(
  '/size-drawing-style',
  sizeDrawingStyleUpload.single('file'),
  uploadSizeDrawingStyle
);
router.delete('/size-drawing-style', deleteSizeDrawingStyle);
router.post(
  '/product-photo-style',
  sizeDrawingStyleUpload.single('file'),
  uploadProductPhotoStyle
);
router.delete('/product-photo-style', deleteProductPhotoStyle);
router.post('/generate-size-drawing', postGenerateSizeDrawing);
router.post('/refine-size-drawing', postRefineSizeDrawing);
router.post('/generate-appearance-photo', postGenerateAppearancePhoto);
router.post('/edit-product-photo', postEditProductPhoto);
router.post('/stylize-product-photo', postStylizeProductPhoto);
router.post('/generate-datasheet-label', postGenerateDatasheetLabel);
router.post('/generate-description-phrase', postGenerateDescriptionPhrase);

export default router;
