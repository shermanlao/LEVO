import { NextRequest, NextResponse } from 'next/server';
import { getLiveAdminAccess } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const access = await getLiveAdminAccess(request);
  if (!access) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(access);
}
