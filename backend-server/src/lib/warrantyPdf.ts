import PDFDocument from 'pdfkit';
import SiteContact from '../models/SiteContact';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPANY_SHORT_NAME,
  DEFAULT_RESOURCE_WARRANTY_BODY,
  DEFAULT_RESOURCE_WARRANTY_TITLE,
  loadBrandLogoBuffer,
  parseWarrantySchedule,
  type WarrantySchedule,
} from './siteSettings';

const BLACK = '#111111';
const MUTED = '#4B5563';
const STRIPE = '#F3F4F6';
const CHROME = '#E5E7EB';
const MARGIN = 40;
const HEADER_H = 52;
const FOOTER_H = 42;
const CONTENT_TOP = HEADER_H + 18;

type ContactBits = {
  company_name: string;
  company_short_name: string;
  slogan: string;
  email: string;
  phone: string;
  address: string;
  website: string;
};

type Cursor = { y: number };

function pdfSafe(value: string): string {
  return value
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u00A0/g, ' ');
}

function contentWidth(doc: PDFKit.PDFDocument): number {
  return doc.page.width - MARGIN * 2;
}

function contentBottom(doc: PDFKit.PDFDocument): number {
  return doc.page.height - FOOTER_H - 8;
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function drawHeader(doc: PDFKit.PDFDocument, logo: Buffer | null, heading: string, shortName: string) {
  doc.save();
  doc.rect(0, 0, doc.page.width, HEADER_H).fill(CHROME);
  doc.restore();
  const top = 16;
  if (logo) {
    try {
      doc.image(logo, MARGIN, top, { height: 22 });
    } catch {
      doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(16).text(shortName, MARGIN, top + 2, { lineBreak: false });
    }
  } else {
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(16).text(shortName, MARGIN, top + 2, { lineBreak: false });
  }
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(16).text(heading, MARGIN, top + 2, {
    width: contentWidth(doc),
    align: 'right',
    lineBreak: false,
  });
  doc.save();
  doc.moveTo(0, HEADER_H).lineTo(doc.page.width, HEADER_H).lineWidth(2).strokeColor(BLACK).stroke();
  doc.restore();
}

function drawFooter(doc: PDFKit.PDFDocument, contact: ContactBits, page: number, pages: number) {
  const y = doc.page.height - FOOTER_H;
  doc.save();
  doc.rect(0, y, doc.page.width, FOOTER_H).fill(CHROME);
  doc.moveTo(0, y).lineTo(doc.page.width, y).lineWidth(1.5).strokeColor(BLACK).stroke();
  doc.restore();
  const brand = contact.slogan ? `${contact.company_name} | ${contact.slogan}` : contact.company_name;
  const line = [brand, contact.email, contact.phone, contact.website].filter(Boolean).join('  |  ');
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(pdfSafe(line), MARGIN, y + 10, {
    width: contentWidth(doc) - 48,
    lineBreak: false,
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(`${page} / ${pages}`, MARGIN, y + 10, {
    width: contentWidth(doc),
    align: 'right',
    lineBreak: false,
  });
  if (contact.address) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(7).text(pdfSafe(contact.address), MARGIN, y + 24, {
      width: contentWidth(doc),
      lineBreak: false,
    });
  }
}

function newPage(doc: PDFKit.PDFDocument, cursor: Cursor) {
  doc.addPage();
  cursor.y = CONTENT_TOP;
}

function ensure(doc: PDFKit.PDFDocument, cursor: Cursor, height: number) {
  if (cursor.y + height <= contentBottom(doc)) return;
  newPage(doc, cursor);
}

function writeParagraph(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  text: string,
  options?: { size?: number; color?: string; font?: string; gap?: number; width?: number; x?: number }
) {
  const size = options?.size ?? 9;
  const font = options?.font ?? 'Helvetica';
  const x = options?.x ?? MARGIN;
  const width = options?.width ?? contentWidth(doc);
  const gap = options?.gap ?? 8;
  const safe = pdfSafe(text);
  doc.font(font).fontSize(size);
  const height = doc.heightOfString(safe, { width, lineGap: 2 });
  ensure(doc, cursor, height + gap);
  doc.fillColor(options?.color ?? BLACK).font(font).fontSize(size).text(safe, x, cursor.y, { width, lineGap: 2 });
  cursor.y = doc.y + gap;
}

function writeHeading(doc: PDFKit.PDFDocument, cursor: Cursor, text: string) {
  ensure(doc, cursor, 24);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(13).text(pdfSafe(text), MARGIN, cursor.y, {
    width: contentWidth(doc),
  });
  cursor.y = doc.y + 8;
}

function cellHeight(doc: PDFKit.PDFDocument, cells: string[], widths: number[], font: string, size: number): number {
  doc.font(font).fontSize(size);
  let height = 0;
  cells.forEach((cell, index) => {
    height = Math.max(height, doc.heightOfString(pdfSafe(cell), { width: widths[index] - 12, lineGap: 1 }));
  });
  return height + 12;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  headers: string[],
  rows: string[][],
  widths: number[]
) {
  const drawHeaderRow = () => {
    const height = cellHeight(doc, headers, widths, 'Helvetica-Bold', 8);
    ensure(doc, cursor, height);
    doc.save();
    doc.rect(MARGIN, cursor.y, contentWidth(doc), height).fill(CHROME);
    doc.restore();
    let x = MARGIN;
    headers.forEach((header, index) => {
      doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8).text(pdfSafe(header).toUpperCase(), x + 6, cursor.y + 6, {
        width: widths[index] - 12,
        lineGap: 1,
      });
      x += widths[index];
    });
    cursor.y += height;
  };

  drawHeaderRow();
  rows.forEach((row, rowIndex) => {
    const height = cellHeight(doc, row, widths, 'Helvetica', 8);
    if (cursor.y + height > contentBottom(doc)) {
      newPage(doc, cursor);
      drawHeaderRow();
    }
    if (rowIndex % 2 === 1) {
      doc.save();
      doc.rect(MARGIN, cursor.y, contentWidth(doc), height).fill(STRIPE);
      doc.restore();
    }
    let x = MARGIN;
    row.forEach((cell, index) => {
      const font = index === 1 ? 'Helvetica-Bold' : 'Helvetica';
      doc.fillColor(BLACK).font(font).fontSize(8).text(pdfSafe(cell), x + 6, cursor.y + 6, {
        width: widths[index] - 12,
        lineGap: 1,
      });
      x += widths[index];
    });
    cursor.y += height;
  });
  cursor.y += 12;
}

function drawPeriods(doc: PDFKit.PDFDocument, cursor: Cursor, periods: WarrantySchedule['periods']) {
  const gap = 8;
  const width = (contentWidth(doc) - gap * (periods.length - 1)) / periods.length;
  const height = 58;
  ensure(doc, cursor, height + 14);
  periods.forEach((period, index) => {
    const x = MARGIN + index * (width + gap);
    doc.save();
    doc.roundedRect(x, cursor.y, width, height, 3).fill(STRIPE);
    doc.restore();
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12).text(pdfSafe(period.value), x + 8, cursor.y + 8, {
      width: width - 16,
      height: 16,
      lineBreak: false,
    });
    doc.fillColor(MUTED).font('Helvetica').fontSize(8).text(pdfSafe(period.label), x + 8, cursor.y + 28, {
      width: width - 16,
      height: 22,
    });
  });
  cursor.y += height + 16;
}

function drawColumns(
  doc: PDFKit.PDFDocument,
  cursor: Cursor,
  leftTitle: string,
  leftItems: string[],
  rightTitle: string,
  rightItems: string[]
) {
  const gap = 16;
  const colWidth = (contentWidth(doc) - gap) / 2;
  const measure = (title: string, items: string[]) => {
    doc.font('Helvetica-Bold').fontSize(13);
    let height = doc.heightOfString(pdfSafe(title), { width: colWidth }) + 8;
    doc.font('Helvetica').fontSize(9);
    for (const item of items) {
      height += doc.heightOfString(pdfSafe(item), { width: colWidth, lineGap: 2 }) + 8;
    }
    return height;
  };
  const blockHeight = Math.max(measure(leftTitle, leftItems), measure(rightTitle, rightItems));
  const room = contentBottom(doc) - CONTENT_TOP;
  if (blockHeight > room) {
    writeHeading(doc, cursor, leftTitle);
    leftItems.forEach((item) => writeParagraph(doc, cursor, item));
    writeHeading(doc, cursor, rightTitle);
    rightItems.forEach((item) => writeParagraph(doc, cursor, item));
    return;
  }
  ensure(doc, cursor, blockHeight);
  const top = cursor.y;
  const paint = (title: string, items: string[], x: number) => {
    let y = top;
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(13).text(pdfSafe(title), x, y, { width: colWidth });
    y = doc.y + 8;
    for (const item of items) {
      doc.fillColor(BLACK).font('Helvetica').fontSize(9).text(pdfSafe(item), x, y, { width: colWidth, lineGap: 2 });
      y = doc.y + 8;
    }
    return y;
  };
  const leftEnd = paint(leftTitle, leftItems, MARGIN);
  const rightEnd = paint(rightTitle, rightItems, MARGIN + colWidth + gap);
  cursor.y = Math.max(leftEnd, rightEnd);
}

function statementParagraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export const WARRANTY_PDF_FILENAME = 'LEVO-Warranty.pdf';

export async function buildWarrantyPdf(): Promise<Buffer> {
  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  const plain = (row?.get({ plain: true }) || {}) as Record<string, unknown>;
  const schedule = parseWarrantySchedule(plain.resource_warranty_schedule);
  const title = String(plain.resource_warranty_title || '').trim() || DEFAULT_RESOURCE_WARRANTY_TITLE;
  const body = String(plain.resource_warranty_body || '').trim() || DEFAULT_RESOURCE_WARRANTY_BODY;
  const contact: ContactBits = {
    company_name: String(plain.company_name || '').trim() || DEFAULT_COMPANY_NAME,
    company_short_name: String(plain.company_short_name || '').trim() || DEFAULT_COMPANY_SHORT_NAME,
    slogan: String(plain.slogan || '').trim(),
    email: String(plain.email || '').trim(),
    phone: String(plain.phone || '').trim(),
    address: String(plain.address || '').trim(),
    website: String(plain.website || '').trim(),
  };
  const logo = await loadBrandLogoBuffer();
  const doc = new PDFDocument({
    size: 'A4',
    margin: 0,
    bufferPages: true,
    info: {
      Title: `${contact.company_name} ${title}`,
      Author: contact.company_name,
      Subject: title,
    },
  });
  const pending = pdfToBuffer(doc);
  const cursor: Cursor = { y: CONTENT_TOP };
  doc.on('pageAdded', () => {
    drawHeader(doc, logo, title, contact.company_short_name);
  });
  drawHeader(doc, logo, title, contact.company_short_name);

  writeParagraph(doc, cursor, schedule.lead, { size: 11, color: MUTED, gap: 14 });
  drawPeriods(doc, cursor, schedule.periods);
  writeHeading(doc, cursor, 'Warranty periods');
  writeParagraph(doc, cursor, schedule.periodNote, { size: 8, color: MUTED, gap: 8 });
  const tableWidth = contentWidth(doc);
  drawTable(
    doc,
    cursor,
    ['What', 'Period', 'Note'],
    schedule.periodRows.map((item) => [item.what, item.period, item.note]),
    [tableWidth * 0.5, tableWidth * 0.2, tableWidth * 0.3]
  );

  drawColumns(doc, cursor, 'Covered', schedule.covered, 'Not covered', schedule.excluded);
  writeHeading(doc, cursor, 'Conditions');
  drawTable(
    doc,
    cursor,
    ['Condition', 'Detail'],
    schedule.conditions.map((item) => [item.condition, item.detail]),
    [tableWidth * 0.28, tableWidth * 0.72]
  );

  drawColumns(doc, cursor, 'Remedy', schedule.remedy, 'Claim', schedule.claim);
  if (schedule.claimNote) {
    writeParagraph(doc, cursor, schedule.claimNote, { size: 8, color: MUTED });
  }

  const paragraphs = statementParagraphs(body);
  if (paragraphs.length) {
    writeHeading(doc, cursor, 'Warranty statement');
    paragraphs.forEach((paragraph) => writeParagraph(doc, cursor, paragraph));
  }
  if (schedule.statutory) {
    writeParagraph(doc, cursor, schedule.statutory, { size: 8, color: MUTED });
  }

  const range = doc.bufferedPageRange();
  for (let index = 0; index < range.count; index += 1) {
    doc.switchToPage(range.start + index);
    drawFooter(doc, contact, index + 1, range.count);
  }
  doc.end();
  return pending;
}
