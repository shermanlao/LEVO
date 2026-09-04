import { Router } from 'express';
import {
  deleteVariantOptionLabel,
  getVariantOptions,
  replaceVariantOptions,
  upsertVariantOptionLabel,
} from '../controllers/variantOptionController';

const router = Router();

router.get('/', getVariantOptions);
router.put('/', replaceVariantOptions);
router.put('/label', upsertVariantOptionLabel);
router.delete('/label', deleteVariantOptionLabel);

export default router;
