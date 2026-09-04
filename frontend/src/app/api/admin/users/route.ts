import { NextRequest } from 'next/server';
import { forwardToExpress, requireAdminRole } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const forbidden = await requireAdminRole(request);
  if (forbidden) return forbidden;
  return forwardToExpress(request, '/api/admin-users');
}

export const GET = handle;
export const POST = handle;
