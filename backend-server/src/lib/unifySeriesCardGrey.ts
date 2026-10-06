import { existsSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ProductSeries from '../models/ProductSeries';
import ProductType from '../models/ProductType';
import { photometricPublicRoot } from './photometric/beamLibraryServer';
import { localProductImageCandidates } from './productMedia';
import {
  CARD_CEILING_GREY,
  luma,
  unifyCatalogCardGrey,
  type CatalogCardGreyBox,
} from './shared/catalog-card-grey';

function resolvePublicImage(stored: string, seriesSlug?: string | null): string | null {
  const value = stored.trim();
  if (!value || value.includes('..') || value.includes('\\') || value.includes('\0')) return null;
  const root = path.resolve(photometricPublicRoot());
  const candidates = localProductImageCandidates(value, seriesSlug);
  if (value.startsWith('/images/') && !candidates.includes(value)) candidates.push(value);
  for (const rel of candidates) {
    if (!rel.startsWith('/') || rel.includes('..')) continue;
    const abs = path.resolve(path.join(root, ...rel.replace(/^\//, '').split('/')));
    const relativeToRoot = path.relative(root, abs);
    if (!relativeToRoot || relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) continue;
    if (existsSync(abs)) return abs;
  }
  return null;
}

function padBoxFromSeries(
  cardW: number,
  cardH: number,
  seriesW: number,
  seriesH: number
): CatalogCardGreyBox | null {
  if (!(cardW > 0 && cardH > 0 && seriesW > 0 && seriesH > 0)) return null;
  if (seriesW / seriesH >= 16 / 9 - 0.015) return null;
  const drawW = Math.max(1, Math.round(seriesW * (cardH / seriesH)));
  const dx = Math.round((cardW - drawW) / 2);
  if (dx < 2 || drawW >= cardW - 2) return null;
  return { dx, drawW };
}

function detectSideBox(data: Uint8ClampedArray, width: number, height: number): CatalogCardGreyBox | null {
  const columnIsMargin = (x: number) => {
    let hits = 0;
    for (let y = 0; y < height; y++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const yL = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const c = Math.max(r, g, b) - Math.min(r, g, b);
      if (yL > 242 || (c <= 22 && yL >= 145)) hits += 1;
    }
    return hits / height >= 0.9;
  };
  let dx = 0;
  while (dx < Math.floor(width / 3) && columnIsMargin(dx)) dx += 1;
  let right = width;
  while (right - dx > 8 && width - right < Math.floor(width / 3) && columnIsMargin(right - 1)) right -= 1;
  const drawW = right - dx;
  if (dx < 2 && width - right < 2) return null;
  return { dx, drawW };
}

function patchMeanNearGrey(
  data: Buffer,
  width: number,
  height: number,
  channels: number,
  x0: number,
  y0: number,
  size: number
): boolean {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  const x1 = Math.min(width, x0 + size);
  const y1 = Math.min(height, y0 + size);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * width + x) * channels;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  if (!n) return false;
  return (
    Math.abs(r / n - CARD_CEILING_GREY.r) <= 3 &&
    Math.abs(g / n - CARD_CEILING_GREY.g) <= 3 &&
    Math.abs(b / n - CARD_CEILING_GREY.b) <= 3
  );
}

async function alreadyUnified(abs: string): Promise<boolean> {
  const { data, info } = await sharp(abs).raw().toBuffer({ resolveWithObject: true });
  if (info.width < 16 || info.height < 16) return false;
  return (
    patchMeanNearGrey(data, info.width, info.height, info.channels, 2, 2, 12) &&
    patchMeanNearGrey(data, info.width, info.height, info.channels, info.width - 14, 2, 12)
  );
}

function lumaStddev(
  data: Buffer | Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  x0: number,
  x1: number
): number {
  const left = Math.max(0, Math.min(width, x0));
  const right = Math.max(left + 1, Math.min(width, x1));
  const step = Math.max(1, Math.floor(Math.min(height, right - left) / 32));
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  for (let y = 0; y < height; y += step) {
    for (let x = left; x < right; x += step) {
      const i = (y * width + x) * channels;
      const yL = luma(data[i], data[i + 1], data[i + 2]);
      sum += yL;
      sum2 += yL * yL;
      n += 1;
    }
  }
  if (n < 4) return 0;
  const mean = sum / n;
  return Math.sqrt(Math.max(0, sum2 / n - mean * mean));
}

async function centerHasDetail(abs: string, box?: CatalogCardGreyBox | null): Promise<boolean> {
  const { data, info } = await sharp(abs).raw().toBuffer({ resolveWithObject: true });
  if (!info.width || !info.height) return false;
  const dx = box ? Math.max(0, Math.round(box.dx)) : Math.round(info.width * 0.2);
  const drawW = box ? Math.max(1, Math.round(box.drawW)) : Math.round(info.width * 0.6);
  return lumaStddev(data, info.width, info.height, info.channels, dx, dx + drawW) >= 5;
}

async function blitSource(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  sourceAbs: string,
  box: CatalogCardGreyBox
): Promise<void> {
  const drawW = Math.max(1, Math.round(box.drawW));
  const dx = Math.max(0, Math.round(box.dx));
  const { data, info } = await sharp(sourceAbs)
    .resize(drawW, height, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const srcW = info.width || drawW;
  const srcH = info.height || height;
  const channels = info.channels || 4;
  for (let y = 0; y < height && y < srcH; y++) {
    for (let x = 0; x < drawW && x < srcW; x++) {
      const destX = dx + x;
      if (destX < 0 || destX >= width) continue;
      const s = (y * srcW + x) * channels;
      const d = (y * width + destX) * 4;
      pixels[d] = data[s];
      pixels[d + 1] = data[s + 1];
      pixels[d + 2] = data[s + 2];
      pixels[d + 3] = 255;
    }
  }
}

async function unifyFile(
  abs: string,
  box?: CatalogCardGreyBox | null,
  sourceAbs?: string | null
): Promise<boolean> {
  const { data, info } = await sharp(abs).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.channels < 3 || !info.width || !info.height) return false;
  const pixels = new Uint8ClampedArray(info.width * info.height * 4);
  if (info.channels === 4) {
    pixels.set(data);
  } else {
    for (let i = 0, p = 0; i < data.length; i += 3, p += 4) {
      pixels[p] = data[i];
      pixels[p + 1] = data[i + 1];
      pixels[p + 2] = data[i + 2];
      pixels[p + 3] = 255;
    }
  }
  const frame = box ?? detectSideBox(pixels, info.width, info.height);
  if (sourceAbs && frame) {
    await blitSource(pixels, info.width, info.height, sourceAbs, frame);
  }
  unifyCatalogCardGrey(pixels, info.width, info.height, frame);
  const pipeline = sharp(Buffer.from(pixels), {
    raw: { width: info.width, height: info.height, channels: 4 },
  });
  const ext = path.extname(abs).toLowerCase();
  const out = ext === '.png' ? await pipeline.png().toBuffer() : await pipeline.jpeg({ quality: 92 }).toBuffer();
  const tmp = `${abs}.tmp`;
  writeFileSync(tmp, out);
  try {
    unlinkSync(abs);
  } catch {
    /* Windows may keep a reader lock; rename over the original next. */
  }
  renameSync(tmp, abs);
  return true;
}

type CardRow = { slug: string; card: string; source: string };

async function unifyCardRows(
  rows: CardRow[],
  label: string
): Promise<{ rewritten: number; skipped: number; missing: number }> {
  let rewritten = 0;
  let skipped = 0;
  let missing = 0;
  for (const row of rows) {
    if (!row.card) {
      skipped += 1;
      continue;
    }
    const cardAbs = resolvePublicImage(row.card, row.slug);
    const sourceAbs = row.source ? resolvePublicImage(row.source, row.slug) : null;
    if (!cardAbs) {
      missing += 1;
      continue;
    }
    const sameFile = Boolean(sourceAbs && path.resolve(cardAbs) === path.resolve(sourceAbs));
    if (sameFile) {
      skipped += 1;
      continue;
    }
    try {
      let box: CatalogCardGreyBox | null = null;
      if (sourceAbs) {
        const [card, source] = await Promise.all([sharp(cardAbs).metadata(), sharp(sourceAbs).metadata()]);
        box = padBoxFromSeries(card.width || 0, card.height || 0, source.width || 0, source.height || 0);
      }
      if ((await alreadyUnified(cardAbs)) && (await centerHasDetail(cardAbs, box))) {
        skipped += 1;
        continue;
      }
      await unifyFile(cardAbs, box, sourceAbs);
      rewritten += 1;
    } catch (err) {
      missing += 1;
      console.warn(
        `card grey skipped ${row.slug}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (rewritten) {
    console.log(`Unified ${rewritten} ${label} card photo(s) to the shared ceiling grey.`);
  }
  return { rewritten, skipped, missing };
}

/** Rewrite saved 16:9 cards. Restores the original photo in the middle so washed details come back. */
export async function unifyExistingSeriesCards(): Promise<{ rewritten: number; skipped: number; missing: number }> {
  const series = await ProductSeries.findAll({
    attributes: ['id', 'slug', 'featured_image', 'featured_image_page'],
  });
  const types = await ProductType.findAll({
    attributes: ['id', 'slug', 'featured_image', 'featured_image_source'],
  });
  const seriesResult = await unifyCardRows(
    series.map((row) => ({
      slug: String(row.get('slug') || ''),
      card: String(row.get('featured_image') || '').trim(),
      source: String(row.get('featured_image_page') || '').trim(),
    })),
    'series'
  );
  const typeResult = await unifyCardRows(
    types.map((row) => ({
      slug: String(row.get('slug') || ''),
      card: String(row.get('featured_image') || '').trim(),
      source: String(row.get('featured_image_source') || '').trim(),
    })),
    'type'
  );
  return {
    rewritten: seriesResult.rewritten + typeResult.rewritten,
    skipped: seriesResult.skipped + typeResult.skipped,
    missing: seriesResult.missing + typeResult.missing,
  };
}
