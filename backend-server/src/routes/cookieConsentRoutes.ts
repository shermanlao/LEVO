import { Router } from 'express';
import { getCookieConsent, saveCookieConsent } from '../controllers/cookieConsentController';
import { rateLimit } from '../lib/rateLimit';

const router = Router();

router.get('/', getCookieConsent);
router.post(
  '/',
  rateLimit({ windowMs: 60 * 60 * 1000, max: 20, name: 'cookie-consent' }),
  saveCookieConsent
);

export default router;
