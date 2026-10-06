import { NextRequest, NextResponse } from 'next/server';
import { getLiveAdminAccess, isAllowedAdminBackendPath, proxyToExpress, requirePageAccess } from '@/lib/admin-backend';
import { revalidateAfterAdminWrite } from '@/lib/catalog-revalidate';
import { canDeleteProductSeries, pageKeyForBackendPath } from '@shared/admin-roles';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const suffix = (params.path || []).join('/');
  if (!suffix || !isAllowedAdminBackendPath(suffix)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const pageKey = pageKeyForBackendPath(suffix);
  if (pageKey) {
    const forbidden = await requirePageAccess(request, pageKey);
    if (forbidden) return forbidden;
  }
  if (request.method === 'DELETE' && /^product-series\/\d+$/.test(suffix)) {
    const access = await getLiveAdminAccess(request);
    if (!access) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!canDeleteProductSeries(access.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  const response = await proxyToExpress(request, `/api/${suffix}`);
  const mutating = request.method !== 'GET' && request.method !== 'HEAD';
  if (mutating && response.ok) {
    revalidateAfterAdminWrite(suffix);
  }
  return response;
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
