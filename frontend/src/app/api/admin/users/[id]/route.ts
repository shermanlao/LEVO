import { NextRequest } from 'next/server';
import {
  forwardToExpress,
  getLiveAdminAccess,
  invalidateLiveSession,
  requireAdminRole,
} from '@/lib/admin-backend';
import {
  ADMIN_SESSION_COOKIE,
  SESSION_COOKIE_OPTIONS,
  createSessionValue,
} from '@/lib/admin-session';
import { isAdminRole } from '@shared/admin-roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, context: RouteContext) {
  const forbidden = await requireAdminRole(request);
  if (forbidden) return forbidden;
  const access = await getLiveAdminAccess(request);
  const { id } = await context.params;
  const response = await forwardToExpress(request, `/api/admin-users/${encodeURIComponent(id)}`);
  if (access) invalidateLiveSession(access.username);
  if (!response.ok || (request.method !== 'PUT' && request.method !== 'PATCH')) {
    return response;
  }
  const json = (await response.clone().json().catch(() => null)) as {
    data?: { username?: string; role?: string; session_epoch?: number };
  } | null;
  const data = json?.data;
  if (data?.username) invalidateLiveSession(data.username);
  if (
    access &&
    data?.username === access.username &&
    isAdminRole(data.role)
  ) {
    const value = await createSessionValue(
      data.username,
      data.role,
      Number(data.session_epoch) || 0
    );
    response.cookies.set(ADMIN_SESSION_COOKIE, value, SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const GET = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
