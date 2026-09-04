import ExternalCatalogSource, {
  DEFAULT_LIGHTX_BASE_URL,
} from '../models/ExternalCatalogSource';
import { assertPublicHttpUrl, isPartnerHost } from './ssrf';

export type LightXCategory = {
  id?: string;
  name?: string;
};

export type LightXPhotos = {
  main?: string | null;
  size?: string | null;
  logo?: string | null;
  other1?: string | null;
  other2?: string | null;
  other3?: string | null;
};

export type LightXProduct = {
  id: string;
  brand?: string;
  vendor?: string;
  vendorProductCode?: string;
  leadTime?: string;
  model?: string;
  article?: string;
  category?: LightXCategory | null;
  origin?: string;
  mounting?: string;
  finish?: string;
  tilting?: string;
  ipRating?: string;
  size?: string;
  cutHole?: string;
  lamp?: string;
  socket?: string;
  wattage?: string | number;
  lumen?: string | number;
  colorTemperature?: string;
  beamAngle?: string;
  cri?: string;
  control?: string;
  driver?: string;
  driverType?: string;
  powerFactor?: string;
  lifecycleStatus?: string;
  photos?: LightXPhotos | null;
  updatedAt?: string;
};

export type LightXProductList = {
  products: LightXProduct[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export async function getActiveCatalogSource(): Promise<ExternalCatalogSource> {
  let source = await ExternalCatalogSource.findOne({ where: { is_active: true } });
  if (!source) {
    source = await ExternalCatalogSource.findOne();
  }
  if (!source) {
    source = await ExternalCatalogSource.create({
      name: 'LightX',
      base_url: DEFAULT_LIGHTX_BASE_URL,
      is_active: true,
    });
  }
  return source;
}

function sourceHasCredentials(source: ExternalCatalogSource): boolean {
  return Boolean(source.api_key && source.api_password);
}

export function serializeSourceSettings(source: ExternalCatalogSource) {
  return {
    id: source.id,
    name: source.name,
    base_url: source.base_url || DEFAULT_LIGHTX_BASE_URL,
    api_key: source.api_key || '',
    password_saved: Boolean(source.api_password),
    is_active: source.is_active,
  };
}

async function lightxRequest(
  source: ExternalCatalogSource,
  pathAndQuery: string
): Promise<{ status: number; json: any }> {
  if (!sourceHasCredentials(source)) {
    const err = new Error('LightX API key and password are not configured.');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const base = (source.base_url || DEFAULT_LIGHTX_BASE_URL).replace(/\/$/, '');
  const url = `${base}${pathAndQuery.startsWith('/') ? pathAndQuery : `/${pathAndQuery}`}`;
  const parsed = await assertPublicHttpUrl(url);
  if (!isPartnerHost(parsed.hostname, source.base_url || DEFAULT_LIGHTX_BASE_URL)) {
    const err = new Error('Partner API host is not allowed.');
    (err as Error & { status?: number }).status = 400;
    throw err;
  }

  const response = await fetch(parsed.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'X-API-Key': source.api_key as string,
      'X-API-Password': source.api_password as string,
    },
  });

  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { error: text || 'Invalid JSON from LightX' };
  }

  return { status: response.status, json };
}

export async function fetchLightXProducts(
  source: ExternalCatalogSource,
  params: { search?: string; page?: string; limit?: string; updatedSince?: string }
): Promise<LightXProductList> {
  const query = new URLSearchParams();
  query.set('page', params.page || '1');
  query.set('limit', params.limit || '50');
  if (params.search) query.set('search', params.search);
  if (params.updatedSince) query.set('updatedSince', params.updatedSince);

  const { status, json } = await lightxRequest(source, `/products?${query.toString()}`);
  if (status === 401) {
    const err = new Error('Unauthorized');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  if (status === 429) {
    const err = new Error('LightX rate limit exceeded');
    (err as Error & { status?: number }).status = 429;
    throw err;
  }
  if (status < 200 || status >= 300) {
    const err = new Error(json?.error || `LightX error (${status})`);
    (err as Error & { status?: number }).status = status;
    throw err;
  }

  return {
    products: Array.isArray(json?.products) ? json.products : [],
    page: Number(json?.page) || 1,
    limit: Number(json?.limit) || 50,
    total: Number(json?.total) || 0,
    totalPages: Number(json?.totalPages) || 1,
  };
}

export async function fetchLightXProductById(
  source: ExternalCatalogSource,
  id: string
): Promise<LightXProduct> {
  const { status, json } = await lightxRequest(source, `/products/${encodeURIComponent(id)}`);
  if (status === 404) {
    const err = new Error('Partner product not found');
    (err as Error & { status?: number }).status = 404;
    throw err;
  }
  if (status === 401) {
    const err = new Error('Unauthorized');
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  if (status < 200 || status >= 300) {
    const err = new Error(json?.error || `LightX error (${status})`);
    (err as Error & { status?: number }).status = status;
    throw err;
  }

  const product = json?.id ? json : json?.product || json?.data;
  if (!product?.id) {
    throw new Error('Invalid product payload from LightX');
  }
  return product as LightXProduct;
}

const PARTNER_PHOTO_TTL_MS = 15 * 60 * 1000;
const partnerPhotoCache = new Map<string, { url: string; exp: number }>();

export function rememberPartnerPhotoUrl(id: string, url: string | null | undefined) {
  if (!id || !url) return;
  partnerPhotoCache.set(String(id), { url, exp: Date.now() + PARTNER_PHOTO_TTL_MS });
}

export function getCachedPartnerPhotoUrl(id: string): string | null {
  const row = partnerPhotoCache.get(String(id));
  if (!row) return null;
  if (row.exp < Date.now()) {
    partnerPhotoCache.delete(String(id));
    return null;
  }
  return row.url;
}

function lightxOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return 'https://lightx.synology.me';
  }
}

export function resolveLightXAssetUrl(baseUrl: string, asset: string): string {
  const trimmed = String(asset || '').trim();
  if (!trimmed) return trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const origin = lightxOrigin(baseUrl || DEFAULT_LIGHTX_BASE_URL);
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`;
  return new URL(trimmed, `${origin}/`).toString();
}

export async function fetchLightXAsset(
  source: ExternalCatalogSource,
  assetUrl: string
): Promise<{ ok: true; status: number; contentType: string; buffer: Buffer } | { ok: false; status: number }> {
  const url = resolveLightXAssetUrl(source.base_url || DEFAULT_LIGHTX_BASE_URL, assetUrl);
  let parsed: URL;
  try {
    parsed = await assertPublicHttpUrl(url);
  } catch {
    return { ok: false, status: 400 };
  }

  if (!isPartnerHost(parsed.hostname, source.base_url || DEFAULT_LIGHTX_BASE_URL)) {
    return { ok: false, status: 400 };
  }

  const headers: Record<string, string> = { Accept: 'image/*,*/*' };
  if (source.api_key && source.api_password) {
    headers['X-API-Key'] = source.api_key;
    headers['X-API-Password'] = source.api_password;
  }

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(20000),
    });
  } catch {
    return { ok: false, status: 504 };
  }
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  if (!contentType.startsWith('image/') && !contentType.startsWith('application/octet-stream')) {
    return { ok: false, status: 502 };
  }

  return {
    ok: true,
    status: 200,
    contentType: contentType.startsWith('image/') ? contentType : 'image/jpeg',
    buffer: Buffer.from(await response.arrayBuffer()),
  };
}

export async function testLightXConnection(source: ExternalCatalogSource): Promise<{
  ok: boolean;
  status: number;
  total?: number;
  error?: string;
}> {
  try {
    const list = await fetchLightXProducts(source, { page: '1', limit: '1' });
    return { ok: true, status: 200, total: list.total };
  } catch (error) {
    const status = (error as Error & { status?: number }).status || 500;
    return {
      ok: false,
      status,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
