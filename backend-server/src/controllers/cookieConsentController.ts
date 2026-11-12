import { Request, Response } from 'express';
import { asyncHandler } from '../lib/asyncHandler';
import { hashClientIp, isCookieChoice } from '../lib/cookieConsent';
import { clientIp } from '../lib/rateLimit';
import { DEFAULT_COOKIE_NOTICE, getOrCreateSiteContact, serializeSiteSettings } from '../lib/siteSettings';
import CookieConsent from '../models/CookieConsent';

async function noticeText(): Promise<string> {
  try {
    const row = await getOrCreateSiteContact();
    return serializeSiteSettings(row).cookie_notice || DEFAULT_COOKIE_NOTICE;
  } catch {
    return DEFAULT_COOKIE_NOTICE;
  }
}

async function consentPayload(req: Request) {
  const ipHash = hashClientIp(clientIp(req));
  const row = await CookieConsent.findOne({ where: { ip_hash: ipHash } });
  const choice = row && isCookieChoice(row.choice) ? row.choice : null;
  return {
    decided: Boolean(choice),
    choice,
    notice: await noticeText(),
  };
}

export const getCookieConsent = asyncHandler(async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(await consentPayload(req));
});

export const saveCookieConsent = asyncHandler(async (req: Request, res: Response) => {
  const choice = (req.body || {}).choice;
  if (!isCookieChoice(choice)) {
    return res.status(400).json({ error: 'Choice must be all or necessary.' });
  }
  const ipHash = hashClientIp(clientIp(req));
  const existing = await CookieConsent.findOne({ where: { ip_hash: ipHash } });
  if (existing) {
    if (existing.choice !== choice) await existing.update({ choice });
  } else {
    try {
      await CookieConsent.create({ ip_hash: ipHash, choice });
    } catch {
      const again = await CookieConsent.findOne({ where: { ip_hash: ipHash } });
      if (again && again.choice !== choice) await again.update({ choice });
    }
  }
  res.setHeader('Cache-Control', 'private, no-store');
  res.json(await consentPayload(req));
});
