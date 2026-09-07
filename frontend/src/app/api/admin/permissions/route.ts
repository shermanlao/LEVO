import { NextRequest, NextResponse } from 'next/server';
import { forwardToExpress, requirePageAccess } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const forbidden = await requirePageAccess(request, 'permissions');
  if (forbidden) return forbidden;
  return forwardToExpress(request, '/api/admin-permissions');
}

export const GET = handle;
export const PUT = handle;

export async function POST(request: NextRequest) {
  const forbidden = await requirePageAccess(request, 'permissions');
  if (forbidden) return forbidden;
  return forwardToExpress(request, '/api/admin-permissions/reset');
}
