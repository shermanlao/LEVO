import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache', 'generated-pdf');

export function pdfCacheKey(parts: Array<string | number | null | undefined>): string {
  const hash = crypto.createHash('sha1').update(parts.map((part) => String(part ?? '')).join('|')).digest('hex');
  return hash;
}

export async function readCachedPdf(key: string): Promise<Buffer | null> {
  try {
    const buffer = await fs.readFile(path.join(CACHE_DIR, `${key}.pdf`));
    return buffer.length ? buffer : null;
  } catch {
    return null;
  }
}

export async function writeCachedPdf(key: string, pdf: Buffer): Promise<void> {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${key}.pdf`), pdf);
  } catch {
    /* cache write is best-effort */
  }
}

export async function clearGeneratedPdfCache(): Promise<void> {
  try {
    await fs.rm(CACHE_DIR, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}
