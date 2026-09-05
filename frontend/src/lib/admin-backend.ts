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
import { internalApiHeaders } from '@/lib/internal-api';
import {
  METHOD_NOT_ALLOWED_STATUS,
  UNAUTHORIZED_STATUS,
  isPublicCatalogReadMethod,
} from '@shared/admin-backend-path';

export { getExpressBaseUrl };
export {
  ADMIN_BACKEND_PREFIXES,
  isAllowedAdminBackendPath,
} from '@shared/admin-backend-path';

type LiveSession = { ok: boolean; epoch: number; role: string; active: boolean };

const liveSessionCache = new Map<string, { live: LiveSession; until: number }>();

async function lookupLiveSession(username: string): Promise<LiveSession | null> {
  const now = Date.now();
  const cached = liveSessionCache.get(username);
  if (cached && cached.until > now) return cached.live;

  for (const base of expressBaseCandidates()) {
    try {
      const response = await fetch(
        `${base}/api/auth/session-check?username=${encodeURIComponent(username)}`,
        {
          headers: internalApiHeaders({ Accept: 'application/json' }),
          cache: 'no-store',
          signal: AbortSignal.timeout(5000),
        }
      );
      if (!response.ok) continue;
      const json = (await response.json()) as { epoch?: number; role?: string; active?: boolean };
      const live: LiveSession = {
        ok: true,
        epoch: Number(json.epoch) || 0,
        role: String(json.role || ''),
        active: Boolean(json.active),
      };
      liveSessionCache.set(username, { live, until: now + 30_000 });
      return live;
    } catch {
      /* try next base */
    }
  }
  return null;
}

export async function assertLiveSession(session: AdminSession): Promise<boolean> {
  const live = await lookupLiveSession(session.username);
  if (!live || !live.active) return false;
  return live.epoch === session.epoch;
}

export async function requireAdminSession(request: NextRequest): Promise<NextResponse | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: UNAUTHORIZED_STATUS });
  }
  const live = await assertLiveSession(session);
  if (!live) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: UNAUTHORIZED_STATUS });
  }
  return null;
}

export async function readAdminSession(request: NextRequest): Promise<AdminSession | null> {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);
  if (!session) return null;
  if (!(await assertLiveSession(session))) return null;
  return session;
}

export async function requireAdminRole(request: NextRequest): Promise<NextResponse | null> {
  const session = await readAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: UNAUTHORIZED_STATUS });
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
  const headers: Record<string, string> = internalApiHeaders();
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
  return NextResponse.json({ error: 'Method not allowed' }, { status: METHOD_NOT_ALLOWED_STATUS, headers });
}

export async function proxyPublicGetToExpress(
  request: NextRequest,
  expressPath: string,
  opts?: { timeoutMs?: number }
): Promise<NextResponse> {
  if (!isPublicCatalogReadMethod(request.method)) {
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
