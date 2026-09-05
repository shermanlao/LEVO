import path from 'path';
import fs from 'fs/promises';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { Product, ProductSeries, ProductType, SiteContact } from '../models';
import { getActiveCatalogSource } from './lightxClient';
import { getOrFetchProductAsset } from './productMediaCache';
import { isRemoteHttpUrl, localProductImageCandidates, ProductImageField } from './productMedia';
import {
  collectSpecRows,
  DATASHEET_PHYSICAL_FIELDS,
  DATASHEET_TECHNICAL_FIELDS,
  INSTALLATION_FIELDS,
  datasheetFilename,
  familyDatasheetFilename,
  installationFilename,
  formatSpecValue,
  SpecField,
  SpecRow,
} from './productSpecs';
import { isAppearanceNa } from './shared/product-specs';
import { familyAppearancePhotoRows } from './shared/appearance-photos';
import {
  SIZE_KIND,
  composeDatasheetSku,
  familyColourGroups,
  familyOptionsForKind,
  familyOrderCodeSegments,
  familyPolarCombos,
  familyWattageRows,
  findSizePack,
  groupOptionsByKind,
  optionText,
  parseOptionNumber,
  selectionFromSpec,
  seriesPageHref,
  valuesEqual,
  visibleSelectorKinds,
  type FamilyColourGroup,
  type FamilySkuCodingColumn,
  type FamilyWattageRow,
  type SeriesOptionDto,
} from './shared/series-options';
import {
  datasheetLabelsFromEntity,
  datasheetLabelsForSeriesOptions,
  mergeScopedDatasheetLabels,
  type DatasheetLabel,
} from './shared/datasheet-labels';
import { loadAppearancePhotos, loadSeriesOptions } from './seriesConfig';
import { loadVariantCatalog } from './variantCatalog';
import { parseSpecs } from './strapiSerialize';
import { fillPhraseTemplate } from './shared/description-phrase';
import { finishSwatchColors } from './shared/spec-icons';
import QRCode from 'qrcode';
import { productToLdtStampWithSite } from './photometric/productToLdtStamp';
import {
  renderProductLibraryPolarPng,
  renderStampedLdtPolarPng,
  renderVariantLibraryPolarPng,
  stampedVariantLdtText,
} from './photometric/polarPng';
import { parseEulumdat } from './photometric/eulumdat';
import { photometricPolarPeak, sharedPolarScaleByGroup } from './photometric/renderPhotometricPolar';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPANY_SHORT_NAME,
  loadBrandLogoBuffer,
} from './siteSettings';

const BLACK = '#111111';
const MUTED = '#444444';
const STRIPE = '#F3F3F3';
const CHROME = '#E5E7EB';
const MARGIN = 36;
const HEADER_BOTTOM = 58;
const FOOTER_PAD_TOP = 8;
const QR_SIZE = 54;
const CONTENT_TOP = HEADER_BOTTOM + 26;
const A4_WIDTH = 595.28;
/** AFM CapHeight for Helvetica / Helvetica-Bold (units/em). Used to optically center table text. */
const HELVETICA_CAP_PER_EM = 718 / 1000;
const SPEC_TABLE_SIZE = 8;

type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  website: string;
  disclaimer: string;
  slogan: string;
  company_name: string;
  company_short_name: string;
};

function nestedName(value: unknown): string {
  if (!value || typeof value !== 'object') return '';
  return String((value as { name?: string }).name || '').trim();
}

function isJpeg(buffer: Buffer): boolean {
  return buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8;
}

function isPng(buffer: Buffer): boolean {
  return (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  );
}

function repoPublicFile(stored: string): string {
  const relative = stored.replace(/^\/+/, '').replace(/^public\//, '');
  return path.join(__dirname, '..', '..', '..', 'frontend', 'public', relative);
}

async function loadLevoLogo(): Promise<Buffer | null> {
  return loadBrandLogoBuffer();
}

async function loadProductAsset(
  product: Record<string, unknown>,
  field: ProductImageField
): Promise<Buffer | null> {
  const id = Number(product.id);
  const stored = String(product[field] || '').trim();
  if (!stored) return null;
  try {
    if (isRemoteHttpUrl(stored) && Number.isInteger(id) && id > 0) {
      const source = await getActiveCatalogSource();
      const asset = await getOrFetchProductAsset(source, id, field, stored);
      if (asset?.buffer && (isJpeg(asset.buffer) || isPng(asset.buffer))) return asset.buffer;
      return null;
    }
    const series = product.series as { slug?: string } | undefined;
    const candidates = localProductImageCandidates(stored, series?.slug);
    for (const candidate of candidates) {
      try {
        const buffer = await fs.readFile(repoPublicFile(candidate));
        if (isJpeg(buffer) || isPng(buffer)) return buffer;
      } catch {
        /* try next folder */
      }
    }
  } catch {
    return null;
  }
  return null;
}

async function loadContact(): Promise<ContactInfo> {
  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  const plain = row?.get({ plain: true }) as
    | {
        email?: string;
        phone?: string;
        address?: string;
        website?: string | null;
        datasheet_disclaimer?: string | null;
        slogan?: string | null;
        company_name?: string | null;
        company_short_name?: string | null;
      }
    | undefined;
  return {
    email: String(plain?.email || '').trim(),
    phone: String(plain?.phone || '').trim(),
    address: String(plain?.address || '').trim(),
    website: String(plain?.website || '').trim(),
    disclaimer: String(plain?.datasheet_disclaimer || '').trim(),
    slogan: String(plain?.slogan || '').trim(),
    company_name: String(plain?.company_name || '').trim() || DEFAULT_COMPANY_NAME,
    company_short_name: String(plain?.company_short_name || '').trim() || DEFAULT_COMPANY_SHORT_NAME,
  };
}

async function toPdfImage(buffer: Buffer): Promise<Buffer | null> {
  if (isJpeg(buffer) || isPng(buffer)) return buffer;
  try {
    return await sharp(buffer).png().toBuffer();
  } catch {
    return null;
  }
}

async function loadStoredImage(stored: string, seriesSlug?: string): Promise<Buffer | null> {
  const value = stored.trim();
  if (!value) return null;
  try {
    const paths = [...localProductImageCandidates(value, seriesSlug)];
    if (value.startsWith('/images/ai/') && !paths.includes(value)) paths.push(value);
    if (!paths.length) paths.push(value);
    for (const candidate of paths) {
      try {
        const buffer = await fs.readFile(repoPublicFile(candidate));
        const decoded = await toPdfImage(buffer);
        if (decoded) return decoded;
      } catch {
        /* try next folder */
      }
    }
  } catch {
    return null;
  }
  return null;
}

function publicSeriesName(seriesName: string, productName: string): string {
  if (!seriesName || /^lightx$/i.test(seriesName) || /unknown/i.test(seriesName)) {
    return productName;
  }
  return seriesName;
}

function ruleLine(doc: PDFKit.PDFDocument, y: number, width = 1.5) {
  doc.save();
  doc.moveTo(0, y).lineTo(doc.page.width, y).lineWidth(width).strokeColor(BLACK).stroke();
  doc.restore();
}

function fillChrome(doc: PDFKit.PDFDocument, y: number, height: number) {
  doc.save();
  doc.rect(0, y, doc.page.width, height).fill(CHROME);
  doc.restore();
}

function drawHeader(
  doc: PDFKit.PDFDocument,
  logo: Buffer | null,
  heading = 'Datasheet',
  shortName = DEFAULT_COMPANY_SHORT_NAME
) {
  fillChrome(doc, 0, HEADER_BOTTOM);
  const top = 16;
  if (logo) {
    try {
      doc.image(logo, MARGIN, top, { height: 22 });
    } catch {
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text(shortName, MARGIN, top + 2, {
        lineBreak: false,
      });
    }
  } else {
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text(shortName, MARGIN, top + 2, {
      lineBreak: false,
    });
  }
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(18).text(heading, MARGIN, top + 2, {
    width: doc.page.width - MARGIN * 2,
    align: 'right',
    lineBreak: false,
  });
  ruleLine(doc, HEADER_BOTTOM, 2.2);
}

function isLocalOrigin(value: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(value);
}

function normalizeOrigin(value: string): string {
  const raw = value.trim().replace(/\/$/, '');
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function publicSiteOrigin(contactWebsite: string): string {
  const site = normalizeOrigin(contactWebsite);
  const env = normalizeOrigin(process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '');
  if (site && !isLocalOrigin(site)) return site;
  if (env && !isLocalOrigin(env)) return env;
  return env || site || 'http://localhost:3000';
}

function catalogSlugs(product: Record<string, unknown>): { typeSlug: string; seriesSlug: string } | null {
  const series = product.series as { slug?: string; type?: { slug?: string } } | undefined;
  const type = product.type as { slug?: string } | undefined;
  const seriesSlug = optionText(series?.slug) || optionText(product.slug);
  const typeSlug = optionText(type?.slug) || optionText(series?.type?.slug);
  if (!seriesSlug || !typeSlug) return null;
  return { typeSlug, seriesSlug };
}

async function seriesGroupedForProduct(
  product: Record<string, unknown>
): Promise<Record<string, SeriesOptionDto[]> | undefined> {
  const seriesId = Number((product.series as { id?: number } | undefined)?.id || product.series_id);
  if (!Number.isInteger(seriesId) || seriesId <= 0) return undefined;
  return groupOptionsByKind(await loadSeriesOptions(seriesId));
}

async function catalogPageSelection(product: Record<string, unknown>): Promise<Record<string, string>> {
  const full = selectionFromSpec(product);
  const grouped = await seriesGroupedForProduct(product);
  if (!grouped) return full;
  const visible = visibleSelectorKinds(grouped);
  if (visible.length === 0) return full;
  const selection: Record<string, string> = {};
  for (const field of visible) {
    const raw = full[field.key];
    if (!raw) continue;
    const hit = (grouped[field.key] || []).find((option) => valuesEqual(field.key, option.value, raw));
    selection[field.key] = hit ? hit.value : raw;
  }
  return selection;
}

async function catalogPageUrl(product: Record<string, unknown>, origin: string): Promise<string | null> {
  const slugs = catalogSlugs(product);
  if (!slugs) return null;
  const selection = await catalogPageSelection(product);
  return `${origin}${seriesPageHref(slugs.typeSlug, slugs.seriesSlug, selection, { preview: '1' })}`;
}

async function renderQrPng(url: string): Promise<Buffer | null> {
  try {
    return await QRCode.toBuffer(url, {
      type: 'png',
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: BLACK, light: '#FFFFFF' },
    });
  } catch (error) {
    console.warn('Datasheet QR generation failed:', error);
    return null;
  }
}

function footerContactLines(contact: ContactInfo): string[] {
  const left: string[] = [];
  const brand = contact.slogan ? `${contact.company_name} | ${contact.slogan}` : contact.company_name;
  if (contact.address) left.push(`${brand} | ${contact.address}`);
  else left.push(brand);
  const contactBits = [contact.website, contact.email, contact.phone].filter(Boolean);
  if (contactBits.length) left.push(contactBits.join(' | '));
  left.push(`Ver ${new Date().getFullYear()}`);
  return left;
}

function footerTextWidth(pageWidth: number, hasQr: boolean): number {
  return pageWidth - MARGIN * 2 - (hasQr ? QR_SIZE + 10 : 0);
}

function footerContentHeight(doc: PDFKit.PDFDocument, contact: ContactInfo, textW: number): number {
  doc.save();
  try {
    doc.font('Helvetica').fontSize(7);
    let height = doc.heightOfString(footerContactLines(contact).join('\n'), {
      width: textW,
      lineGap: 1.2,
    });
    if (contact.disclaimer) {
      doc.fontSize(5.5);
      height += 3 + doc.heightOfString(contact.disclaimer, { width: textW, lineGap: 1.1 });
    }
    return height;
  } finally {
    doc.restore();
  }
}

function footerReserve(contact: ContactInfo, hasQr: boolean, pageWidth = A4_WIDTH): number {
  const scratch = new PDFDocument({ size: 'A4', autoFirstPage: true, margin: 0 });
  scratch.on('data', () => undefined);
  try {
    const contentH = Math.max(
      hasQr ? QR_SIZE : 0,
      footerContentHeight(scratch, contact, footerTextWidth(pageWidth, hasQr))
    );
    return FOOTER_PAD_TOP + contentH + MARGIN;
  } finally {
    scratch.end();
  }
}

function drawFooter(
  doc: PDFKit.PDFDocument,
  contact: ContactInfo,
  qr?: { png: Buffer; url: string } | null,
  bandHeight?: number
) {
  const hasQr = Boolean(qr);
  const footerTop = bandHeight || footerReserve(contact, hasQr, doc.page.width);
  const lineY = doc.page.height - footerTop;
  fillChrome(doc, lineY, footerTop);
  ruleLine(doc, lineY, 1.75);
  const y = lineY + FOOTER_PAD_TOP;
  const textW = footerTextWidth(doc.page.width, hasQr);
  const contactText = footerContactLines(contact).join('\n');

  doc.fillColor(BLACK).font('Helvetica').fontSize(7);
  doc.text(contactText, MARGIN, y, { width: textW, lineGap: 1.2 });
  const contactBottom = doc.y;
  if (contact.disclaimer) {
    doc.fillColor(MUTED).fontSize(5.5).text(contact.disclaimer, MARGIN, contactBottom + 3, {
      width: textW,
      lineGap: 1.1,
      height: Math.max(0, doc.page.height - contactBottom - MARGIN),
    });
  }
  if (qr) {
    const qx = doc.page.width - MARGIN - QR_SIZE;
    const qy = lineY + FOOTER_PAD_TOP;
    doc.save();
    doc.rect(qx, qy, QR_SIZE, QR_SIZE).fill('#ffffff');
    try {
      doc.image(qr.png, qx, qy, { width: QR_SIZE, height: QR_SIZE });
    } catch {
      /* skip undecodable QR */
    }
    doc.link(qx, qy, QR_SIZE, QR_SIZE, qr.url);
    doc.restore();
  }
}

function withUnconstrainedPage(doc: PDFKit.PDFDocument, paint: () => void) {
  const margins = doc.page.margins;
  const saved = {
    top: margins.top,
    left: margins.left,
    bottom: margins.bottom,
    right: margins.right,
  };
  const x = doc.x;
  const y = doc.y;
  margins.top = 0;
  margins.left = 0;
  margins.bottom = 0;
  margins.right = 0;
  try {
    paint();
  } finally {
    margins.top = saved.top;
    margins.left = saved.left;
    margins.bottom = saved.bottom;
    margins.right = saved.right;
    doc.x = x;
    doc.y = y;
  }
}

function paintPageChrome(
  doc: PDFKit.PDFDocument,
  logo: Buffer | null,
  contact: ContactInfo,
  heading: string,
  qr?: { png: Buffer; url: string } | null,
  footerTop?: number
) {
  withUnconstrainedPage(doc, () => {
    drawHeader(doc, logo, heading, contact.company_short_name);
    drawFooter(doc, contact, qr, footerTop);
  });
}

function createLevoPdf(options: {
  title: string;
  logo: Buffer | null;
  contact: ContactInfo;
  heading?: string;
  qr?: { png: Buffer; url: string } | null;
}): PDFKit.PDFDocument {
  const heading = options.heading || 'Datasheet';
  const footerTop = footerReserve(options.contact, Boolean(options.qr));
  const doc = new PDFDocument({
    size: 'A4',
    autoFirstPage: false,
    bufferPages: true,
    margins: {
      top: CONTENT_TOP,
      bottom: footerTop,
      left: MARGIN,
      right: MARGIN,
    },
    info: {
      Title: options.title,
      Author: options.contact.company_name,
      Creator: options.contact.company_name,
    },
  });
  doc.on('pageAdded', () => {
    paintPageChrome(doc, options.logo, options.contact, heading, options.qr, footerTop);
  });
  doc.addPage();
  return doc;
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function drawImageBox(
  doc: PDFKit.PDFDocument,
  image: Buffer | null,
  x: number,
  y: number,
  size: number,
  valign: 'center' | 'top' = 'center'
) {
  if (!image) return;
  doc.save();
  try {
    doc.image(image, x, y, {
      fit: [size, size],
      align: 'center',
      ...(valign === 'top' ? {} : { valign: 'center' as const }),
    });
  } catch {
    /* skip undecodable images */
  }
  doc.restore();
}

type MixedPart = { text: string; accent?: boolean };

function introParts(product: Record<string, unknown>, category: string): MixedPart[] {
  const description = String(product.description || '').trim();
  if (description) return [{ text: description }];

  const parts: MixedPart[] = [];
  const push = (text: string, accent = false) => {
    if (!text) return;
    parts.push({ text, accent });
  };
  const wattage = formatSpecValue(product.wattage, 'W');
  const cct = formatSpecValue(product.cct);
  const beam = formatSpecValue(product.beam_angle, '°');
  const ip = formatSpecValue(product.ip_rating);
  const lumen = formatSpecValue(product.lumen, 'lm');
  const typeLabel = category && category !== '—' ? category.toLowerCase() : 'luminaire';

  push(`LED ${typeLabel}`);
  if (wattage) {
    push(' with ');
    push(wattage, true);
    push(' connected load');
  }
  if (cct) {
    push(', ');
    push(cct, true);
    push(' CCT');
  }
  if (beam) {
    push(', ');
    push(beam, true);
    push(' beam');
  }
  if (ip) {
    push(', ');
    push(ip, true);
    push(' ingress protection');
  }
  if (lumen) {
    push(', ');
    push(lumen, true);
    push(' source lumen');
  }
  push('.');
  return parts.length ? parts : [{ text: 'LED luminaire.' }];
}

function drawIntro(doc: PDFKit.PDFDocument, parts: MixedPart[], x: number, y: number, width: number): number {
  doc.font('Helvetica').fontSize(8);
  let cursorX = x;
  let cursorY = y;
  const lineHeight = 11;
  const maxX = x + width;

  const write = (text: string, _accent: boolean) => {
    const words = text.split(/(\s+)/);
    for (const word of words) {
      if (!word) continue;
      const w = doc.widthOfString(word);
      if (cursorX + w > maxX && word.trim()) {
        cursorX = x;
        cursorY += lineHeight;
      }
      doc.fillColor(BLACK).text(word, cursorX, cursorY, { lineBreak: false });
      cursorX += w;
    }
  };

  for (const part of parts) write(part.text, Boolean(part.accent));
  return cursorY + lineHeight + 16;
}

function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
  if (y + needed < doc.page.maxY()) return y;
  doc.addPage();
  return doc.y;
}

function specTopFits(doc: PDFKit.PDFDocument, y: number, needed: number): boolean {
  return y + needed < doc.page.maxY();
}

function specInkHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  options?: { align?: 'left' | 'right' | 'center' }
): number {
  const lineH = doc.currentLineHeight(true);
  const blockH = doc.heightOfString(text, { width, ...options });
  const lines = Math.max(1, Math.round(blockH / Math.max(lineH, 0.01)));
  return (lines - 1) * lineH + HELVETICA_CAP_PER_EM * SPEC_TABLE_SIZE;
}

function specTextTop(cellTop: number, rowH: number, inkH: number): number {
  return cellTop + (rowH - inkH) / 2;
}

function drawSpecTable(
  doc: PDFKit.PDFDocument,
  title: string,
  rows: SpecRow[],
  x: number,
  y: number,
  width: number
): number {
  y = ensureSpace(doc, y, 28);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text(title.toUpperCase(), x, y, { width });
  y += 18;
  if (!rows.length) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text('—', x, y, { width });
    return y + 14;
  }
  const minRowH = 14;
  const padY = 3;
  const labelW = width * 0.48;
  const valueW = width - labelW - 4;
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    doc.font('Helvetica-Bold').fontSize(SPEC_TABLE_SIZE);
    const valueInk = specInkHeight(doc, row.value, valueW, { align: 'right' });
    doc.font('Helvetica').fontSize(SPEC_TABLE_SIZE);
    const labelInk = specInkHeight(doc, row.label, labelW - 6);
    const rowH = Math.max(minRowH, Math.max(valueInk, labelInk) + padY * 2);
    y = ensureSpace(doc, y, rowH);
    const cellTop = y;
    if (i % 2 === 1) {
      doc.save();
      doc.rect(x, cellTop, width, rowH).fill(STRIPE);
      doc.restore();
    }
    const labelY = specTextTop(cellTop, rowH, labelInk);
    const valueY = specTextTop(cellTop, rowH, valueInk);
    doc.fillColor(BLACK).font('Helvetica').fontSize(SPEC_TABLE_SIZE).text(row.label, x + 4, labelY, {
      width: labelW - 6,
    });
    doc.fillColor(BLACK).font('Helvetica-Bold').text(row.value, x + labelW, valueY, {
      width: valueW,
      align: 'right',
    });
    y += rowH;
  }
  return y + 18;
}

function codingOptionLine(option: { code: string; description: string }): string {
  const description = option.description.trim();
  if (!description || description.toLowerCase() === option.code.toLowerCase()) return option.code;
  // NBSP around the hyphen so PDFKit does not wrap "WH - White" after the dash.
  return `${option.code}\u00A0-\u00A0${description}`;
}

function columnShowsOptionList(column: FamilySkuCodingColumn): boolean {
  if (column.options.length !== 1) return true;
  const option = column.options[0];
  const description = option.description.trim();
  return Boolean(description && description.toLowerCase() !== option.code.toLowerCase());
}

function codingListLines(column: FamilySkuCodingColumn): string[] {
  return columnShowsOptionList(column) ? column.options.map(codingOptionLine) : [];
}

function codingColumnWidth(doc: PDFKit.PDFDocument, column: FamilySkuCodingColumn, padX: number): number {
  const lines = codingListLines(column);
  const subcols = lines.length > 5 ? 2 : 1;
  doc.font('Helvetica').fontSize(6.5);
  let contentW = doc.widthOfString(column.label);
  if (column.options.length === 1) {
    doc.font('Helvetica').fontSize(8);
    contentW = Math.max(contentW, doc.widthOfString(column.options[0].code));
  }
  doc.font('Helvetica').fontSize(7);
  if (subcols === 1) {
    for (const line of lines) contentW = Math.max(contentW, doc.widthOfString(line));
  } else {
    const per = Math.ceil(lines.length / 2);
    let leftW = 0;
    let rightW = 0;
    for (const line of lines.slice(0, per)) leftW = Math.max(leftW, doc.widthOfString(line));
    for (const line of lines.slice(per)) rightW = Math.max(rightW, doc.widthOfString(line));
    contentW = Math.max(contentW, leftW + 8 + rightW);
  }
  return Math.max(28, Math.ceil(contentW) + padX * 2 + 2);
}

function packCodingRowsByWidth(
  widths: number[],
  innerW: number,
  hyphenW: number
): Array<{ start: number; end: number }> {
  const rows: Array<{ start: number; end: number }> = [];
  let start = 0;
  let used = 0;
  for (let i = 0; i < widths.length; i += 1) {
    const extra = i === start ? widths[i] : hyphenW + widths[i];
    if (i > start && used + extra > innerW) {
      rows.push({ start, end: i });
      start = i;
      used = widths[i];
      continue;
    }
    used += extra;
  }
  if (start < widths.length) rows.push({ start, end: widths.length });
  return rows;
}

function codingListHeight(
  doc: PDFKit.PDFDocument,
  column: FamilySkuCodingColumn,
  width: number,
  fontSize: number,
  padX: number
): number {
  const lines = codingListLines(column);
  if (!lines.length) return 0;
  const subcols = lines.length > 5 ? 2 : 1;
  const inner = Math.max(24, width - padX * 2);
  const subW = subcols === 1 ? inner : (inner - 8) / 2;
  const per = Math.ceil(lines.length / subcols);
  doc.font('Helvetica').fontSize(fontSize);
  let maxH = 0;
  for (let s = 0; s < subcols; s += 1) {
    const chunk = lines.slice(s * per, s * per + per);
    let h = 0;
    for (const line of chunk) {
      h += doc.heightOfString(line, { width: Math.max(24, subW), lineBreak: false }) + 1.5;
    }
    maxH = Math.max(maxH, h);
  }
  return maxH;
}

function drawFamilySkuCoding(
  doc: PDFKit.PDFDocument,
  columns: FamilySkuCodingColumn[],
  y: number
): number {
  if (!columns.length) return y;
  const innerW = doc.page.width - MARGIN * 2;
  const padX = 7;
  const hyphenW = 14;
  const headerH = 12;
  const barH = 16;
  const listGap = 6;
  const fontSize = 7;
  const widths = columns.map((column) => Math.min(innerW, codingColumnWidth(doc, column, padX)));
  const rows = packCodingRowsByWidth(widths, innerW, hyphenW);

  const first = rows[0];
  const firstListH = first
    ? Math.max(
        0,
        ...columns.slice(first.start, first.end).map((column, index) =>
          codingListHeight(doc, column, widths[first.start + index], fontSize, padX)
        )
      )
    : 0;
  const titleH = 20;
  const firstRowH = headerH + barH + listGap + firstListH;
  y = ensureSpace(doc, y, titleH + firstRowH + 6);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('SKU CODING', MARGIN, y, { width: innerW });
  y = doc.y + 8;

  function drawCodingHyphen(x: number, barY: number) {
    doc.font('Helvetica').fontSize(10);
    const hyphenH = doc.heightOfString('-', { width: hyphenW, lineBreak: false });
    doc.fillColor(BLACK).text('-', x, barY + (barH - hyphenH) / 2, {
      width: hyphenW,
      align: 'center',
      lineBreak: false,
    });
  }

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const range = rows[rowIndex];
    const continues = rowIndex < rows.length - 1;
    const row = columns.slice(range.start, range.end);
    const rowWidths = widths.slice(range.start, range.end);
    const listHeights = row.map((column, index) =>
      codingListHeight(doc, column, rowWidths[index], fontSize, padX)
    );
    const rowH = headerH + barH + listGap + Math.max(0, ...listHeights);
    y = ensureSpace(doc, y, rowH + 6);

    const barY = y + headerH;
    const listY = barY + barH + listGap;
    let x = MARGIN;
    for (let i = 0; i < row.length; i += 1) {
      const column = row[i];
      const width = rowWidths[i];
      if (i > 0) {
        drawCodingHyphen(x, barY);
        x += hyphenW;
      }
      doc.fillColor(MUTED).font('Helvetica').fontSize(6.5).text(column.label, x + padX, y, {
        width: Math.max(24, width - padX * 2),
        lineBreak: false,
      });
      doc.save();
      doc.rect(x, barY, width, barH).fill(CHROME);
      doc.restore();
      if (column.options.length === 1) {
        const innerBar = Math.max(24, width - padX * 2);
        const codeSize = 8;
        const codeInk = HELVETICA_CAP_PER_EM * codeSize;
        doc.font('Helvetica').fontSize(codeSize);
        doc.fillColor(BLACK).text(column.options[0].code, x + padX, barY + (barH - codeInk) / 2, {
          width: innerBar,
          lineBreak: false,
        });
      }
      const lines = codingListLines(column);
      const subcols = lines.length > 5 ? 2 : 1;
      const inner = Math.max(24, width - padX * 2);
      const subW = subcols === 1 ? inner : (inner - 8) / 2;
      const per = Math.ceil(lines.length / subcols) || 1;
      for (let s = 0; s < subcols; s += 1) {
        const chunk = lines.slice(s * per, s * per + per);
        let ly = listY;
        const lx = x + padX + s * (subW + 8);
        for (const line of chunk) {
          doc.font('Helvetica').fontSize(fontSize);
          const h = doc.heightOfString(line, { width: Math.max(24, subW), lineBreak: false });
          doc.fillColor(BLACK).text(line, lx, ly, { width: Math.max(24, subW), lineBreak: false });
          ly += h + 1.5;
        }
      }
      x += width;
    }
    if (continues) drawCodingHyphen(x, barY);
    y += rowH + 12;
  }

  const example = columns
    .map((column) => column.options[0]?.code)
    .filter(Boolean)
    .join('-');
  if (example) {
    y = ensureSpace(doc, y, 12);
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(`Example: ${example}`, MARGIN, y, {
      width: innerW,
    });
    y = doc.y + 10;
  }
  return y;
}

function productLabelItems(
  product: Record<string, unknown>,
  catalog: Array<{ kind: string; value: string; label_image?: string | null }>
): DatasheetLabel[] {
  const series = product.series;
  const type = product.type || (series && typeof series === 'object' ? (series as { type?: unknown }).type : undefined);
  return mergeScopedDatasheetLabels({
    spec: product,
    catalog,
    typeLabels: datasheetLabelsFromEntity(type),
    seriesLabels: datasheetLabelsFromEntity(series),
  });
}

function drawTextBadge(doc: PDFKit.PDFDocument, text: string, x: number, y: number, size: number) {
  const pad = Math.max(1, size * 0.08);
  const inner = size - pad * 2;
  doc.save();
  doc.rect(x, y, size, size).fill(BLACK);
  doc.font('Helvetica-Bold');
  let fontSize = size >= 28 ? 7 : 5;
  while (fontSize > 3.5) {
    doc.fontSize(fontSize);
    if (doc.heightOfString(text, { width: inner, align: 'center' }) <= inner) break;
    fontSize -= 0.4;
  }
  doc.fontSize(fontSize);
  const textH = Math.min(inner, doc.heightOfString(text, { width: inner, align: 'center' }));
  doc.fillColor('#ffffff').text(text, x + pad, y + (size - textH) / 2, {
    width: inner,
    align: 'center',
    height: inner,
    lineBreak: true,
  });
  doc.restore();
}

function drawBadgeRow(
  doc: PDFKit.PDFDocument,
  badges: Array<{ text: string; image: Buffer | null }>,
  x: number,
  y: number,
  width: number
): number {
  if (!badges.length) return y;
  const size = 32;
  const gap = 6;
  const cols = Math.max(1, Math.floor((width + gap) / (size + gap)));
  const rows = Math.ceil(badges.length / cols);
  y = ensureSpace(doc, y, rows * size + (rows - 1) * gap + 8);
  let bx = x;
  let by = y;
  for (const badge of badges) {
    if (bx > x && bx + size > x + width) {
      bx = x;
      by += size + gap;
    }
    if (badge.image) {
      try {
        doc.image(badge.image, bx, by, { fit: [size, size], align: 'center', valign: 'center' });
      } catch {
        if (badge.text) drawTextBadge(doc, badge.text, bx, by, size);
      }
    } else if (badge.text) {
      drawTextBadge(doc, badge.text, bx, by, size);
    }
    bx += size + gap;
  }
  return by + size + 8;
}

export async function buildDatasheetPdf(productRow: Product | { get: (opts: { plain: true }) => Record<string, unknown> }): Promise<Buffer> {
  const product = productRow.get({ plain: true }) as Record<string, unknown> & {
    series?: { name?: string; type?: { name?: string } };
    type?: { name?: string };
  };
  const name = String(product.name || 'Product').trim();
  const code = String(product.product_code || '').trim() || '—';
  const series = publicSeriesName(nestedName(product.series), name);
  const category = nestedName(product.type) || nestedName(product.series?.type) || '—';
  const physical = collectSpecRows(product, DATASHEET_PHYSICAL_FIELDS).filter((row, _, rows) => {
    if (row.label !== 'Trim') return true;
    const finish = rows.find((item) => item.label === 'Finish');
    return !finish || finish.value !== row.value;
  });
  const technical = collectSpecRows(product, DATASHEET_TECHNICAL_FIELDS);
  const [logo, photo, sizeImage, photometricAsset, contact, catalog, grouped] = await Promise.all([
    loadLevoLogo(),
    loadProductAsset(product, 'main_image_A'),
    loadProductAsset(product, 'size_image'),
    loadProductAsset(product, 'photometric_image'),
    loadContact(),
    loadVariantCatalog(),
    seriesGroupedForProduct(product),
  ]);
  let photometric: Buffer | null = null;
  try {
    const stamp = await productToLdtStampWithSite(product);
    if (product.use_variant_ldt) {
      const variantSku = composeDatasheetSku(product, catalog, grouped);
      if (variantSku) stamp.article = variantSku;
      photometric = await renderVariantLibraryPolarPng(product, stamp);
    } else {
      photometric = await renderProductLibraryPolarPng(product, stamp);
    }
  } catch (error) {
    console.warn('Datasheet polar generation failed:', error);
    photometric = photometricAsset;
  }

  const sku = composeDatasheetSku(product, catalog, grouped);
  const pageUrl = await catalogPageUrl(product, publicSiteOrigin(contact.website));
  const qrPng = pageUrl ? await renderQrPng(pageUrl) : null;
  const qr = pageUrl && qrPng ? { png: qrPng, url: pageUrl } : null;
  const labelItems = productLabelItems(product, catalog);
  const seriesSlug = optionText((product.series as { slug?: string } | undefined)?.slug) || optionText(product.slug);
  const labelImages = await Promise.all(
    labelItems.map((label) => (label.image ? loadStoredImage(label.image, seriesSlug) : Promise.resolve(null)))
  );

  const doc = createLevoPdf({
    title: `${series}, ${code} — Datasheet`,
    logo,
    contact,
    qr,
  });
  const done = pdfToBuffer(doc);

  const leftW = 188;
  const gap = 22;
  const rightX = MARGIN + leftW + gap;
  const rightW = doc.page.width - MARGIN - rightX;
  let leftY = CONTENT_TOP;
  let rightY = leftY;

  drawImageBox(doc, photo, MARGIN, leftY, leftW);
  leftY += leftW + 8;
  if (sizeImage) {
    drawImageBox(doc, sizeImage, MARGIN, leftY, leftW);
    leftY += leftW + 8;
  }
  if (photometric) {
    drawImageBox(doc, photometric, MARGIN, leftY, leftW);
    leftY += leftW + 8;
  }

  const badges = labelItems.map((label, index) => ({
    text: label.text,
    image: labelImages[index] || null,
  }));
  leftY = drawBadgeRow(doc, badges, MARGIN, leftY, leftW);

  const title = `${series}, ${code}`;
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(title, rightX, rightY, { width: rightW });
  rightY = doc.y + 16;
  if (sku) {
    doc.fillColor(BLACK).font('Helvetica').fontSize(9).text(sku, rightX, rightY, { width: rightW });
    rightY = doc.y + 18;
  } else {
    rightY += 8;
  }
  rightY = drawIntro(doc, introParts(product, category), rightX, rightY, rightW);
  rightY += 10;
  rightY = drawSpecTable(doc, 'Physical specification', physical, rightX, rightY, rightW);
  rightY += 16;
  rightY = drawSpecTable(doc, 'Technical specification', technical, rightX, rightY, rightW);

  doc.end();
  return done;
}

function installationNotes(product: Record<string, unknown>): string[] {
  const mounting = formatSpecValue(product.mounting_type);
  const size = formatSpecValue(product.dimensions);
  const cutout = formatSpecValue(product.cutout_size);
  const voltage = formatSpecValue(product.input_voltage);
  const driver = formatSpecValue(product.driver_type);
  const dimming = formatSpecValue(product.dimming);
  const notes: string[] = [];
  if (mounting) notes.push(`Mounting method: ${mounting}.`);
  if (size) notes.push(`Fixture size: ${size}.`);
  if (cutout) notes.push(`Prepare the ceiling opening to ${cutout} before seating the fixture.`);
  if (voltage) notes.push(`Supply voltage: ${voltage}. Isolate mains before wiring.`);
  if (driver) notes.push(`Driver type: ${driver}.`);
  if (dimming) notes.push(`Control / dimming: ${dimming}.`);
  notes.push('Confirm all values on this sheet against the installed product before energizing.');
  return notes;
}

export async function buildInstallationPdf(productRow: Product | { get: (opts: { plain: true }) => Record<string, unknown> }): Promise<Buffer> {
  const product = productRow.get({ plain: true }) as Record<string, unknown> & {
    series?: { name?: string };
  };
  const name = String(product.name || 'Product').trim();
  const code = String(product.product_code || '').trim() || '—';
  const series = publicSeriesName(nestedName(product.series), name);
  const rows = collectSpecRows(product, INSTALLATION_FIELDS);
  const [logo, sizeImage, contact] = await Promise.all([
    loadLevoLogo(),
    loadProductAsset(product, 'size_image'),
    loadContact(),
  ]);
  const heading = 'Installation';
  const doc = createLevoPdf({
    title: `${series}, ${code} — Installation`,
    logo,
    contact,
    heading,
  });
  const done = pdfToBuffer(doc);

  const innerW = doc.page.width - MARGIN * 2;
  let y = CONTENT_TOP;

  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(`${series}, ${code}`, MARGIN, y, {
    width: innerW,
  });
  y = doc.y + 4;
  doc.fillColor(BLACK).font('Helvetica').fontSize(10).text(name, MARGIN, y, { width: innerW });
  y = doc.y + 12;

  if (sizeImage) {
    const boxSize = Math.min(280, innerW);
    y = ensureSpace(doc, y, boxSize + 12);
    drawImageBox(doc, sizeImage, MARGIN, y, boxSize);
    y += boxSize + 12;
  }

  y = drawSpecTable(doc, 'Installation specification', rows, MARGIN, y, innerW);

  const notes = installationNotes(product);
  y = ensureSpace(doc, y, 28);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('INSTALLATION NOTES', MARGIN, y, {
    width: innerW,
  });
  y += 16;
  for (const note of notes) {
    y = ensureSpace(doc, y, 18);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`• ${note}`, MARGIN, y, {
      width: innerW,
    });
    y = doc.y + 6;
  }

  doc.end();
  return done;
}

function plainDescription(value: unknown): string {
  return optionText(value)
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function familyCatalogPageUrl(series: Record<string, unknown>, origin: string): string | null {
  const seriesSlug = optionText(series.slug);
  const type = series.type as { slug?: string } | undefined;
  const typeSlug = optionText(type?.slug);
  if (!seriesSlug || !typeSlug) return null;
  return `${origin}${seriesPageHref(typeSlug, seriesSlug, {})}`;
}

function stripSpecSuffix(text: string, suffix?: string): string {
  if (!suffix) return text;
  if (suffix === '°') return text.replace(/°/g, '').trim();
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return text.replace(new RegExp(`\\s*${escaped}\\s*$`, 'i'), '').trim();
}

function numericRangeLabel(values: number[], suffix?: string): string | null {
  const uniq = [...new Set(values.filter((n) => Number.isFinite(n)))].sort((a, b) => a - b);
  if (!uniq.length) return null;
  const left = formatSpecValue(uniq[0], suffix);
  const right = formatSpecValue(uniq[uniq.length - 1], suffix);
  if (!left) return null;
  if (uniq.length === 1 || left === right) return left;
  if (!right) return left;
  const unit = suffix === '°' ? '°' : suffix ? ` ${suffix}` : '';
  return `${stripSpecSuffix(left, suffix)}–${stripSpecSuffix(right, suffix)}${unit}`.replace(/\s+/g, ' ').trim();
}

function joinFamilyValues(values: string[]): string | null {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = value.trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }
  if (!unique.length) return null;
  return unique.join(', ');
}

function familyFieldValues(
  grouped: Record<string, SeriesOptionDto[]>,
  field: SpecField
): string[] {
  const sizes = familyOptionsForKind(grouped, SIZE_KIND);
  if (field.key === 'dimensions') {
    return sizes
      .map((option) => formatSpecValue(option.dimensions || option.value) || '')
      .filter(Boolean);
  }
  if (field.key === 'cutout_size') {
    return sizes.map((option) => formatSpecValue(option.cutout_size) || '').filter(Boolean);
  }
  if (field.key === 'wattage' || field.key === 'lumen' || field.key === 'system_lumen' || field.key === 'efficacy') {
    const out: string[] = [];
    for (const row of familyWattageRows(grouped)) {
      if (field.key === 'wattage' && row.wattage) out.push(row.wattage);
      if (field.key === 'lumen' && row.source) out.push(row.source);
      if (field.key === 'system_lumen' && row.system) out.push(row.system);
      if (field.key === 'efficacy') {
        const watts = parseOptionNumber(row.wattage);
        const system = parseOptionNumber(row.system);
        if (watts && watts > 0 && system != null) {
          const efficacy = formatSpecValue(Math.round(system / watts), 'lm/W');
          if (efficacy) out.push(efficacy);
        }
      }
    }
    return out;
  }
  return familyOptionsForKind(grouped, field.key)
    .map((option) => formatSpecValue(option.value, field.suffix) || option.value)
    .filter(Boolean);
}

function familySpecRows(grouped: Record<string, SeriesOptionDto[]>, fields: SpecField[]): SpecRow[] {
  const rangeKeys = new Set(['wattage', 'lumen', 'system_lumen', 'efficacy', 'beam_angle']);
  const rows: SpecRow[] = [];
  for (const field of fields) {
    const values = familyFieldValues(grouped, field);
    if (!values.length) continue;
    if (rangeKeys.has(field.key)) {
      const nums = values.map((value) => parseOptionNumber(value)).filter((n): n is number => n != null);
      const ranged = numericRangeLabel(nums, field.suffix);
      if (ranged) {
        rows.push({ label: field.label, value: ranged });
        continue;
      }
    }
    const joined = joinFamilyValues(values);
    if (joined) rows.push({ label: field.label, value: joined });
  }
  return rows;
}

function familyKeyFacts(grouped: Record<string, SeriesOptionDto[]>): string[] {
  const facts: string[] = [];
  const push = (value: string | null) => {
    if (value) facts.push(value);
  };
  push(familySpecRows(grouped, [{ label: 'W', key: 'wattage', suffix: 'W' }])[0]?.value || null);
  push(familySpecRows(grouped, [{ label: 'lm', key: 'lumen', suffix: 'lm' }])[0]?.value || null);
  const cctNums = familyOptionsForKind(grouped, 'cct')
    .map((option) => parseOptionNumber(option.value))
    .filter((n): n is number => n != null);
  push(cctNums.length ? numericRangeLabel(cctNums, 'K') : joinFamilyValues(
    familyOptionsForKind(grouped, 'cct').map((option) => formatSpecValue(option.value) || option.value)
  ));
  push(familySpecRows(grouped, [{ label: 'Beam', key: 'beam_angle', suffix: '°' }])[0]?.value || null);
  const ip = joinFamilyValues(
    familyOptionsForKind(grouped, 'ip_rating').map((option) => formatSpecValue(option.value) || option.value)
  );
  push(ip ? ip.replace(/,\s*/g, ' / ') : null);
  const cri = joinFamilyValues(
    familyOptionsForKind(grouped, 'cri').map((option) => {
      const text = formatSpecValue(option.value) || option.value;
      return /^cri\b/i.test(text) ? text : `CRI ${text}`;
    })
  );
  push(cri);
  return facts;
}

function familyPhraseSpec(grouped: Record<string, SeriesOptionDto[]>): Record<string, unknown> {
  const spec: Record<string, unknown> = {};
  const physical = familySpecRows(grouped, DATASHEET_PHYSICAL_FIELDS);
  const technical = familySpecRows(grouped, DATASHEET_TECHNICAL_FIELDS);
  for (const row of [...physical, ...technical]) {
    const field =
      DATASHEET_PHYSICAL_FIELDS.find((item) => item.label === row.label) ||
      DATASHEET_TECHNICAL_FIELDS.find((item) => item.label === row.label);
    if (field) spec[field.key] = row.value;
  }
  const sizes = familyOptionsForKind(grouped, SIZE_KIND);
  if (sizes.length) {
    spec.size = joinFamilyValues(sizes.map((option) => option.value)) || spec.dimensions;
  }
  return spec;
}

function drawKeyFacts(
  doc: PDFKit.PDFDocument,
  facts: string[],
  x: number,
  y: number,
  width: number
): number {
  if (!facts.length) return y;
  const padX = 6;
  const gap = 5;
  const rowH = 15;
  const fontSize = 7.5;
  doc.font('Helvetica-Bold').fontSize(fontSize);
  let cx = x;
  let cy = y;
  y = ensureSpace(doc, y, rowH);
  cy = y;
  for (const fact of facts) {
    const w = Math.min(width, doc.widthOfString(fact) + padX * 2);
    if (cx > x && cx + w > x + width) {
      cx = x;
      cy += rowH + gap;
      y = ensureSpace(doc, cy, rowH);
      cy = y;
    }
    doc.save();
    doc.rect(cx, cy, w, rowH).fillAndStroke(STRIPE, CHROME);
    doc.restore();
    const ink = HELVETICA_CAP_PER_EM * fontSize;
    doc.fillColor(BLACK).text(fact, cx + padX, cy + (rowH - ink) / 2, { lineBreak: false });
    cx += w + gap;
  }
  return cy + rowH + 10;
}

function drawWattageMiniTable(
  doc: PDFKit.PDFDocument,
  rows: FamilyWattageRow[],
  x: number,
  y: number,
  width: number
): number {
  if (!rows.length) return y;
  const colW = [width * 0.32, width * 0.34, width * 0.34];
  const rowH = 12;
  const headerH = 11;
  y = ensureSpace(doc, y, headerH + rows.length * rowH + 4);
  doc.fillColor(MUTED).font('Helvetica').fontSize(6.5);
  doc.text('Power', x, y, { width: colW[0] });
  doc.text('Source', x + colW[0], y, { width: colW[1] });
  doc.text('System', x + colW[0] + colW[1], y, { width: colW[2] });
  y += headerH;
  doc.save();
  doc.moveTo(x, y - 2).lineTo(x + width, y - 2).strokeColor(CHROME).lineWidth(0.6).stroke();
  doc.restore();
  rows.forEach((row, index) => {
    if (index % 2 === 0) {
      doc.save();
      doc.rect(x, y, width, rowH).fill(STRIPE);
      doc.restore();
    }
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7);
    doc.text(row.wattage, x + 2, y + 2, { width: colW[0] - 2 });
    doc.font('Helvetica');
    doc.text(row.source || '—', x + colW[0], y + 2, { width: colW[1] });
    doc.text(row.system || '—', x + colW[0] + colW[1], y + 2, { width: colW[2] });
    y += rowH;
  });
  return y + 6;
}

function drawFamilySizeCards(
  doc: PDFKit.PDFDocument,
  blocks: Array<{
    heading: string;
    cutout: string;
    drawing: Buffer | null;
  }>,
  wattageRows: FamilyWattageRow[],
  y: number
): number {
  if (!blocks.length) return y;
  const innerW = doc.page.width - MARGIN * 2;
  const cols = Math.min(3, Math.max(1, blocks.length));
  const gap = 10;
  const colW = (innerW - gap * (cols - 1)) / cols;
  const photoSize = Math.min(188, colW);

  const headingH = 28;
  const tableH = wattageRows.length ? 11 + wattageRows.length * 12 + 8 : 0;
  const drawingH = photoSize + 6;
  y = ensureSpace(doc, y, 22 + headingH + drawingH + tableH + 12);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('SIZES', MARGIN, y, { width: innerW });
  y = doc.y + 8;

  for (let i = 0; i < blocks.length; i += cols) {
    const row = blocks.slice(i, i + cols);
    y = ensureSpace(doc, y, headingH + drawingH + tableH + 12);
    const rowTop = y;
    let rowBottom = y;
    row.forEach((block, col) => {
      const x = MARGIN + col * (colW + gap);
      let cy = rowTop;
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8).text(block.heading, x, cy, { width: colW });
      cy = doc.y + 2;
      if (block.cutout) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(`Cut-out ${block.cutout}`, x, cy, { width: colW });
        cy = doc.y + 4;
      }
      if (block.drawing) {
        drawImageBox(doc, block.drawing, x, cy, photoSize);
        cy += photoSize + 6;
      }
      cy = drawWattageMiniTable(doc, wattageRows, x, cy, photoSize);
      rowBottom = Math.max(rowBottom, cy);
    });
    y = rowBottom + 8;
  }
  return y;
}

type ColourGroupBox = {
  group: FamilyColourGroup;
  colW: number;
  width: number;
  cols: number;
  rows: number;
  labelH: number;
  rowH: number;
};

function colourChipColumnWidth(
  doc: PDFKit.PDFDocument,
  label: string,
  labelSize: number,
  minColW: number
): number {
  doc.font('Helvetica').fontSize(labelSize);
  return Math.max(minColW, Math.ceil(doc.widthOfString(label)) + 6);
}

function measureColourGroupBox(
  doc: PDFKit.PDFDocument,
  group: FamilyColourGroup,
  innerW: number,
  chip: number,
  labelSize: number,
  minColW: number,
  maxCols: number
): ColourGroupBox {
  const colW = Math.min(
    innerW,
    Math.max(
      minColW,
      ...group.chips.map((item) => colourChipColumnWidth(doc, item.label, labelSize, minColW))
    )
  );
  doc.font('Helvetica-Bold').fontSize(7);
  const titleW = Math.ceil(doc.widthOfString(group.title.toUpperCase()));
  const naturalW = Math.max(titleW, group.chips.length * colW);
  const wraps = naturalW > innerW;
  const cols = wraps
    ? Math.min(maxCols, Math.max(1, Math.floor(innerW / colW)))
    : Math.max(1, group.chips.length);
  const width = wraps ? innerW : naturalW;
  const rows = Math.ceil(group.chips.length / cols);
  doc.font('Helvetica').fontSize(labelSize);
  const labelH = Math.max(
    10,
    ...group.chips.map((item) => doc.heightOfString(item.label, { width: colW, align: 'center' }))
  );
  return { group, colW, width, cols, rows, labelH, rowH: chip + 4 + labelH };
}

function colourGroupDrawHeight(box: ColourGroupBox): number {
  return 10 + 6 + box.rows * box.rowH;
}

function drawColourChip(
  doc: PDFKit.PDFDocument,
  item: FamilyColourGroup['chips'][number],
  cellX: number,
  cy: number,
  colW: number,
  chip: number,
  labelSize: number
) {
  const hex = finishSwatchColors(item.value)[0] || finishSwatchColors(item.label)[0];
  const cx = cellX + colW / 2;
  const circleY = cy + chip / 2;
  doc.save();
  if (hex) {
    doc.circle(cx, circleY, chip / 2 - 0.8).lineWidth(0.7).fillAndStroke(hex, BLACK);
  } else {
    doc.circle(cx, circleY, chip / 2 - 0.8).lineWidth(0.9).stroke(BLACK);
  }
  doc.restore();
  doc.fillColor(BLACK).font('Helvetica').fontSize(labelSize).text(item.label, cellX, cy + chip + 2, {
    width: colW,
    align: 'center',
    lineBreak: true,
  });
}

function drawColourGroupBox(
  doc: PDFKit.PDFDocument,
  box: ColourGroupBox,
  x: number,
  y: number,
  chip: number,
  labelSize: number
) {
  doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(7).text(box.group.title.toUpperCase(), x, y, {
    width: box.width,
    lineBreak: false,
  });
  const chipsY = y + 16;
  box.group.chips.forEach((item, index) => {
    const col = index % box.cols;
    const row = Math.floor(index / box.cols);
    drawColourChip(doc, item, x + col * box.colW, chipsY + row * box.rowH, box.colW, chip, labelSize);
  });
}

function drawColourGroups(doc: PDFKit.PDFDocument, groups: FamilyColourGroup[], y: number): number {
  if (!groups.length) return y;
  const innerW = doc.page.width - MARGIN * 2;
  const chip = 28;
  const minColW = 58;
  const labelSize = 6.5;
  const maxCols = 10;
  const groupGap = 20;
  const boxes = groups.map((group) =>
    measureColourGroupBox(doc, group, innerW, chip, labelSize, minColW, maxCols)
  );
  const packed = packCodingRowsByWidth(
    boxes.map((box) => box.width),
    innerW,
    groupGap
  );
  const first = packed[0];
  const firstH = first
    ? Math.max(...boxes.slice(first.start, first.end).map(colourGroupDrawHeight))
    : 0;
  y = ensureSpace(doc, y, 22 + firstH);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('COLOUR OPTIONS', MARGIN, y, { width: innerW });
  y = doc.y + 8;
  for (const range of packed) {
    const row = boxes.slice(range.start, range.end);
    const rowH = Math.max(...row.map(colourGroupDrawHeight)) + 4;
    y = ensureSpace(doc, y, rowH);
    const rowTop = y;
    let x = MARGIN;
    for (let i = 0; i < row.length; i += 1) {
      if (i > 0) x += groupGap;
      drawColourGroupBox(doc, row[i], x, rowTop, chip, labelSize);
      x += row[i].width;
    }
    y = rowTop + rowH;
  }
  return y + 14;
}

async function imageFitHeight(image: Buffer, box: number): Promise<number> {
  try {
    const meta = await sharp(image).metadata();
    const w = meta.width || box;
    const h = meta.height || box;
    if (!w || !h) return box;
    return Math.max(1, h * Math.min(box / w, box / h));
  } catch {
    return box;
  }
}

async function trimWhitePng(image: Buffer): Promise<Buffer> {
  try {
    return await sharp(image).trim({ threshold: 24, lineArt: true }).png().toBuffer();
  } catch {
    return image;
  }
}

async function drawLabeledImageRow(
  doc: PDFKit.PDFDocument,
  title: string,
  items: Array<{ label: string; image: Buffer }>,
  y: number,
  columns = 3
): Promise<number> {
  if (!items.length) return y;
  const innerW = doc.page.width - MARGIN * 2;
  const gap = 10;
  const perRow = Math.min(Math.max(1, columns), items.length);
  const firstCount = Math.min(perRow, items.length);
  const firstSize = Math.min(168, (innerW - gap * (firstCount - 1)) / firstCount);
  const firstHeights = await Promise.all(
    items.slice(0, firstCount).map((item) => imageFitHeight(item.image, firstSize))
  );
  y = ensureSpace(doc, y, 14 + Math.max(...firstHeights) + 16);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text(title, MARGIN, y, {
    width: innerW,
    lineGap: 0,
  });
  y = doc.y + 3;
  for (let i = 0; i < items.length; i += perRow) {
    const row = items.slice(i, i + perRow);
    const size = Math.min(168, (innerW - gap * (row.length - 1)) / row.length);
    const rowHeights = await Promise.all(row.map((item) => imageFitHeight(item.image, size)));
    const rowH = Math.max(...rowHeights);
    if (i > 0) y = ensureSpace(doc, y, rowH + 16);
    row.forEach((item, index) => {
      const x = MARGIN + index * (size + gap);
      const h = rowHeights[index];
      drawImageBox(doc, item.image, x, y, size, 'top');
      doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(item.label, x, y + h + 3, {
        width: size,
        align: 'center',
      });
    });
    y += rowH + 16;
  }
  return y + 14;
}

async function familyPolarImages(
  grouped: Record<string, SeriesOptionDto[]>,
  series: Record<string, unknown>,
  firstPack: Record<string, unknown> | null
): Promise<Array<{ label: string; image: Buffer }>> {
  const combos = familyPolarCombos(grouped);
  const ldtFamily = optionText(series.ldt_family);
  const sizeOption = familyOptionsForKind(grouped, SIZE_KIND)[0];
  const dimensions =
    optionText(firstPack?.dimensions) || optionText(sizeOption?.dimensions) || optionText(sizeOption?.value);
  const cct = familyOptionsForKind(grouped, 'cct')[0]?.value;
  const prepared: Array<{ label: string; beam: string; ldtText: string; peak: number }> = [];
  for (const combo of combos) {
    const spec: Record<string, unknown> = {
      name: series.name,
      product_code: series.product_code,
      ldt_family: ldtFamily,
      wattage: combo.wattageValue || undefined,
      lumen: combo.lumen,
      system_lumen: combo.system_lumen,
      beam_angle: combo.beamValue,
      dimensions,
      cct,
    };
    try {
      const stamp = await productToLdtStampWithSite(spec);
      const ldtText = await stampedVariantLdtText(spec, stamp);
      prepared.push({
        label: combo.wattageLabel ? `${combo.wattageLabel} · ${combo.beamLabel}` : combo.beamLabel,
        beam: combo.beamValue,
        ldtText,
        peak: photometricPolarPeak(parseEulumdat(ldtText), 'cd'),
      });
    } catch (error) {
      console.warn('Family datasheet polar generation failed:', error);
    }
  }
  const scaleByBeam = sharedPolarScaleByGroup(prepared.map((row) => ({ group: row.beam, peak: row.peak })));
  const items: Array<{ label: string; image: Buffer }> = [];
  for (const row of prepared) {
    try {
      items.push({
        label: row.label,
        image: await trimWhitePng(
          await renderStampedLdtPolarPng(row.ldtText, { scaleMax: scaleByBeam.get(row.beam) })
        ),
      });
    } catch (error) {
      console.warn('Family datasheet polar render failed:', error);
    }
  }
  return items;
}

export async function buildFamilyDatasheetPdf(
  seriesSlug: string
): Promise<{ pdf: Buffer; filename: string } | null> {
  const seriesRow = await ProductSeries.findOne({
    where: { slug: seriesSlug },
    include: [{ model: ProductType, as: 'type' }],
  });
  if (!seriesRow) return null;

  const series = seriesRow.get({ plain: true }) as Record<string, unknown> & {
    type?: { name?: string; slug?: string };
  };
  const seriesId = Number(series.id);
  const typeName = optionText(series.type?.name);
  const name = publicSeriesName(optionText(series.name), typeName || 'Series');
  const code = optionText(series.product_code);
  const options = await loadSeriesOptions(seriesId);
  const grouped = groupOptionsByKind(options);
  const products = (await Product.findAll({ where: { series_id: seriesId } })).map(
    (row) => row.get({ plain: true }) as Record<string, unknown>
  );

  const firstPack =
    findSizePack(products, familyOptionsForKind(grouped, SIZE_KIND)[0]?.value, grouped) ||
    products.find((product) => optionText(product.main_image_A)) ||
    null;

  const [logo, featuredStored, contact, catalog, appearanceRows] = await Promise.all([
    loadLevoLogo(),
    loadStoredImage(
      optionText(series.featured_image_datasheet) ||
        optionText(series.featured_image_source) ||
        optionText(series.featured_image),
      seriesSlug
    ),
    loadContact(),
    loadVariantCatalog(),
    Number.isInteger(seriesId) ? loadAppearancePhotos(seriesId) : Promise.resolve([]),
  ]);
  const featured =
    featuredStored || (firstPack ? await loadProductAsset(firstPack, 'main_image_A') : null);

  const origin = publicSiteOrigin(contact.website);
  const pageUrl = familyCatalogPageUrl(series, origin);
  const qrPng = pageUrl ? await renderQrPng(pageUrl) : null;
  const qr = pageUrl && qrPng ? { png: qrPng, url: pageUrl } : null;
  const optionLabels = datasheetLabelsForSeriesOptions(catalog, grouped, products);
  const extraLabels = mergeScopedDatasheetLabels({
    spec: {},
    catalog,
    typeLabels: datasheetLabelsFromEntity(series.type),
    seriesLabels: datasheetLabelsFromEntity(series),
  });
  const seenLabel = new Set(optionLabels.map((label) => (label.text || '').trim().toLowerCase()));
  const labelItems = [...optionLabels];
  for (const extra of extraLabels) {
    const textKey = (extra.text || '').trim().toLowerCase();
    if (textKey && seenLabel.has(textKey)) continue;
    if (textKey) seenLabel.add(textKey);
    labelItems.push(extra);
  }
  const labelImages = await Promise.all(
    labelItems.map((label) => (label.image ? loadStoredImage(label.image, seriesSlug) : Promise.resolve(null)))
  );
  const codingParts = familyOrderCodeSegments(code, grouped, catalog);
  const physical = familySpecRows(grouped, DATASHEET_PHYSICAL_FIELDS);
  const technical = familySpecRows(grouped, DATASHEET_TECHNICAL_FIELDS);
  const specNotes = Object.entries(parseSpecs(series.specifications))
    .filter(([, value]) => optionText(value))
    .map(([label, value]) => ({ label, value: optionText(value) }));
  const description = plainDescription(series.description);
  const phrase = fillPhraseTemplate(series.description_phrase, familyPhraseSpec(grouped));
  const heading = 'Family Datasheet';
  const titleBits = [name, code].filter(Boolean).join(', ');
  const keyFacts = familyKeyFacts(grouped);
  const wattageRows = familyWattageRows(grouped);
  const colourGroups = familyColourGroups(grouped);

  const sizeOptions = familyOptionsForKind(grouped, SIZE_KIND);
  const sizeBlocks: Array<{
    heading: string;
    cutout: string;
    pack: Record<string, unknown> | null;
  }> = [];
  for (const option of sizeOptions) {
    sizeBlocks.push({
      heading: optionText(option.dimensions) || option.value,
      cutout: optionText(option.cutout_size),
      pack: findSizePack(products, option.value, grouped),
    });
  }

  const sizeDrawings = await Promise.all(
    sizeBlocks.map((block) =>
      block.pack ? loadProductAsset(block.pack, 'size_image') : Promise.resolve(null)
    )
  );

  const appearanceImages = (
    await Promise.all(
      familyAppearancePhotoRows(grouped, appearanceRows).map(async ({ photo }) => {
        const image = await loadStoredImage(photo.main_image_A, seriesSlug);
        if (!image) return null;
        const bits = [photo.colour, photo.trim_color, photo.reflector_finish].filter(
          (value) => value && !isAppearanceNa(value)
        );
        return { label: bits.join(' · ') || 'Appearance', image };
      })
    )
  ).filter((row): row is { label: string; image: Buffer } => Boolean(row));

  const polarItems = await familyPolarImages(grouped, series, firstPack);

  const doc = createLevoPdf({
    title: `${titleBits} — Family Datasheet`,
    logo,
    contact,
    heading,
    qr,
  });
  const done = pdfToBuffer(doc);
  const innerW = doc.page.width - MARGIN * 2;
  let y = CONTENT_TOP;

  const photoSize = 188;
  if (featured) {
    const rightX = MARGIN + photoSize + 22;
    const rightW = doc.page.width - MARGIN - rightX;
    drawImageBox(doc, featured, MARGIN, y, photoSize);
    let rightY = y;
    if (typeName) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(typeName.toUpperCase(), rightX, rightY, {
        width: rightW,
      });
      rightY = doc.y + 4;
    }
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(titleBits, rightX, rightY, { width: rightW });
    rightY = doc.y + 8;
    rightY = drawKeyFacts(doc, keyFacts, rightX, rightY, rightW);
    if (description) {
      rightY = drawIntro(doc, [{ text: description }], rightX, rightY, rightW);
    }
    if (phrase && phrase !== description) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(phrase, rightX, rightY, { width: rightW });
      rightY = doc.y + 8;
    }
    y = Math.max(y + photoSize + 8, rightY);
  } else {
    if (typeName) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(typeName.toUpperCase(), MARGIN, y, { width: innerW });
      y = doc.y + 4;
    }
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(titleBits, MARGIN, y, { width: innerW });
    y = doc.y + 8;
    y = drawKeyFacts(doc, keyFacts, MARGIN, y, innerW);
    if (description) y = drawIntro(doc, [{ text: description }], MARGIN, y, innerW);
    if (phrase && phrase !== description) {
      doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(phrase, MARGIN, y, { width: innerW });
      y = doc.y + 8;
    }
  }

  const badges = labelItems.map((label, index) => ({
    text: label.text,
    image: labelImages[index] || null,
  }));
  y = drawBadgeRow(doc, badges, MARGIN, y, innerW);

  const tableGap = 16;
  const halfW = (innerW - tableGap) / 2;
  const physicalH = 22 + Math.max(physical.length, 1) * 16;
  const sideBySide =
    physical.length > 0 &&
    technical.length > 0 &&
    specTopFits(doc, y, physicalH);
  if (sideBySide) {
    const specTop = y;
    const leftY = drawSpecTable(doc, 'Physical specification', physical, MARGIN, specTop, halfW);
    const rightY = drawSpecTable(
      doc,
      'Technical specification',
      technical,
      MARGIN + halfW + tableGap,
      specTop,
      halfW
    );
    y = Math.max(leftY, rightY);
  } else {
    if (physical.length) y = drawSpecTable(doc, 'Physical specification', physical, MARGIN, y, innerW);
    if (technical.length) y = drawSpecTable(doc, 'Technical specification', technical, MARGIN, y, innerW);
  }
  if (specNotes.length) {
    y = drawSpecTable(doc, 'Notes', specNotes, MARGIN, y, innerW);
  }

  if (codingParts.length) {
    y = drawFamilySkuCoding(doc, codingParts, y);
  }

  y = drawFamilySizeCards(
    doc,
    sizeBlocks.map((block, index) => ({
      heading: block.heading,
      cutout: block.cutout,
      drawing: sizeDrawings[index],
    })),
    wattageRows,
    y
  );

  y = drawColourGroups(doc, colourGroups, y);
  y = await drawLabeledImageRow(doc, 'APPEARANCE', appearanceImages, y);
  const polarColumns = familyOptionsForKind(grouped, 'beam_angle').length === 2 ? 2 : 3;
  y = await drawLabeledImageRow(doc, 'PHOTOMETRY', polarItems, y, polarColumns);

  doc.end();
  return { pdf: await done, filename: familyDatasheetFilename(name, code, seriesSlug) };
}

export async function buildFamilyInstallationPdf(
  seriesSlug: string
): Promise<{ pdf: Buffer; filename: string } | null> {
  const seriesRow = await ProductSeries.findOne({
    where: { slug: seriesSlug },
    include: [{ model: ProductType, as: 'type' }],
  });
  if (!seriesRow) return null;

  const series = seriesRow.get({ plain: true }) as Record<string, unknown> & {
    type?: { name?: string; slug?: string };
  };
  const seriesId = Number(series.id);
  const typeName = optionText(series.type?.name);
  const name = publicSeriesName(optionText(series.name), typeName || 'Series');
  const code = optionText(series.product_code);
  const options = await loadSeriesOptions(seriesId);
  const grouped = groupOptionsByKind(options);
  const products = (await Product.findAll({ where: { series_id: seriesId } })).map(
    (row) => row.get({ plain: true }) as Record<string, unknown>
  );
  const installRows = familySpecRows(grouped, INSTALLATION_FIELDS);
  const spec: Record<string, unknown> = {};
  for (const field of INSTALLATION_FIELDS) {
    const row = installRows.find((item) => item.label === field.label);
    if (row) spec[field.key] = row.value;
  }

  const sizeDrawings: Array<{ label: string; image: Buffer }> = [];
  for (const option of familyOptionsForKind(grouped, SIZE_KIND)) {
    const pack = findSizePack(products, option.value, grouped);
    const image = pack ? await loadProductAsset(pack, 'size_image') : null;
    if (!image) continue;
    const heading = optionText(option.dimensions) || option.value;
    const cutout = optionText(option.cutout_size);
    sizeDrawings.push({
      label: cutout ? `${heading} / cut-out ${cutout}` : heading,
      image,
    });
  }

  const [logo, contact] = await Promise.all([loadLevoLogo(), loadContact()]);
  const origin = publicSiteOrigin(contact.website);
  const pageUrl = familyCatalogPageUrl(series, origin);
  const qrPng = pageUrl ? await renderQrPng(pageUrl) : null;
  const qr = pageUrl && qrPng ? { png: qrPng, url: pageUrl } : null;
  const titleBits = [name, code].filter(Boolean).join(', ');
  const heading = 'Installation';
  const doc = createLevoPdf({
    title: `${titleBits} — Installation`,
    logo,
    contact,
    heading,
    qr,
  });
  const done = pdfToBuffer(doc);
  const innerW = doc.page.width - MARGIN * 2;
  let y = CONTENT_TOP;

  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(14).text(titleBits, MARGIN, y, {
    width: innerW,
  });
  y = doc.y + 4;
  doc.fillColor(BLACK).font('Helvetica').fontSize(10).text(name, MARGIN, y, { width: innerW });
  y = doc.y + 12;

  if (sizeDrawings.length === 1) {
    const boxSize = Math.min(280, innerW);
    y = ensureSpace(doc, y, boxSize + 12);
    drawImageBox(doc, sizeDrawings[0].image, MARGIN, y, boxSize);
    y += boxSize + 12;
  } else if (sizeDrawings.length > 1) {
    y = await drawLabeledImageRow(doc, 'SIZE DRAWINGS', sizeDrawings, y);
  }

  if (installRows.length) {
    y = drawSpecTable(doc, 'Installation specification', installRows, MARGIN, y, innerW);
  }

  const notes = installationNotes(spec);
  y = ensureSpace(doc, y, 28);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('INSTALLATION NOTES', MARGIN, y, {
    width: innerW,
  });
  y += 16;
  for (const note of notes) {
    y = ensureSpace(doc, y, 18);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`• ${note}`, MARGIN, y, {
      width: innerW,
    });
    y = doc.y + 6;
  }

  doc.end();
  return { pdf: await done, filename: installationFilename(code, seriesSlug) };
}

export { datasheetFilename, familyDatasheetFilename, installationFilename };
