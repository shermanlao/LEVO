import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { expressBaseCandidates } from '@/lib/api-config';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';

export const dynamic = 'force-dynamic';

const COOKIE = 'levo_vid';
const YEAR_SEC = 365 * 24 * 60 * 60;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isBot(ua: string): boolean {
  return /bot|crawler|spider|slurp|bingpreview|facebookexternalhit|linkedinbot|embedly|quora|pinterest|redditbot|applebot|semrush|ahrefs|bytespider/i.test(
    ua
  );
}

function sanitizePath(raw: string): string | null {
  let path = String(raw || '').trim();
  if (!path.startsWith('/')) path = `/${path}`;
  const q = path.indexOf('?');
  if (q >= 0) path = path.slice(0, q);
  const hash = path.indexOf('#');
  if (hash >= 0) path = path.slice(0, hash);
  if (path.length > 200) path = path.slice(0, 200);
  const lower = path.toLowerCase();
  if (lower.startsWith('/admin') || lower.startsWith('/api') || lower.startsWith('/_next')) {
    return null;
  }
  if (/\.(ico|png|jpe?g|gif|webp|svg|css|js|map|woff2?|ttf|txt|xml|json)$/i.test(path)) {
    return null;
  }
  return path || null;
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: YEAR_SEC,
  };
}

async function postEvent(visitorKey: string, path: string): Promise<boolean> {
  const body = JSON.stringify({ visitor_key: visitorKey, path });
  for (const base of expressBaseCandidates()) {
    try {
      const response = await fetch(`${base}/api/visitor-events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok || response.status === 204) return true;
    } catch {
      /* try next base */
    }
  }
  return false;
}

export async function POST(request: NextRequest) {
  const limited = consumeRateLimit(request, 'visitor-hit', { windowMs: 60 * 1000, max: 60 });
  if (!limited.ok) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  const ua = request.headers.get('user-agent') || '';
  if (isBot(ua)) {
    return NextResponse.json({ ok: true, skipped: 'bot' });
  }

  const staffSession = await verifySessionValue(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
  if (staffSession) {
    return NextResponse.json({ ok: true, skipped: 'staff' });
  }

  let rawPath = '';
  try {
    const body = await request.json();
    rawPath = String(body?.path || '');
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const path = sanitizePath(rawPath);
  if (!path) {
    return NextResponse.json({ ok: true, skipped: 'path' });
  }

  let visitorKey = request.cookies.get(COOKIE)?.value || '';
  if (!UUID_RE.test(visitorKey)) {
    visitorKey = crypto.randomUUID();
  }

  await postEvent(visitorKey, path);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, visitorKey, cookieOptions());
  return response;
}
