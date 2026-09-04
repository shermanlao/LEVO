import PDFDocument from 'pdfkit';
import { Product, SiteContact } from '../models';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPANY_SHORT_NAME,
  loadBrandLogoBuffer,
} from './siteSettings';
import {
  collectSpecRows,
  GENERAL_LABEL_FILENAME,
  LABEL_SPEC_FIELDS,
  labelFilename,
  SpecRow,
} from './productSpecs';

const RED = '#E10600';
const BLACK = '#111111';
const MUTED = '#444444';
const MM = 72 / 25.4;
const PAGE_MARGIN = mm(16);
const CORNER = mm(2);
const ACCENT_W = mm(1.1);

type ContactInfo = {
  email: string;
  phone: string;
  address: string;
  website: string;
  slogan: string;
  company_name: string;
  company_short_name: string;
};

type DieId = 'driver' | 'housing' | 'mini' | 'carton' | 'logo';

type Die = {
  id: DieId;
  title: string;
  wMm: number;
  hMm: number;
};

type Box = { x: number; y: number; w: number; h: number };

type ProductLabel = {
  name: string;
  code: string;
  specs: SpecRow[];
};

const DIES: Die[] = [
  { id: 'driver', title: 'Driver / can', wMm: 80, hMm: 50 },
  { id: 'housing', title: 'Housing', wMm: 60, hMm: 30 },
  { id: 'mini', title: 'Mini', wMm: 40, hMm: 15 },
  { id: 'carton', title: 'Carton', wMm: 100, hMm: 60 },
  { id: 'logo', title: 'Logo', wMm: 50, hMm: 20 },
];

function mm(n: number): number {
  return n * MM;
}

async function loadLevoLogo(): Promise<Buffer | null> {
  return loadBrandLogoBuffer();
}

async function loadContact(): Promise<ContactInfo> {
  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  const plain = row?.get({ plain: true }) as
    | {
        email?: string;
        phone?: string;
        address?: string;
        website?: string | null;
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
    slogan: String(plain?.slogan || '').trim(),
    company_name: String(plain?.company_name || '').trim() || DEFAULT_COMPANY_NAME,
    company_short_name: String(plain?.company_short_name || '').trim() || DEFAULT_COMPANY_SHORT_NAME,
  };
}

function pdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function makerLine(contact: ContactInfo): string {
  return [contact.company_name, contact.address, contact.email, contact.phone].filter(Boolean).join(' · ');
}

function displayIp(value: string): string {
  if (/^ip/i.test(value)) return value;
  if (/^\d+[a-z]?$/i.test(value)) return `IP${value}`;
  return value;
}

function productFromRow(productRow: Product): ProductLabel {
  const product = productRow.get({ plain: true }) as Record<string, unknown>;
  const specs = collectSpecRows(product, LABEL_SPEC_FIELDS).map((row) =>
    row.label === 'IP' ? { ...row, value: displayIp(row.value) } : row
  );
  return {
    name: String(product.name || 'Product').trim() || 'Product',
    code: String(product.product_code || '').trim(),
    specs,
  };
}

function specValue(specs: SpecRow[], label: string): string {
  return specs.find((row) => row.label === label)?.value || '';
}

function drawCropMarks(doc: PDFKit.PDFDocument, box: Box) {
  const tick = mm(3);
  const gap = mm(1.2);
  const { x, y, w, h } = box;
  doc.save();
  doc.lineWidth(0.4).strokeColor(BLACK);
  const corners: Array<[number, number, number, number, number, number, number, number]> = [
    [x - gap - tick, y, x - gap, y, x, y - gap - tick, x, y - gap],
    [x + w + gap, y, x + w + gap + tick, y, x + w, y - gap - tick, x + w, y - gap],
    [x - gap - tick, y + h, x - gap, y + h, x, y + h + gap, x, y + h + gap + tick],
    [x + w + gap, y + h, x + w + gap + tick, y + h, x + w, y + h + gap, x + w, y + h + gap + tick],
  ];
  for (const [ax, ay, bx, by, cx, cy, dx, dy] of corners) {
    doc.moveTo(ax, ay).lineTo(bx, by).stroke();
    doc.moveTo(cx, cy).lineTo(dx, dy).stroke();
  }
  doc.restore();
}

function drawBarcode(doc: PDFKit.PDFDocument, value: string, x: number, y: number, width: number, height: number) {
  const bits: number[] = [1, 1, 1, 0];
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    bits.push(1, (code >> 2) & 1, 0, (code >> 1) & 1, 1, code & 1, 0);
  }
  bits.push(1, 0, 1, 1);
  const unit = width / bits.length;
  doc.save();
  doc.fillColor(BLACK);
  bits.forEach((on, i) => {
    if (on) doc.rect(x + i * unit, y, Math.max(0.5, unit * 0.88), height).fill();
  });
  doc.restore();
}

function drawWordmark(
  doc: PDFKit.PDFDocument,
  logo: Buffer | null,
  x: number,
  y: number,
  height: number,
  shortName = DEFAULT_COMPANY_SHORT_NAME
): number {
  if (logo) {
    try {
      doc.image(logo, x, y, { height });
      return height * 3.4;
    } catch {
      /* fall through */
    }
  }
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(height * 0.9);
  doc.text(shortName, x, y + height * 0.08, { lineBreak: false });
  return doc.widthOfString(shortName);
}

function openDie(doc: PDFKit.PDFDocument, box: Box, paint: (inner: Box) => void) {
  drawCropMarks(doc, box);
  doc.save();
  doc.roundedRect(box.x, box.y, box.w, box.h, CORNER).clip();
  doc.rect(box.x, box.y, box.w, box.h).fill('#FFFFFF');
  doc.rect(box.x, box.y, ACCENT_W, box.h).fill(RED);
  const pad = mm(2.4);
  paint({
    x: box.x + ACCENT_W + pad,
    y: box.y + pad,
    w: box.w - ACCENT_W - pad * 2,
    h: box.h - pad * 2,
  });
  doc.restore();
  doc.save();
  doc.roundedRect(box.x, box.y, box.w, box.h, CORNER).lineWidth(0.6).strokeColor(BLACK).stroke();
  doc.restore();
}

function drawSpecGrid(
  doc: PDFKit.PDFDocument,
  specs: SpecRow[],
  x: number,
  y: number,
  width: number,
  columns: number,
  labelSize: number,
  valueSize: number
) {
  const colW = width / columns;
  const rowH = labelSize + valueSize + mm(1.4);
  specs.forEach((row, i) => {
    const col = i % columns;
    const r = Math.floor(i / columns);
    const cx = x + col * colW;
    const cy = y + r * rowH;
    doc.fillColor(MUTED).font('Helvetica').fontSize(labelSize);
    doc.text(row.label.toUpperCase(), cx, cy, { width: colW - mm(1), lineBreak: false });
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(valueSize);
    doc.text(row.value, cx, cy + labelSize + 0.6, { width: colW - mm(1), lineBreak: false });
  });
}

function drawSkuDriver(
  doc: PDFKit.PDFDocument,
  inner: Box,
  product: ProductLabel,
  contact: ContactInfo,
  logo: Buffer | null
) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(0.2), mm(4.2), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(4.2);
    doc.text(contact.slogan, inner.x, inner.y + mm(4.6), {
      width: inner.w * 0.55,
      lineBreak: false,
    });
  }
  if (product.code) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(4);
    const skuX = inner.x + inner.w * 0.58;
    doc.text('SKU', skuX, inner.y, { width: inner.w * 0.42, align: 'right', lineBreak: false });
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(9);
    doc.text(product.code, skuX, inner.y + mm(1.6), { width: inner.w * 0.42, align: 'right', lineBreak: false });
  }
  const ruleY = inner.y + mm(8);
  doc.save();
  doc.moveTo(inner.x, ruleY).lineTo(inner.x + inner.w, ruleY).lineWidth(0.4).strokeColor(BLACK).stroke();
  doc.restore();
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8);
  doc.text(product.name, inner.x, ruleY + mm(1.2), { width: inner.w, lineBreak: false });
  const gridY = ruleY + mm(5);
  drawSpecGrid(doc, product.specs.slice(0, 9), inner.x, gridY, inner.w, 3, 3.6, 6.5);
  const barY = inner.y + inner.h - mm(9.5);
  if (product.code) {
    drawBarcode(doc, product.code, inner.x, barY, inner.w * 0.62, mm(4.2));
    doc.fillColor(MUTED).font('Helvetica').fontSize(5);
    doc.text(product.code, inner.x, barY + mm(4.6), { lineBreak: false });
  }
  doc.fillColor(MUTED).font('Helvetica').fontSize(4);
  doc.text(makerLine(contact), inner.x, inner.y + inner.h - mm(2.2), {
    width: inner.w,
    lineBreak: false,
    ellipsis: true,
  });
}

function drawSkuHousing(doc: PDFKit.PDFDocument, inner: Box, product: ProductLabel, contact: ContactInfo, logo: Buffer | null) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(0.2), mm(3.4), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(3.6);
    doc.text(contact.slogan, inner.x, inner.y + mm(3.8), { lineBreak: false });
  }
  if (product.code) {
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(8);
    doc.text(product.code, inner.x, inner.y, { width: inner.w, align: 'right', lineBreak: false });
  }
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7.5);
  doc.text(product.name, inner.x, inner.y + mm(8), { width: inner.w, lineBreak: false });
  const line = product.specs
    .filter((row) => ['Power', 'Input', 'CCT', 'IP'].includes(row.label))
    .map((row) => row.value)
    .join('  ·  ');
  const line2 = product.specs
    .filter((row) => ['Source Lumen', 'CRI', 'Control'].includes(row.label))
    .map((row) => row.value)
    .join('  ·  ');
  doc.fillColor(BLACK).font('Helvetica').fontSize(6);
  if (line) doc.text(line, inner.x, inner.y + mm(12.5), { width: inner.w, lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(5.5);
  if (line2) doc.text(line2, inner.x, inner.y + mm(16), { width: inner.w, lineBreak: false });
}

function drawSkuMini(doc: PDFKit.PDFDocument, inner: Box, product: ProductLabel, contact: ContactInfo) {
  const power = specValue(product.specs, 'Power');
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7);
  doc.text(contact.company_short_name, inner.x, inner.y + mm(0.4), { lineBreak: false });
  if (product.code) {
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(7);
    doc.text(product.code, inner.x, inner.y + mm(0.4), { width: inner.w, align: 'center', lineBreak: false });
  }
  if (power) {
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(7);
    doc.text(power, inner.x, inner.y + mm(0.4), { width: inner.w, align: 'right', lineBreak: false });
  }
  const second = [specValue(product.specs, 'Input') || specValue(product.specs, 'CCT'), specValue(product.specs, 'IP')]
    .filter(Boolean)
    .join('  ·  ');
  doc.fillColor(MUTED).font('Helvetica').fontSize(5.5);
  if (second) doc.text(second, inner.x, inner.y + mm(5.2), { width: inner.w, lineBreak: false });
}

function drawSkuCarton(
  doc: PDFKit.PDFDocument,
  inner: Box,
  product: ProductLabel,
  contact: ContactInfo,
  logo: Buffer | null
) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(0.4), mm(5), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(5);
    doc.text(contact.slogan, inner.x, inner.y + mm(5.8), { lineBreak: false });
  }
  const ruleY = inner.y + mm(10);
  doc.save();
  doc.moveTo(inner.x, ruleY).lineTo(inner.x + inner.w, ruleY).lineWidth(0.45).strokeColor(BLACK).stroke();
  doc.restore();
  doc.fillColor(MUTED).font('Helvetica').fontSize(4.5);
  doc.text('PRODUCT', inner.x, ruleY + mm(1.4), { lineBreak: false });
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(11);
  doc.text(product.name, inner.x, ruleY + mm(3.4), { width: inner.w * 0.7, lineBreak: false });
  if (product.code) {
    doc.fillColor(RED).font('Helvetica-Bold').fontSize(12);
    doc.text(product.code, inner.x, ruleY + mm(8.2), { lineBreak: false });
  }
  drawSpecGrid(doc, product.specs.slice(0, 6), inner.x, ruleY + mm(14), inner.w, 3, 3.8, 7);
  const barY = inner.y + inner.h - mm(10);
  if (product.code) {
    drawBarcode(doc, product.code, inner.x, barY, inner.w * 0.72, mm(5));
    doc.fillColor(MUTED).font('Helvetica').fontSize(5.5);
    doc.text(product.code, inner.x, barY + mm(5.4), { lineBreak: false });
  }
  doc.fillColor(MUTED).font('Helvetica').fontSize(4.2);
  doc.text(makerLine(contact), inner.x, inner.y + inner.h - mm(2.4), {
    width: inner.w,
    lineBreak: false,
    ellipsis: true,
  });
}

function drawGeneralDriver(doc: PDFKit.PDFDocument, inner: Box, contact: ContactInfo, logo: Buffer | null) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(1.2), mm(6.5), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(6);
    doc.text(contact.slogan, inner.x, inner.y + mm(8.2), { lineBreak: false });
  }
  const ruleY = inner.y + mm(14);
  doc.save();
  doc.moveTo(inner.x, ruleY).lineTo(inner.x + inner.w, ruleY).lineWidth(0.45).strokeColor(BLACK).stroke();
  doc.restore();
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8);
  doc.text(contact.company_name, inner.x, ruleY + mm(2.2), { lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(6.5);
  const lines = [contact.address, contact.email, contact.phone, contact.website].filter(Boolean);
  lines.forEach((line, i) => {
    doc.text(line, inner.x, ruleY + mm(6) + i * mm(3.2), { width: inner.w, lineBreak: false });
  });
}

function drawGeneralHousing(doc: PDFKit.PDFDocument, inner: Box, contact: ContactInfo, logo: Buffer | null) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(0.4), mm(4), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(4.5);
    doc.text(contact.slogan, inner.x, inner.y + mm(5), { lineBreak: false });
  }
  doc.fillColor(BLACK).font('Helvetica').fontSize(6);
  doc.text(contact.email || contact.address || contact.company_name, inner.x, inner.y + mm(12), {
    width: inner.w,
    lineBreak: false,
  });
  if (contact.phone) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(5.5);
    doc.text(contact.phone, inner.x, inner.y + mm(16.5), { lineBreak: false });
  }
}

function drawGeneralMini(doc: PDFKit.PDFDocument, inner: Box, contact: ContactInfo) {
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8);
  doc.text(contact.company_short_name, inner.x, inner.y + mm(0.6), { width: inner.w, align: 'center', lineBreak: false });
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(4.8);
    doc.text(contact.slogan, inner.x, inner.y + mm(5.2), { width: inner.w, align: 'center', lineBreak: false });
  }
}

function drawGeneralCarton(doc: PDFKit.PDFDocument, inner: Box, contact: ContactInfo, logo: Buffer | null) {
  drawWordmark(doc, logo, inner.x, inner.y + mm(1.6), mm(8), contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(7);
    doc.text(contact.slogan, inner.x, inner.y + mm(10.4), { lineBreak: false });
  }
  const ruleY = inner.y + mm(16);
  doc.save();
  doc.moveTo(inner.x, ruleY).lineTo(inner.x + inner.w, ruleY).lineWidth(0.5).strokeColor(BLACK).stroke();
  doc.restore();
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(10);
  doc.text(contact.company_name, inner.x, ruleY + mm(3), { lineBreak: false });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8);
  const lines = [contact.address, contact.email, contact.phone, contact.website].filter(Boolean);
  lines.forEach((line, i) => {
    doc.text(line, inner.x, ruleY + mm(8) + i * mm(4), { width: inner.w, lineBreak: false });
  });
}

function drawLogoLabel(doc: PDFKit.PDFDocument, inner: Box, contact: ContactInfo, logo: Buffer | null) {
  const markH = mm(6.5);
  const markW = markH * 3.4;
  const sloganSize = 5.5;
  const blockH = markH + mm(1.4) + sloganSize;
  const startY = inner.y + Math.max(0, (inner.h - blockH) / 2);
  const markX = inner.x + Math.max(0, (inner.w - markW) / 2);
  drawWordmark(doc, logo, markX, startY, markH, contact.company_short_name);
  if (contact.slogan) {
    doc.fillColor(MUTED).font('Helvetica').fontSize(sloganSize);
    doc.text(contact.slogan, inner.x, startY + markH + mm(1.2), {
      width: inner.w,
      align: 'center',
      lineBreak: false,
    });
  }
}

function paintSkuDie(
  doc: PDFKit.PDFDocument,
  die: Die,
  box: Box,
  product: ProductLabel,
  contact: ContactInfo,
  logo: Buffer | null
) {
  openDie(doc, box, (inner) => {
    if (die.id === 'housing') drawSkuHousing(doc, inner, product, contact, logo);
    else if (die.id === 'mini') drawSkuMini(doc, inner, product, contact);
    else if (die.id === 'carton') drawSkuCarton(doc, inner, product, contact, logo);
    else if (die.id === 'logo') drawLogoLabel(doc, inner, contact, logo);
    else drawSkuDriver(doc, inner, product, contact, logo);
  });
}

function paintGeneralDie(doc: PDFKit.PDFDocument, die: Die, box: Box, contact: ContactInfo, logo: Buffer | null) {
  openDie(doc, box, (inner) => {
    if (die.id === 'housing') drawGeneralHousing(doc, inner, contact, logo);
    else if (die.id === 'mini') drawGeneralMini(doc, inner, contact);
    else if (die.id === 'carton') drawGeneralCarton(doc, inner, contact, logo);
    else if (die.id === 'logo') drawLogoLabel(doc, inner, contact, logo);
    else drawGeneralDriver(doc, inner, contact, logo);
  });
}

function dieBox(die: Die, x: number, y: number): Box {
  return { x, y, w: mm(die.wMm), h: mm(die.hMm) };
}

function drawSheetChrome(
  doc: PDFKit.PDFDocument,
  logo: Buffer | null,
  heading: string,
  caption: string,
  shortName = DEFAULT_COMPANY_SHORT_NAME
) {
  drawWordmark(doc, logo, PAGE_MARGIN, PAGE_MARGIN, mm(7), shortName);
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12);
  doc.text(heading, PAGE_MARGIN, PAGE_MARGIN + mm(1), {
    width: doc.page.width - PAGE_MARGIN * 2,
    align: 'right',
    lineBreak: false,
  });
  doc.fillColor(MUTED).font('Helvetica').fontSize(8);
  doc.text(caption, PAGE_MARGIN, PAGE_MARGIN + mm(9), {
    width: doc.page.width - PAGE_MARGIN * 2,
    lineBreak: false,
  });
  doc.save();
  doc
    .moveTo(PAGE_MARGIN, PAGE_MARGIN + mm(13))
    .lineTo(doc.page.width - PAGE_MARGIN, PAGE_MARGIN + mm(13))
    .lineWidth(1.4)
    .strokeColor(BLACK)
    .stroke();
  doc.restore();
}

function drawDieCaption(doc: PDFKit.PDFDocument, die: Die, box: Box) {
  doc.fillColor(MUTED).font('Helvetica').fontSize(7);
  doc.text(`${die.title}  ${die.wMm} × ${die.hMm} mm`, box.x, box.y + box.h + mm(4), { lineBreak: false });
}

function layoutDieBoxes(): Record<DieId, Box> {
  const originY = PAGE_MARGIN + mm(20);
  const originX = PAGE_MARGIN;
  const gap = mm(14);
  const byId = Object.fromEntries(DIES.map((die) => [die.id, die])) as Record<DieId, Die>;
  const driverBox = dieBox(byId.driver, originX, originY);
  const housingBox = dieBox(byId.housing, originX + driverBox.w + gap, originY);
  const miniBox = dieBox(byId.mini, originX + driverBox.w + gap, originY + housingBox.h + mm(12));
  const cartonBox = dieBox(byId.carton, originX, originY + driverBox.h + mm(16));
  const logoBox = dieBox(byId.logo, originX + cartonBox.w + gap, cartonBox.y);
  return {
    driver: driverBox,
    housing: housingBox,
    mini: miniBox,
    carton: cartonBox,
    logo: logoBox,
  };
}

function createLabelDoc(title: string, author = DEFAULT_COMPANY_NAME): PDFKit.PDFDocument {
  return new PDFDocument({
    size: 'A4',
    margin: 0,
    info: {
      Title: title,
      Author: author,
      Creator: author,
    },
  });
}

export async function buildProductLabelPdf(productRow: Product): Promise<Buffer> {
  const product = productFromRow(productRow);
  const [logo, contact] = await Promise.all([loadLevoLogo(), loadContact()]);
  const title = `${product.code || product.name} — Product label`;
  const doc = createLabelDoc(title, contact.company_name);
  const done = pdfToBuffer(doc);
  drawSheetChrome(
    doc,
    logo,
    'Product labels',
    'Print at 100% · do not scale to fit · cut on crop marks',
    contact.company_short_name
  );
  const boxes = layoutDieBoxes();
  for (const die of DIES) {
    paintSkuDie(doc, die, boxes[die.id], product, contact, logo);
    drawDieCaption(doc, die, boxes[die.id]);
  }
  doc.end();
  return done;
}

export async function buildGeneralLabelPdf(): Promise<Buffer> {
  const [logo, contact] = await Promise.all([loadLevoLogo(), loadContact()]);
  const doc = createLabelDoc(`${contact.company_short_name} — Brand labels`, contact.company_name);
  const done = pdfToBuffer(doc);
  drawSheetChrome(
    doc,
    logo,
    'Brand labels',
    'Print at 100% · do not scale to fit · cut on crop marks',
    contact.company_short_name
  );
  const boxes = layoutDieBoxes();
  for (const die of DIES) {
    paintGeneralDie(doc, die, boxes[die.id], contact, logo);
    drawDieCaption(doc, die, boxes[die.id]);
  }
  doc.end();
  return done;
}

export { labelFilename, GENERAL_LABEL_FILENAME };
