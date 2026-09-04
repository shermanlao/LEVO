import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import ExternalCatalogSource from '../models/ExternalCatalogSource';
import { fetchLightXAsset, getActiveCatalogSource } from './lightxClient';
import {
  isRemoteHttpUrl,
  PRODUCT_IMAGE_FIELDS,
  ProductImageField,
} from './productMedia';

export type CachedProductAsset = {
  contentType: string;
  buffer: Buffer;
};

type MemoryEntry = CachedProductAsset & { sourceUrl: string };

const CACHE_DIR = path.join(__dirname, '..', '..', 'cache', 'product-media');
const MAX_MEMORY_ENTRIES = 40;
const memory = new Map<string, MemoryEntry>();
const inflight = new Map<string, Promise<CachedProductAsset | null>>();

function cacheKey(productId: number, field: string, sourceUrl: string): string {
  const hash = crypto.createHash('sha1').update(sourceUrl).digest('hex').slice(0, 16);
  return `${productId}-${field}-${hash}`;
}

function remember(key: string, entry: MemoryEntry) {
  if (memory.has(key)) memory.delete(key);
  memory.set(key, entry);
  while (memory.size > MAX_MEMORY_ENTRIES) {
    const oldest = memory.keys().next().value;
    if (oldest == null) break;
    memory.delete(oldest);
  }
}

async function readDisk(key: string): Promise<MemoryEntry | null> {
  try {
    const metaRaw = await fs.readFile(path.join(CACHE_DIR, `${key}.json`), 'utf8');
    const meta = JSON.parse(metaRaw) as { contentType?: string; sourceUrl?: string };
    if (!meta.contentType || !meta.sourceUrl) return null;
    const buffer = await fs.readFile(path.join(CACHE_DIR, `${key}.bin`));
    if (!buffer.length) return null;
    return { contentType: meta.contentType, sourceUrl: meta.sourceUrl, buffer };
  } catch {
    return null;
  }
}

async function writeDisk(key: string, entry: MemoryEntry) {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${key}.bin`), entry.buffer);
    await fs.writeFile(
      path.join(CACHE_DIR, `${key}.json`),
      JSON.stringify({ contentType: entry.contentType, sourceUrl: entry.sourceUrl })
    );
  } catch {
    /* cache write is best-effort */
  }
}

export async function getOrFetchProductAsset(
  source: ExternalCatalogSource,
  productId: number,
  field: ProductImageField,
  sourceUrl: string
): Promise<CachedProductAsset | null> {
  const key = cacheKey(productId, field, sourceUrl);
  const cached = memory.get(key);
  if (cached) return { contentType: cached.contentType, buffer: cached.buffer };

  const pending = inflight.get(key);
  if (pending) return pending;

  const task = (async () => {
    const disk = await readDisk(key);
    if (disk) {
      remember(key, disk);
      return { contentType: disk.contentType, buffer: disk.buffer };
    }

    const asset = await fetchLightXAsset(source, sourceUrl);
    if (!asset.ok) return null;

    const entry: MemoryEntry = {
      contentType: asset.contentType,
      buffer: asset.buffer,
      sourceUrl,
    };
    remember(key, entry);
    await writeDisk(key, entry);
    return { contentType: entry.contentType, buffer: entry.buffer };
  })();

  inflight.set(key, task);
  try {
    return await task;
  } finally {
    inflight.delete(key);
  }
}

function productFieldValue(product: any, field: ProductImageField): string {
  if (typeof product?.get === 'function') {
    return String(product.get(field) || '');
  }
  return String(product?.[field] || '');
}

function productIdOf(product: any): number {
  if (typeof product?.get === 'function') {
    return Number(product.get('id'));
  }
  return Number(product?.id);
}

/** Prefetch remote photos after a product JSON response so the browser often hits cache. */
export function warmProductRemoteMedia(product: any) {
  const id = productIdOf(product);
  if (!Number.isInteger(id) || id < 1) return;

  void (async () => {
    try {
      const source = await getActiveCatalogSource();
      for (const field of PRODUCT_IMAGE_FIELDS) {
        const stored = productFieldValue(product, field);
        if (!isRemoteHttpUrl(stored)) continue;
        await getOrFetchProductAsset(source, id, field, stored);
      }
    } catch {
      /* warming is best-effort */
    }
  })();
}
