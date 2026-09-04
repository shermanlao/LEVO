import { Request, Response } from 'express';
import SiteContact from '../models/SiteContact';
import ContactInquiry from '../models/ContactInquiry';
import { asyncHandler, notFound } from '../lib/asyncHandler';
import { setPublicListCache } from '../lib/publicCache';
import { serializeSiteSettings } from '../lib/siteSettings';

export const getSiteContact = asyncHandler(async (_req: Request, res: Response) => {
  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  if (!row) return notFound(res, 'Contact details');
  setPublicListCache(res);
  res.json({ data: serializeSiteSettings(row) });
});

export const createContactInquiry = asyncHandler(async (req: Request, res: Response) => {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim();
    const message = String(req.body?.message || '').trim();

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }
    if (name.length > 200 || email.length > 200 || message.length > 4000) {
      return res.status(400).json({ error: 'Please shorten the name, email, or message.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    const inquiry = await ContactInquiry.create({ name, email, message });
    res.status(201).json({ data: { id: inquiry.id } });
});

function serializeInquiry(row: ContactInquiry) {
  const p = row.get({ plain: true }) as {
    id: number;
    name: string;
    email: string;
    message: string;
    created_at: Date;
  };
  return {
    id: p.id,
    name: p.name,
    email: p.email,
    message: p.message,
    created_at: p.created_at,
  };
}

export const listContactInquiries = asyncHandler(async (_req: Request, res: Response) => {
  const rows = await ContactInquiry.findAll({ order: [['created_at', 'DESC'], ['id', 'DESC']] });
  res.json({ data: rows.map(serializeInquiry) });
});

export const getContactInquiry = asyncHandler(async (req: Request, res: Response) => {
  const inquiry = await ContactInquiry.findByPk(req.params.id);
  if (!inquiry) return notFound(res, 'Inquiry');
  res.json({ data: serializeInquiry(inquiry) });
});
