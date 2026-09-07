import { NextRequest } from 'next/server';
import { proxyToExpress, requirePageAccess } from '@/lib/admin-backend';
import { revalidateCatalog } from '@/lib/catalog-revalidate';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const suffix = (params.path || []).join('/');
  const forbidden = await requirePageAccess(request, 'settings');
  if (forbidden) return forbidden;
  const expressPath = suffix ? `/api/site-settings/${suffix}` : '/api/site-settings';
  const response = await proxyToExpress(request, expressPath);
  const mutating = request.method !== 'GET' && request.method !== 'HEAD';
  if (mutating && response.ok) {
    revalidateCatalog('all');
  }
  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
