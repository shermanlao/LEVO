import { existsSync, renameSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import ProductSeries from '../models/ProductSeries';
import { photometricPublicRoot } from './photometric/beamLibraryServer';
import { localProductImageCandidates } from './productMedia';
import {
  CARD_CEILING_GREY,
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

async function unifyFile(abs: string, box?: CatalogCardGreyBox | null): Promise<boolean> {
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

/** Rewrite saved 16:9 cards to the shared ceiling grey. Fixture, trim, and lamps stay. */
export async function unifyExistingSeriesCards(): Promise<{ rewritten: number; skipped: number; missing: number }> {
  const rows = await ProductSeries.findAll({
    attributes: ['id', 'slug', 'featured_image', 'featured_image_page'],
  });
  let rewritten = 0;
  let skipped = 0;
  let missing = 0;
  for (const row of rows) {
    const stored = String(row.get('featured_image') || '').trim();
    const page = String(row.get('featured_image_page') || '').trim();
    if (!stored) {
      skipped += 1;
      continue;
    }
    const slug = String(row.get('slug') || '');
    const cardAbs = resolvePublicImage(stored, slug);
    const pageAbs = page ? resolvePublicImage(page, slug) : null;
    if (!cardAbs) {
      missing += 1;
      continue;
    }
    if (pageAbs && path.resolve(cardAbs) === path.resolve(pageAbs)) {
      skipped += 1;
      continue;
    }
    try {
      if (await alreadyUnified(cardAbs)) {
        skipped += 1;
        continue;
      }
      let box: CatalogCardGreyBox | null = null;
      if (pageAbs) {
        const [card, series] = await Promise.all([sharp(cardAbs).metadata(), sharp(pageAbs).metadata()]);
        box = padBoxFromSeries(card.width || 0, card.height || 0, series.width || 0, series.height || 0);
      }
      await unifyFile(cardAbs, box);
      rewritten += 1;
    } catch (err) {
      missing += 1;
      console.warn(
        `card grey skipped ${slug}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }
  if (rewritten) {
    console.log(`Unified ${rewritten} series card photo(s) to the shared ceiling grey.`);
  }
  return { rewritten, skipped, missing };
}
