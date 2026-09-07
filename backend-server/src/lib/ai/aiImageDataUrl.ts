import { existsSync, readFileSync } from 'fs';
import path from 'path';
import sharp from 'sharp';
import { photometricPublicRoot } from '../photometric/beamLibraryServer';
import { localProductImageCandidates } from '../productMedia';
import { isAllowedImageBuffer } from '../shared/image-magic';

export const AI_IMAGE_MAX_EDGE = 1600;

export function parseImageDataUrl(dataUrl: string): { mimeType: string; base64: string } {
  const match = dataUrl.trim().match(/^data:([^;,]+)(?:;charset=[^;,]+)?;base64,(.+)$/i);
  if (!match) {
    throw new Error('Expected a base64 data URL for the image');
  }
  let mimeType = match[1].trim().toLowerCase();
  if (mimeType === 'image/jpg') mimeType = 'image/jpeg';
  return { mimeType, base64: match[2].replace(/\s/g, '') };
}

export async function compactAiImageDataUrl(
  dataUrl: string,
  maxEdge = AI_IMAGE_MAX_EDGE
): Promise<string> {
  const { base64 } = parseImageDataUrl(dataUrl);
  const input = Buffer.from(base64, 'base64');
  if (!isAllowedImageBuffer(input)) {
    throw new Error('Image is not a valid JPEG, PNG, WebP, or GIF');
  }
  const out = await sharp(input)
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toBuffer();
  return `data:image/jpeg;base64,${out.toString('base64')}`;
}

export function readLocalPublicImageDataUrl(stored: string): string | null {
  const value = stored.trim();
  if (!value || value.includes('..') || value.includes('\\') || value.includes('\0')) return null;
  const root = path.resolve(photometricPublicRoot());
  const candidates = localProductImageCandidates(value);
  if (value.startsWith('/images/') && !candidates.includes(value)) candidates.push(value);
  for (const rel of candidates) {
    if (!rel.startsWith('/') || rel.includes('..')) continue;
    const abs = path.resolve(path.join(root, ...rel.replace(/^\//, '').split('/')));
    const relativeToRoot = path.relative(root, abs);
    if (!relativeToRoot || relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) continue;
    if (!existsSync(abs)) continue;
    const buf = readFileSync(abs);
    if (!isAllowedImageBuffer(buf)) continue;
    const ext = path.extname(abs).toLowerCase();
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.webp'
          ? 'image/webp'
          : ext === '.gif'
            ? 'image/gif'
            : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  }
  return null;
}

export async function resolveAiSourceImageDataUrl(opts: {
  imageDataUrl?: string;
  imageUrl?: string;
}): Promise<string> {
  const dataUrl = String(opts.imageDataUrl || '').trim();
  if (dataUrl.startsWith('data:')) return compactAiImageDataUrl(dataUrl);
  const fromDisk = opts.imageUrl ? readLocalPublicImageDataUrl(opts.imageUrl) : null;
  if (fromDisk) return compactAiImageDataUrl(fromDisk);
  throw new Error('Image data URL is required');
}
