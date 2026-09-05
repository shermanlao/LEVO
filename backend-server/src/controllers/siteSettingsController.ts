import { Request, Response } from 'express';
import multer from 'multer';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { clientError, errorMessage } from '../lib/errors';
import {
  deleteSiteAsset,
  getOrCreateSiteContact,
  isSiteAssetSlot,
  parseWhyCards,
  serializeSiteSettings,
  siteAssetColumn,
  writeSiteAsset,
  type SiteAssetSlot,
} from '../lib/siteSettings';
import { safeHttpUrl, safePublicHref } from '../lib/shared/safe-href';
import { isAllowedImageBuffer } from '../lib/shared/image-magic';

const IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const siteAssetUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
      return;
    }
    cb(null, true);
  },
});

function optionalText(value: unknown): string | undefined {
  if (value === undefined) return undefined;
  return String(value ?? '').trim();
}

export const getSiteSettings = asyncHandler(async (_req: Request, res: Response) => {
  const row = await getOrCreateSiteContact();
  res.json({ data: serializeSiteSettings(row) });
});

export const updateSiteSettings = asyncHandler(async (req: Request, res: Response) => {
  const row = await getOrCreateSiteContact();
  const body = (req.body || {}) as Record<string, unknown>;
  const patch: Record<string, string | null> = {};

  const stringFields = [
    'heading',
    'intro',
    'email',
    'phone',
    'address',
    'hours',
    'website',
    'datasheet_disclaimer',
    'slogan',
    'company_name',
    'company_short_name',
    'hero_title',
    'hero_subtitle',
    'hero_cta_label',
    'hero_cta_href',
    'featured_heading',
    'featured_projects_heading',
    'why_heading',
    'social_linkedin',
    'social_instagram',
    'social_facebook',
    'social_threads',
    'social_pinterest',
    'resource_warranty_title',
    'resource_warranty_body',
    'resource_certifications_title',
    'resource_certifications_body',
    'resource_technical_title',
    'resource_technical_body',
    'seo_title',
    'seo_description',
  ] as const;

  const hrefFields = new Set([
    'website',
    'hero_cta_href',
    'social_linkedin',
    'social_instagram',
    'social_facebook',
    'social_threads',
    'social_pinterest',
  ]);

  for (const field of stringFields) {
    const next = optionalText(body[field]);
    if (next === undefined) continue;
    if (hrefFields.has(field)) {
      if (!next) {
        patch[field] = '';
        continue;
      }
      const safe = field === 'hero_cta_href' ? safePublicHref(next) : safeHttpUrl(next);
      if (!safe) {
        return res.status(400).json({ error: `Invalid URL for ${field}` });
      }
      patch[field] = safe;
      continue;
    }
    patch[field] = next;
  }

  if (body.why_cards !== undefined) {
    patch.why_cards = JSON.stringify(parseWhyCards(body.why_cards));
  }

  if (Object.keys(patch).length) {
    await row.update(patch);
  }
  const fresh = await getOrCreateSiteContact();
  res.json({ data: serializeSiteSettings(fresh) });
});

function slotFromRequest(req: Request): SiteAssetSlot | null {
  const raw = String(req.body?.slot || req.query.slot || '').trim();
  return isSiteAssetSlot(raw) ? raw : null;
}

export const uploadSiteAsset = async (req: Request, res: Response) => {
  try {
    const slot = slotFromRequest(req);
    if (!slot) {
      return res.status(400).json({ error: 'Choose a logo slot: header, pdf, icon, hero, or og.' });
    }
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file?.buffer?.length) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    if (!isAllowedImageBuffer(file.buffer)) {
      return res.status(400).json({ error: 'File is not a valid JPEG, PNG, WebP, or GIF image' });
    }
    const row = await getOrCreateSiteContact();
    const column = siteAssetColumn(slot);
    deleteSiteAsset(String(row.get(column) || ''), slot);
    const stored = writeSiteAsset(slot, file.buffer, file.mimetype);
    await row.update({ [column]: stored });
    res.json({ data: serializeSiteSettings(await getOrCreateSiteContact()) });
  } catch (error) {
    res.status(400).json({ error: errorMessage(error) });
  }
};

export const deleteSiteAssetSlot = async (req: Request, res: Response) => {
  try {
    const slot = slotFromRequest(req);
    if (!slot) {
      return res.status(400).json({ error: 'Choose a logo slot: header, pdf, icon, hero, or og.' });
    }
    const row = await getOrCreateSiteContact();
    if (!row) return notFound(res, 'Site settings');
    const column = siteAssetColumn(slot);
    deleteSiteAsset(String(row.get(column) || ''), slot);
    await row.update({ [column]: null });
    res.json({ data: serializeSiteSettings(await getOrCreateSiteContact()) });
  } catch (error) {
    res.status(500).json({ error: clientError(error) });
  }
};
