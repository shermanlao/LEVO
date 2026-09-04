import { NextRequest } from 'next/server';
import { forwardToExpress, requireAdminRole } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

async function handle(request: NextRequest, context: RouteContext) {
  const forbidden = await requireAdminRole(request);
  if (forbidden) return forbidden;
  const { id } = await context.params;
  return forwardToExpress(request, `/api/admin-users/${encodeURIComponent(id)}`);
}

export const GET = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
