import { NextRequest, NextResponse } from 'next/server';
import { isAllowedAdminBackendPath, proxyToExpress } from '@/lib/admin-backend';
import { revalidateAfterAdminWrite } from '@/lib/catalog-revalidate';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, context: RouteContext) {
  const params = await context.params;
  const suffix = (params.path || []).join('/');
  if (!suffix || !isAllowedAdminBackendPath(suffix)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
