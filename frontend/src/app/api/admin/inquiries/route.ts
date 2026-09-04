import { NextRequest, NextResponse } from 'next/server';
import { proxyToExpress } from '@/lib/admin-backend';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return proxyToExpress(request, '/api/contact-inquiries');
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405, headers: { Allow: 'GET' } });
}
