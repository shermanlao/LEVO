import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { photometricPublicRoot } from './beamLibraryServer';

const PATH_PREFIX = '/uploads/product-ldt/';

function seriesFolder(seriesSlug: unknown): string {
  const slug = String(seriesSlug || '').trim();
  if (!slug || slug.includes('..') || slug.includes('/') || slug.includes('\\')) return 'general';
  return slug;
}

export function isValidProductLdtPath(filePath: string): boolean {
  let normalized = filePath.trim();
  if (normalized.includes('..')) return false;
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized.startsWith(PATH_PREFIX) && normalized.toLowerCase().endsWith('.ldt');
}

/** Write stamped LDT under /uploads/product-ldt/{series|general}/{id}.ldt */
export function writeProductLdtFile(
  productId: number,
  seriesSlug: unknown,
  text: string
): string {
  const folder = seriesFolder(seriesSlug);
  const relative = path.posix.join('uploads', 'product-ldt', folder, `${productId}.ldt`);
  const abs = path.join(photometricPublicRoot(), ...relative.split('/'));
  mkdirSync(path.dirname(abs), { recursive: true });
  writeFileSync(abs, text, 'utf8');
  return `/${relative}`;
}

export function resolveProductLdtFileOnDisk(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  let normalizedPath = filePath.trim();
  if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;
  if (!isValidProductLdtPath(normalizedPath)) return null;

  const candidates = [
    path.join(photometricPublicRoot(), normalizedPath.replace(/^\//, '')),
    path.join(process.cwd(), '..', 'frontend', 'public', normalizedPath.replace(/^\//, '')),
    path.join(process.cwd(), 'frontend', 'public', normalizedPath.replace(/^\//, '')),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

export function deleteProductLdtFile(filePath: string | null | undefined): void {
  const abs = resolveProductLdtFileOnDisk(filePath);
  if (abs && existsSync(abs)) unlinkSync(abs);
}
