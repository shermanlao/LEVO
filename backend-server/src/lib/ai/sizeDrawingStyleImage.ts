import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { photometricPublicRoot } from '../photometric/beamLibraryServer';

const DIR_REL = ['images', 'ai'] as const;
const FILE_STEM = 'size-drawing-style';
const PUBLIC_PREFIX = '/images/ai/';

const MIME_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const EXT_MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

function styleDir(): string {
  return path.join(photometricPublicRoot(), ...DIR_REL);
}

function isSafeStoredPath(stored: string): boolean {
  const normalized = stored.trim();
  if (!normalized.startsWith(PUBLIC_PREFIX)) return false;
  if (normalized.includes('..') || normalized.includes('\\') || normalized.includes('\0')) return false;
  const name = path.posix.basename(normalized);
  return name.startsWith(FILE_STEM);
}

export function resolveSizeDrawingStylePathOnDisk(stored: string | null | undefined): string | null {
  const value = String(stored || '').trim();
  if (!isSafeStoredPath(value)) return null;
  const abs = path.join(photometricPublicRoot(), ...value.replace(/^\//, '').split('/'));
  if (!existsSync(abs)) return null;
  return abs;
}

export function readSizeDrawingStyleDataUrl(stored: string | null | undefined): string | null {
  const abs = resolveSizeDrawingStylePathOnDisk(stored);
  if (!abs) return null;
  const ext = path.extname(abs).toLowerCase();
  const mime = EXT_MIME[ext] || 'image/png';
  const buf = readFileSync(abs);
  return `data:${mime};base64,${buf.toString('base64')}`;
}

export function writeSizeDrawingStyleImage(buffer: Buffer, mimeType: string): string {
  const ext = MIME_EXT[mimeType];
  if (!ext) throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
  const dir = styleDir();
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    if (name.startsWith(FILE_STEM)) {
      unlinkSync(path.join(dir, name));
    }
  }
  const filename = `${FILE_STEM}${ext}`;
  writeFileSync(path.join(dir, filename), buffer);
  return `${PUBLIC_PREFIX}${filename}`;
}

export function deleteSizeDrawingStyleImage(stored: string | null | undefined): void {
  const abs = resolveSizeDrawingStylePathOnDisk(stored);
  if (abs) unlinkSync(abs);
  const dir = styleDir();
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(FILE_STEM)) {
      unlinkSync(path.join(dir, name));
    }
  }
}
