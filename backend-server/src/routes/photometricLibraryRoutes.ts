import { Router } from 'express';
import {
  downloadTemplate,
  getLibraryLdt,
  listTemplates,
  ldtUpload,
  postPolarImage,
  updateTemplate,
} from '../controllers/photometricLibraryController';

const router = Router();

router.get('/', listTemplates);
router.get('/ldt', getLibraryLdt);
router.post('/polar-image', postPolarImage);
router.get('/:id', downloadTemplate);
router.post('/:id', ldtUpload.single('file'), updateTemplate);

export default router;
