import { NextRequest, NextResponse } from 'next/server';
import { proxyToExpress } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  return proxyToExpress(request, `/api/contact-inquiries/${encodeURIComponent(id)}`);
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
}
