import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, SESSION_COOKIE_OPTIONS, verifySessionValue } from '@/lib/admin-session';
import { invalidateLiveSession } from '@/lib/admin-backend';
import { expressBaseCandidates } from '@/lib/api-config';
import { internalApiHeaders } from '@/lib/internal-api';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);
  if (session?.username) {
    invalidateLiveSession(session.username);
    for (const base of expressBaseCandidates()) {
      try {
        await fetch(`${base}/api/auth/logout`, {
          method: 'POST',
          headers: internalApiHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ username: session.username }),
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        });
        break;
      } catch {
        /* try the next Express base */
      }
    }
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, '', {
    ...SESSION_COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
