import { Router } from 'express';
import { streamProductMedia } from '../controllers/productMediaController';

const router = Router();
router.get('/:id/:field', streamProductMedia);
export default router;
