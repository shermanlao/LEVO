import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { forwardToExpress, methodNotAllowed } from '@/lib/admin-backend';
import { isPublicCatalogReadMethod } from '@shared/admin-backend-path';

type CatchAllContext = { params: Promise<{ path?: string[] }> };

function rateLimited(request: NextRequest, name: string, opts: { windowMs: number; max: number }) {
  const limited = consumeRateLimit(request, name, opts);
  if (limited.ok) return null;
  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
  );
}

function expressPath(basePath: string, suffix: string): string {
  return suffix ? `${basePath}/${suffix}` : basePath;
}

export function createRateLimitedPublicGetProxy(
  basePath: string,
  opts: { name: string; windowMs: number; max: number; timeoutMs?: number }
) {
  async function GET(request: NextRequest, context: CatchAllContext) {
    if (!isPublicCatalogReadMethod(request.method)) {
      return methodNotAllowed();
    }
    const blocked = rateLimited(request, opts.name, { windowMs: opts.windowMs, max: opts.max });
    if (blocked) return blocked;
    const params = await Promise.resolve(context.params);
    const suffix = (params.path || []).join('/');
    return forwardToExpress(request, expressPath(basePath, suffix), {
      cacheMode: 'public',
      timeoutMs: opts.timeoutMs ?? 60000,
    });
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

export function createContactProxy() {
  async function GET(request: NextRequest, context: CatchAllContext) {
    if (!isPublicCatalogReadMethod(request.method)) {
      return methodNotAllowed();
    }
    const params = await Promise.resolve(context.params);
    const suffix = (params.path || []).join('/');
    return forwardToExpress(request, expressPath('/api/contact', suffix), { cacheMode: 'public' });
  }

  async function POST(request: NextRequest, context: CatchAllContext) {
    const params = await Promise.resolve(context.params);
    const suffix = (params.path || []).join('/');
    if (suffix !== 'inquiries') {
      return methodNotAllowed('GET, HEAD, POST');
    }
    const blocked = rateLimited(request, 'contact', { windowMs: 60 * 60 * 1000, max: 8 });
    if (blocked) return blocked;
    return forwardToExpress(request, '/api/contact/inquiries', { cacheMode: 'no-store' });
  }

  const mutating = async () => methodNotAllowed('GET, HEAD, POST');
  return {
    GET,
    HEAD: GET,
    POST,
    PUT: mutating,
    PATCH: mutating,
    DELETE: mutating,
  };
}
