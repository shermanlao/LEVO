import { NextRequest } from 'next/server';
import { proxyToExpress, requirePageAccess } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const forbidden = await requirePageAccess(request, 'ldt');
  if (forbidden) return forbidden;
  return proxyToExpress(request, '/api/photometric-library');
}
