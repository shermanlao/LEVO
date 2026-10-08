import { NextRequest } from 'next/server';
import { forwardToExpress, requirePageAccess } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

async function handle(request: NextRequest) {
  const forbidden = await requirePageAccess(request, 'deploy');
  if (forbidden) return forbidden;
  const timeoutMs = request.method === 'POST' ? 90_000 : 20_000;
  return forwardToExpress(request, '/api/deploy', { timeoutMs });
}

export const GET = handle;
export const POST = handle;
