import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import path from 'path';
import { photometricPublicRoot } from '../photometric/beamLibraryServer';

const DIR_REL = ['images', 'ai'] as const;
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

export type AiStyleImageStore = {
  resolvePathOnDisk: (stored: string | null | undefined) => string | null;
  readDataUrl: (stored: string | null | undefined) => string | null;
  writeImage: (buffer: Buffer, mimeType: string) => string;
  deleteImage: (stored: string | null | undefined) => void;
};

function styleDir(): string {
  return path.join(photometricPublicRoot(), ...DIR_REL);
}

export function createAiStyleImageStore(fileStem: string): AiStyleImageStore {
  function isSafeStoredPath(stored: string): boolean {
    const normalized = stored.trim();
    if (!normalized.startsWith(PUBLIC_PREFIX)) return false;
    if (normalized.includes('..') || normalized.includes('\\') || normalized.includes('\0')) return false;
    const name = path.posix.basename(normalized);
    return name.startsWith(fileStem);
  }

  function resolvePathOnDisk(stored: string | null | undefined): string | null {
    const value = String(stored || '').trim();
    if (!isSafeStoredPath(value)) return null;
    const abs = path.join(photometricPublicRoot(), ...value.replace(/^\//, '').split('/'));
    if (!existsSync(abs)) return null;
    return abs;
  }

  function readDataUrl(stored: string | null | undefined): string | null {
    const abs = resolvePathOnDisk(stored);
    if (!abs) return null;
    const ext = path.extname(abs).toLowerCase();
    const mime = EXT_MIME[ext] || 'image/png';
    const buf = readFileSync(abs);
    return `data:${mime};base64,${buf.toString('base64')}`;
  }

  function writeImage(buffer: Buffer, mimeType: string): string {
    const ext = MIME_EXT[mimeType];
    if (!ext) throw new Error('Only JPEG, PNG, WebP, and GIF images are allowed');
    const dir = styleDir();
    mkdirSync(dir, { recursive: true });
    for (const name of readdirSync(dir)) {
      if (name.startsWith(fileStem)) {
        unlinkSync(path.join(dir, name));
      }
    }
    const filename = `${fileStem}${ext}`;
    writeFileSync(path.join(dir, filename), buffer);
    return `${PUBLIC_PREFIX}${filename}`;
  }

  function deleteImage(stored: string | null | undefined): void {
    const abs = resolvePathOnDisk(stored);
    if (abs) unlinkSync(abs);
    const dir = styleDir();
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir)) {
      if (name.startsWith(fileStem)) {
        unlinkSync(path.join(dir, name));
      }
    }
  }

  return { resolvePathOnDisk, readDataUrl, writeImage, deleteImage };
}

const sizeDrawingStyle = createAiStyleImageStore('size-drawing-style');
const productPhotoStyle = createAiStyleImageStore('product-photo-style');

export const resolveSizeDrawingStylePathOnDisk = sizeDrawingStyle.resolvePathOnDisk;
export const readSizeDrawingStyleDataUrl = sizeDrawingStyle.readDataUrl;
export const writeSizeDrawingStyleImage = sizeDrawingStyle.writeImage;
export const deleteSizeDrawingStyleImage = sizeDrawingStyle.deleteImage;

export const resolveProductPhotoStylePathOnDisk = productPhotoStyle.resolvePathOnDisk;
export const readProductPhotoStyleDataUrl = productPhotoStyle.readDataUrl;
export const writeProductPhotoStyleImage = productPhotoStyle.writeImage;
export const deleteProductPhotoStyleImage = productPhotoStyle.deleteImage;
