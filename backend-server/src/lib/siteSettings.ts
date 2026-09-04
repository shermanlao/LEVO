import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { readFile } from 'fs/promises';
import path from 'path';
import { DataTypes } from 'sequelize';
import sequelize from '../database';
import SiteContact from '../models/SiteContact';
import { photometricPublicRoot } from './photometric/beamLibraryServer';

export const DEFAULT_COMPANY_NAME = 'LEVO Lighting';
export const DEFAULT_COMPANY_SHORT_NAME = 'LEVO';
export const DEFAULT_HERO_TITLE = 'Innovative Lighting Solutions for Modern Spaces';
export const DEFAULT_HERO_SUBTITLE =
  'Discover our range of energy-efficient, stylish lighting products designed for both residential and commercial applications.';
export const DEFAULT_HERO_CTA_LABEL = 'Explore Products';
export const DEFAULT_HERO_CTA_HREF = '/products';
export const DEFAULT_FEATURED_HEADING = 'Featured Products';
export const DEFAULT_FEATURED_PROJECTS_HEADING = 'Featured Projects';
export const DEFAULT_WHY_HEADING = 'Why Choose LEVO?';
export const DEFAULT_SEO_TITLE = 'LEVO Lighting';
export const DEFAULT_SEO_DESCRIPTION = 'Professional lighting solutions for every space';
export const DEFAULT_LOGO_HEADER = '/images/levo-logo-mark.png';
export const DEFAULT_HERO_IMAGE = '/hero-image.jpg';
export const DEFAULT_RESOURCE_WARRANTY_TITLE = 'Warranty';
export const DEFAULT_RESOURCE_WARRANTY_BODY =
  'LEVO Lighting products are covered by the warranty period printed on each datasheet (typically five years). Keep your invoice and product SKU when making a claim. Contact us if you need a warranty statement for a project.';
export const DEFAULT_RESOURCE_CERTIFICATIONS_TITLE = 'Certifications';
export const DEFAULT_RESOURCE_CERTIFICATIONS_BODY =
  'LEVO luminaires are designed to applicable IEC/EN safety and performance standards. Certificate marks appear on product datasheets. Contact us for copies of company or product certificates.';
export const DEFAULT_RESOURCE_TECHNICAL_TITLE = 'Technical Underneath';
export const DEFAULT_RESOURCE_TECHNICAL_BODY =
  'Technical documents for LEVO series — datasheets, installation guides, and photometric LDT files — are available on each series page. Use Family Datasheet for the full coding key, or open a SKU row for a specific combination.';

export const WHY_CARD_ICONS = ['energy', 'lifespan', 'design'] as const;
export type WhyCardIcon = (typeof WHY_CARD_ICONS)[number];

export type WhyCard = {
  title: string;
  body: string;
  icon: WhyCardIcon;
};

export const DEFAULT_WHY_CARDS: WhyCard[] = [
  {
    icon: 'energy',
    title: 'Energy Efficient',
    body: 'Our products are designed with sustainability in mind, reducing energy consumption without compromising on performance.',
  },
  {
    icon: 'lifespan',
    title: 'Long Lifespan',
    body: 'LEVO products are built to last, with high-quality materials and components that ensure years of reliable performance.',
  },
  {
    icon: 'design',
    title: 'Design Excellence',
    body: 'Our products combine aesthetic appeal with functional design, enhancing any space they illuminate.',
  },
];

export const SITE_SETTINGS_COLUMNS: Record<string, { type: typeof DataTypes.STRING | typeof DataTypes.TEXT }> = {
  company_name: { type: DataTypes.STRING },
  company_short_name: { type: DataTypes.STRING },
  logo_header: { type: DataTypes.STRING },
  logo_pdf: { type: DataTypes.STRING },
  logo_icon: { type: DataTypes.STRING },
  hero_title: { type: DataTypes.STRING },
  hero_subtitle: { type: DataTypes.TEXT },
  hero_cta_label: { type: DataTypes.STRING },
  hero_cta_href: { type: DataTypes.STRING },
  hero_image: { type: DataTypes.STRING },
  featured_heading: { type: DataTypes.STRING },
  featured_projects_heading: { type: DataTypes.STRING },
  why_heading: { type: DataTypes.STRING },
  why_cards: { type: DataTypes.TEXT },
  social_linkedin: { type: DataTypes.STRING },
  social_instagram: { type: DataTypes.STRING },
  social_facebook: { type: DataTypes.STRING },
  social_threads: { type: DataTypes.STRING },
  social_pinterest: { type: DataTypes.STRING },
  resource_warranty_title: { type: DataTypes.STRING },
  resource_warranty_body: { type: DataTypes.TEXT },
  resource_certifications_title: { type: DataTypes.STRING },
  resource_certifications_body: { type: DataTypes.TEXT },
  resource_technical_title: { type: DataTypes.STRING },
  resource_technical_body: { type: DataTypes.TEXT },
  seo_title: { type: DataTypes.STRING },
  seo_description: { type: DataTypes.TEXT },
  og_image: { type: DataTypes.STRING },
};

export const SITE_ASSET_SLOTS = ['header', 'pdf', 'icon', 'hero', 'og'] as const;
export type SiteAssetSlot = (typeof SITE_ASSET_SLOTS)[number];

const SLOT_COLUMN: Record<SiteAssetSlot, string> = {
  header: 'logo_header',
  pdf: 'logo_pdf',
  icon: 'logo_icon',
  hero: 'hero_image',
  og: 'og_image',
};

const SLOT_STEM: Record<SiteAssetSlot, string> = {
  header: 'logo-header',
  pdf: 'logo-pdf',
  icon: 'logo-icon',
  hero: 'hero',
  og: 'og',
};

const PUBLIC_PREFIX = '/images/site/';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export function isSiteAssetSlot(value: string): value is SiteAssetSlot {
  return (SITE_ASSET_SLOTS as readonly string[]).includes(value);
}

export function siteAssetColumn(slot: SiteAssetSlot): string {
  return SLOT_COLUMN[slot];
}

function isWhyIcon(value: string): value is WhyCardIcon {
  return (WHY_CARD_ICONS as readonly string[]).includes(value);
}

export function parseWhyCards(raw: unknown): WhyCard[] {
  let parsed: unknown = raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return DEFAULT_WHY_CARDS.map((card) => ({ ...card }));
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return DEFAULT_WHY_CARDS.map((card) => ({ ...card }));
    }
  }
  if (!Array.isArray(parsed)) return DEFAULT_WHY_CARDS.map((card) => ({ ...card }));
  const cards = parsed.slice(0, 3).map((item, index) => {
    const fallback = DEFAULT_WHY_CARDS[index] || DEFAULT_WHY_CARDS[0];
    const row = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
    const iconRaw = String(row.icon || fallback.icon);
    return {
      title: String(row.title || fallback.title).trim() || fallback.title,
      body: String(row.body || fallback.body).trim() || fallback.body,
      icon: isWhyIcon(iconRaw) ? iconRaw : fallback.icon,
    };
  });
  while (cards.length < 3) {
    cards.push({ ...DEFAULT_WHY_CARDS[cards.length] });
  }
  return cards;
}

function text(value: unknown, fallback = ''): string {
  const next = String(value ?? '').trim();
  return next || fallback;
}

export type SerializedSiteSettings = {
  heading: string;
  intro: string;
  email: string;
  phone: string;
  address: string;
  hours: string;
  website: string;
  datasheet_disclaimer: string;
  slogan: string;
  company_name: string;
  company_short_name: string;
  logo_header: string;
  logo_pdf: string;
  logo_icon: string;
  hero_title: string;
  hero_subtitle: string;
  hero_cta_label: string;
  hero_cta_href: string;
  hero_image: string;
  featured_heading: string;
  featured_projects_heading: string;
  why_heading: string;
  why_cards: WhyCard[];
  social_linkedin: string;
  social_instagram: string;
  social_facebook: string;
  social_threads: string;
  social_pinterest: string;
  resource_warranty_title: string;
  resource_warranty_body: string;
  resource_certifications_title: string;
  resource_certifications_body: string;
  resource_technical_title: string;
  resource_technical_body: string;
  seo_title: string;
  seo_description: string;
  og_image: string;
};

export function serializeSiteSettings(row: SiteContact): SerializedSiteSettings {
  const p = row.get({ plain: true }) as Record<string, unknown>;
  return {
    heading: text(p.heading, 'Contact Us'),
    intro: text(p.intro),
    email: text(p.email),
    phone: text(p.phone),
    address: text(p.address),
    hours: text(p.hours),
    website: text(p.website),
    datasheet_disclaimer: text(p.datasheet_disclaimer),
    slogan: text(p.slogan),
    company_name: text(p.company_name, DEFAULT_COMPANY_NAME),
    company_short_name: text(p.company_short_name, DEFAULT_COMPANY_SHORT_NAME),
    logo_header: text(p.logo_header),
    logo_pdf: text(p.logo_pdf),
    logo_icon: text(p.logo_icon),
    hero_title: text(p.hero_title, DEFAULT_HERO_TITLE),
    hero_subtitle: text(p.hero_subtitle, DEFAULT_HERO_SUBTITLE),
    hero_cta_label: text(p.hero_cta_label, DEFAULT_HERO_CTA_LABEL),
    hero_cta_href: text(p.hero_cta_href, DEFAULT_HERO_CTA_HREF),
    hero_image: text(p.hero_image),
    featured_heading: text(p.featured_heading, DEFAULT_FEATURED_HEADING),
    featured_projects_heading: text(p.featured_projects_heading, DEFAULT_FEATURED_PROJECTS_HEADING),
    why_heading: text(p.why_heading, DEFAULT_WHY_HEADING),
    why_cards: parseWhyCards(p.why_cards),
    social_linkedin: text(p.social_linkedin),
    social_instagram: text(p.social_instagram),
    social_facebook: text(p.social_facebook),
    social_threads: text(p.social_threads),
    social_pinterest: text(p.social_pinterest),
    resource_warranty_title: text(p.resource_warranty_title, DEFAULT_RESOURCE_WARRANTY_TITLE),
    resource_warranty_body: text(p.resource_warranty_body, DEFAULT_RESOURCE_WARRANTY_BODY),
    resource_certifications_title: text(p.resource_certifications_title, DEFAULT_RESOURCE_CERTIFICATIONS_TITLE),
    resource_certifications_body: text(p.resource_certifications_body, DEFAULT_RESOURCE_CERTIFICATIONS_BODY),
    resource_technical_title: text(p.resource_technical_title, DEFAULT_RESOURCE_TECHNICAL_TITLE),
    resource_technical_body: text(p.resource_technical_body, DEFAULT_RESOURCE_TECHNICAL_BODY),
    seo_title: text(p.seo_title, DEFAULT_SEO_TITLE),
    seo_description: text(p.seo_description, DEFAULT_SEO_DESCRIPTION),
    og_image: text(p.og_image),
  };
}

export async function getOrCreateSiteContact(): Promise<SiteContact> {
  const existing = await SiteContact.findOne({ order: [['id', 'ASC']] });
  if (existing) return existing;
  return SiteContact.create({
    heading: 'Contact Us',
    intro:
      'Reach LEVO Lighting for product questions, project support, or partnership inquiries. Our team will respond as soon as we can.',
    email: 'info@levo-lighting.com',
    phone: '+1 234 567 890',
    address: '123 Lighting Way, Suite 100',
    hours: 'Monday–Friday, 9:00–18:00',
    website: '',
    slogan: 'LIGHT EVOLUTION',
    company_name: DEFAULT_COMPANY_NAME,
    company_short_name: DEFAULT_COMPANY_SHORT_NAME,
    hero_title: DEFAULT_HERO_TITLE,
    hero_subtitle: DEFAULT_HERO_SUBTITLE,
    hero_cta_label: DEFAULT_HERO_CTA_LABEL,
    hero_cta_href: DEFAULT_HERO_CTA_HREF,
    featured_heading: DEFAULT_FEATURED_HEADING,
    featured_projects_heading: DEFAULT_FEATURED_PROJECTS_HEADING,
    why_heading: DEFAULT_WHY_HEADING,
    why_cards: JSON.stringify(DEFAULT_WHY_CARDS),
    resource_warranty_title: DEFAULT_RESOURCE_WARRANTY_TITLE,
    resource_warranty_body: DEFAULT_RESOURCE_WARRANTY_BODY,
    resource_certifications_title: DEFAULT_RESOURCE_CERTIFICATIONS_TITLE,
    resource_certifications_body: DEFAULT_RESOURCE_CERTIFICATIONS_BODY,
    resource_technical_title: DEFAULT_RESOURCE_TECHNICAL_TITLE,
    resource_technical_body: DEFAULT_RESOURCE_TECHNICAL_BODY,
    seo_title: DEFAULT_SEO_TITLE,
    seo_description: DEFAULT_SEO_DESCRIPTION,
  });
}

export async function loadSiteBrand(): Promise<{
  company_name: string;
  company_short_name: string;
  logo_header: string;
  logo_pdf: string;
}> {
  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  const p = (row?.get({ plain: true }) || {}) as Record<string, unknown>;
  return {
    company_name: text(p.company_name, DEFAULT_COMPANY_NAME),
    company_short_name: text(p.company_short_name, DEFAULT_COMPANY_SHORT_NAME),
    logo_header: text(p.logo_header),
    logo_pdf: text(p.logo_pdf),
  };
}

function siteDir(): string {
  return path.join(photometricPublicRoot(), 'images', 'site');
}

function isSafeStoredPath(stored: string, stem: string): boolean {
  const normalized = stored.trim();
  if (!normalized.startsWith(PUBLIC_PREFIX)) return false;
  if (normalized.includes('..') || normalized.includes('\\') || normalized.includes('\0')) return false;
  return path.posix.basename(normalized).startsWith(stem);
}

export function resolveSiteAssetOnDisk(stored: string | null | undefined, slot: SiteAssetSlot): string | null {
  const value = String(stored || '').trim();
  if (!isSafeStoredPath(value, SLOT_STEM[slot])) return null;
  const abs = path.join(photometricPublicRoot(), ...value.replace(/^\//, '').split('/'));
  return existsSync(abs) ? abs : null;
}

export function writeSiteAsset(slot: SiteAssetSlot, buffer: Buffer, mimeType: string): string {
  const ext = MIME_EXT[mimeType];
  if (!ext) throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
  const dir = siteDir();
  mkdirSync(dir, { recursive: true });
  const stem = SLOT_STEM[slot];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(stem)) unlinkSync(path.join(dir, name));
  }
  const filename = `${stem}${ext}`;
  writeFileSync(path.join(dir, filename), buffer);
  return `${PUBLIC_PREFIX}${filename}`;
}

export function deleteSiteAsset(stored: string | null | undefined, slot: SiteAssetSlot): void {
  const abs = resolveSiteAssetOnDisk(stored, slot);
  if (abs) unlinkSync(abs);
  const dir = siteDir();
  if (!existsSync(dir)) return;
  const stem = SLOT_STEM[slot];
  for (const name of readdirSync(dir)) {
    if (name.startsWith(stem)) unlinkSync(path.join(dir, name));
  }
}

function repoPublicFile(stored: string): string {
  const relative = stored.replace(/^\/+/, '').replace(/^public\//, '');
  return path.join(photometricPublicRoot(), ...relative.split('/'));
}

function isRasterImage(buffer: Buffer): boolean {
  const png =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const jpeg = buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
  return png || jpeg;
}

async function readPublicImage(stored: string): Promise<Buffer | null> {
  const value = String(stored || '').trim();
  if (!value || value.includes('..')) return null;
  try {
    const buffer = await readFile(repoPublicFile(value));
    return isRasterImage(buffer) ? buffer : null;
  } catch {
    return null;
  }
}

export async function loadBrandLogoBuffer(): Promise<Buffer | null> {
  const brand = await loadSiteBrand();
  return (
    (await readPublicImage(brand.logo_pdf)) ||
    (await readPublicImage(brand.logo_header)) ||
    (await readPublicImage(DEFAULT_LOGO_HEADER))
  );
}

export async function ensureSiteSettingsColumns(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('site_contacts');
  } catch {
    return;
  }
  for (const [name, spec] of Object.entries(SITE_SETTINGS_COLUMNS)) {
    if (!table[name]) {
      await qi.addColumn('site_contacts', name, { type: spec.type, allowNull: true });
    }
  }
}
