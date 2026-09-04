import { NextRequest } from 'next/server';
import { proxyToExpress } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyToExpress(request, '/api/photometric-library');
}
