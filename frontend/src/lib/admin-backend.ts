import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  verifySessionValue,
  type AdminSession,
} from '@/lib/admin-session';
import { expressBaseCandidates, getExpressBaseUrl } from '@/lib/api-config';
import {
  CATALOG_REVALIDATE_SECONDS,
  PUBLIC_CACHE_CONTROL,
  tagsForExpressPath,
} from '@/lib/catalog-cache';

export { getExpressBaseUrl };

export const ADMIN_BACKEND_PREFIXES = [
  'products',
  'product-types',
  'product-series',
  'projects',
  'upload',
  'variant-options',
] as const;

export function isAllowedAdminBackendPath(suffix: string): boolean {
  const first = suffix.split('/').filter(Boolean)[0] || '';
  return (ADMIN_BACKEND_PREFIXES as readonly string[]).includes(first);
}

export async function requireAdminSession(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (!(await verifySessionValue(token))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function readAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionValue(token);
}

export async function requireAdminRole(request: NextRequest): Promise<NextResponse | null> {
  const session = await readAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (session.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return null;
}

function errorCause(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: { code?: string; message?: string } }).cause;
    return cause?.code || cause?.message || error.message;
  }
  return String(error);
}

export async function forwardToExpress(
  request: NextRequest,
  expressPath: string,
  opts?: { timeoutMs?: number; cacheMode?: 'public' | 'no-store' }
): Promise<NextResponse> {
  const incoming = new URL(request.url);
  const headers: Record<string, string> = {};
  const accept = request.headers.get('Accept');
  headers.Accept = accept && accept.length > 0 ? accept : 'application/json';

  let body: ArrayBuffer | undefined;
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers['Content-Type'] = contentType;
    body = await request.arrayBuffer();
  }

  const timeoutMs = opts?.timeoutMs ?? 60000;
  const cacheMode = opts?.cacheMode ?? 'no-store';
  const cacheInit: RequestInit & { next?: { revalidate: number; tags: string[] } } =
    cacheMode === 'public'
      ? { next: { revalidate: CATALOG_REVALIDATE_SECONDS, tags: tagsForExpressPath(expressPath) } }
      : { cache: 'no-store' };

  let lastError: unknown;
  for (const base of expressBaseCandidates()) {
    const target = `${base}${expressPath}${incoming.search}`;
    try {
      const response = await fetch(target, {
        method: request.method,
        headers,
        body,
        ...cacheInit,
        signal: AbortSignal.timeout(timeoutMs),
      });
      const buffer = await response.arrayBuffer();
      const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
      const out = new NextResponse(buffer, {
        status: response.status,
        headers: {
          'Content-Type': contentType,
        },
      });
      const cacheControl =
        response.headers.get('Cache-Control') ||
        (cacheMode === 'public' ? PUBLIC_CACHE_CONTROL : null);
      if (cacheControl) out.headers.set('Cache-Control', cacheControl);
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) out.headers.set('Content-Disposition', disposition);
      return out;
    } catch (error) {
      lastError = error;
      console.warn(`[admin-proxy] ${request.method} ${target} failed:`, errorCause(error));
    }
  }

  return NextResponse.json(
    {
      error:
        `Could not reach the API server (${errorCause(lastError)}). ` +
        'From the repo root run npm run dev:backend (keep it running) or npm run dev:all.',
    },
    { status: 502 }
  );
}

export async function proxyToExpress(
  request: NextRequest,
  expressPath: string,
  opts?: { timeoutMs?: number; cacheMode?: 'public' | 'no-store' }
): Promise<NextResponse> {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  return forwardToExpress(request, expressPath, { ...opts, cacheMode: opts?.cacheMode ?? 'no-store' });
}

export function methodNotAllowed(allow = 'GET, HEAD'): NextResponse {
  const headers: Record<string, string> = {};
  if (allow) headers.Allow = allow;
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers });
}

export async function proxyPublicGetToExpress(
  request: NextRequest,
  expressPath: string,
  opts?: { timeoutMs?: number }
): Promise<NextResponse> {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return methodNotAllowed();
  }
  return forwardToExpress(request, expressPath, { ...opts, cacheMode: 'public' });
}

type CatchAllContext = { params: Promise<{ path?: string[] }> };

export function createPublicCatalogProxy(
  basePath: string,
  opts?: { idQueryToPath?: (id: string) => string }
) {
  async function GET(request: NextRequest, context: CatchAllContext) {
    const params = await Promise.resolve(context.params);
    const suffix = (params.path || []).join('/');
    const id = request.nextUrl.searchParams.get('id');
    if (!suffix && id && opts?.idQueryToPath) {
      return proxyPublicGetToExpress(request, opts.idQueryToPath(id));
    }
    const expressPath = suffix ? `${basePath}/${suffix}` : basePath;
    return proxyPublicGetToExpress(request, expressPath);
  }

  const mutating = async () => methodNotAllowed();
  return {
    GET,
    HEAD: GET,
    POST: mutating,
    PUT: mutating,
    PATCH: mutating,
    DELETE: mutating,
  };
}

export function createAdminProxy(
  apiPrefix: string,
  opts?: { timeoutMs?: number; encodeTail?: boolean; longTimeoutPattern?: RegExp; longTimeoutMs?: number }
) {
  async function handle(request: NextRequest, context: CatchAllContext) {
    const params = await Promise.resolve(context.params);
    const segments = params.path || [];
    const suffix = opts?.encodeTail
      ? segments.map((part, index) => (index === 0 ? part : encodeURIComponent(part))).join('/')
      : segments.join('/');
    const long = opts?.longTimeoutPattern?.test(suffix);
    return proxyToExpress(request, `${apiPrefix}/${suffix}`, {
      timeoutMs: long ? opts?.longTimeoutMs ?? 300000 : opts?.timeoutMs ?? 60000,
    });
  }
  return {
    GET: handle,
    PUT: handle,
    POST: handle,
    PATCH: handle,
    DELETE: handle,
  };
}
