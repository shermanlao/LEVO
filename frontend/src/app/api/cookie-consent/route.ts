import { NextRequest, NextResponse } from 'next/server';
import { forwardToExpress, methodNotAllowed } from '@/lib/admin-backend';
import { consumeRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const HOUR = 60 * 60 * 1000;

export function GET(request: NextRequest) {
  return forwardToExpress(request, '/api/cookie-consent', { cacheMode: 'no-store' });
}

export function HEAD(request: NextRequest) {
  return GET(request);
}

export function POST(request: NextRequest) {
  const limited = consumeRateLimit(request, 'cookie-consent', { windowMs: HOUR, max: 20 });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }
  return forwardToExpress(request, '/api/cookie-consent', { cacheMode: 'no-store' });
}

const other = () => methodNotAllowed('GET, HEAD, POST');

export { other as PUT, other as PATCH, other as DELETE };
