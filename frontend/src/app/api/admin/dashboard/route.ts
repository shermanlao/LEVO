import { NextRequest, NextResponse } from 'next/server';
import { getLiveAdminAccess, requireAdminSession, forwardToExpress } from '@/lib/admin-backend';
import { roleCanOpenPage } from '@shared/admin-roles';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  const access = await getLiveAdminAccess(request);
  const includeUsers = access && roleCanOpenPage(access.role, 'users', access.pages) ? '1' : '0';
  return forwardToExpress(request, `/api/dashboard?includeUsers=${includeUsers}`);
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
}
