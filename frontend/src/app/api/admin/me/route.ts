import { NextRequest, NextResponse } from 'next/server';
import { readAdminSession } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await readAdminSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json({ username: session.username, role: session.role });
}
