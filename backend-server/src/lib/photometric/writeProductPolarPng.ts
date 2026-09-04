import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';
import { photometricPublicRoot } from './beamLibraryServer';

function imageFolder(seriesSlug: unknown): string {
  const slug = String(seriesSlug || '').trim();
  if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) return 'general';
  return slug;
}

/** Write polar PNG under /images/products/{series|general}/{id}-photometric_image.png */
export function writeProductPhotometricPng(
  productId: number,
  seriesSlug: unknown,
  png: Buffer
): string {
  const folder = imageFolder(seriesSlug);
  const relative = path.posix.join('images', 'products', folder, `${productId}-photometric_image.png`);
  const abs = path.join(photometricPublicRoot(), ...relative.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, png);
  return `/${relative}`;
}
