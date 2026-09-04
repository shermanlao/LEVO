import { NextRequest, NextResponse } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionValue,
  type AdminRole,
} from '@/lib/admin-session';
import { consumeRateLimit } from '@/lib/rate-limit';
import { expressBaseCandidates } from '@/lib/api-config';

function isRole(value: unknown): value is AdminRole {
  return value === 'admin' || value === 'staff';
}

async function verifyWithExpress(
  username: string,
  password: string
): Promise<{ status: number; json: { username?: string; role?: string; error?: string } }> {
  let lastError = 'Could not reach the API server';
  for (const base of expressBaseCandidates()) {
    try {
      const response = await fetch(`${base}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        cache: 'no-store',
        signal: AbortSignal.timeout(15000),
      });
      const json = (await response.json().catch(() => ({}))) as {
        username?: string;
        role?: string;
        error?: string;
      };
      return { status: response.status, json };
    } catch (error) {
      lastError = error instanceof Error ? error.message : lastError;
    }
  }
  return { status: 502, json: { error: lastError } };
}

export async function POST(request: NextRequest) {
  const limited = consumeRateLimit(request, 'admin-login', {
    windowMs: 15 * 60 * 1000,
    max: 12,
  });
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many login attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    );
  }

  let username = '';
  let password = '';
  try {
    const body = await request.json();
    username = String(body?.username ?? body?.id ?? '').trim();
    password = String(body?.password ?? '');
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const result = await verifyWithExpress(username, password);
  if (result.status === 502) {
    return NextResponse.json(
      {
        error:
          'Could not reach the API server. From the repo root run npm run dev (keep it running).',
      },
      { status: 502 }
    );
  }
  if (result.status !== 200 || !result.json.username || !isRole(result.json.role)) {
    return NextResponse.json(
      { error: result.json.error || 'Invalid ID or password' },
      { status: 401 }
    );
  }

  const value = await createSessionValue(result.json.username, result.json.role);
  const response = NextResponse.json({ ok: true, username: result.json.username, role: result.json.role });
  response.cookies.set(ADMIN_SESSION_COOKIE, value, SESSION_COOKIE_OPTIONS);
  return response;
}
