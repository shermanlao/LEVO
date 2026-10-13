import { NextRequest, NextResponse } from 'next/server';
import { consumeRateLimit } from '@/lib/rate-limit';
import { expressBaseCandidates } from '@/lib/api-config';
import { internalApiHeaders } from '@/lib/internal-api';
import { ADMIN_SESSION_COOKIE, cookieIsSecure, verifySessionValue } from '@/lib/admin-session';
import { countryFromRequestIp } from '@/lib/visitor-country';
import {
  sanitizeVisitorCountry,
  sanitizeVisitorDuration,
  sanitizeVisitorPath,
  sanitizeVisitorQuery,
  sanitizeVisitorReferrer,
  visitorSiteHosts,
} from '@shared/visitor-hit';

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

function cookieOptions() {
  return {
    httpOnly: true,
    secure: cookieIsSecure(),
    sameSite: 'lax' as const,
    path: '/',
    maxAge: YEAR_SEC,
  };
}

function siteHosts(): string[] {
  return visitorSiteHosts(process.env.SITE_ORIGIN || process.env.NEXT_PUBLIC_SITE_URL || '');
}

async function postEvent(payload: {
  visitor_key: string;
  path: string;
  country?: string | null;
  referrer?: string | null;
  query?: string | null;
  duration_ms?: number;
}): Promise<boolean> {
  const body = JSON.stringify(payload);
  for (const base of expressBaseCandidates()) {
    try {
      const response = await fetch(`${base}/api/visitor-events`, {
        method: 'POST',
        headers: internalApiHeaders({ 'Content-Type': 'application/json' }),
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
  let rawQuery = '';
  let rawReferrer = '';
  let durationMs: number | null = null;
  try {
    const body = await request.json();
    rawPath = String(body?.path || '');
    rawQuery = String(body?.query || '');
    rawReferrer = String(body?.referrer || '');
    durationMs = sanitizeVisitorDuration(body?.duration_ms);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const path = sanitizeVisitorPath(rawPath);
  if (!path) {
    return NextResponse.json({ ok: true, skipped: 'path' });
  }

  let visitorKey = request.cookies.get(COOKIE)?.value || '';
  if (!UUID_RE.test(visitorKey)) {
    if (durationMs != null) {
      return NextResponse.json({ ok: true, skipped: 'stay' });
    }
    visitorKey = crypto.randomUUID();
  }

  if (durationMs != null) {
    await postEvent({ visitor_key: visitorKey, path, duration_ms: durationMs });
    return NextResponse.json({ ok: true });
  }

  const country = sanitizeVisitorCountry(countryFromRequestIp(request.headers.get('x-real-ip')) || '');
  const referrer = sanitizeVisitorReferrer(rawReferrer, siteHosts());
  const query = sanitizeVisitorQuery(rawQuery);

  await postEvent({ visitor_key: visitorKey, path, country, referrer, query });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE, visitorKey, cookieOptions());
  return response;
}
