import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession, requireAdminSession, forwardToExpress } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const unauthorized = await requireAdminSession(request);
  if (unauthorized) return unauthorized;
  const session = await readAdminSession(request);
  const includeUsers = session?.role === 'admin' ? '1' : '0';
  return forwardToExpress(request, `/api/dashboard?includeUsers=${includeUsers}`);
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
}
