import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';
import { redirectSameOrigin } from '@/lib/same-origin-redirect';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);

  if (pathname === '/admin/login') {
    if (session) {
      return redirectSameOrigin('/admin');
    }
    return NextResponse.next();
  }

  if (!session) {
    const next = new URLSearchParams({ next: pathname });
    return redirectSameOrigin('/admin/login', next.toString());
  }

  if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
    if (session.role !== 'admin') {
      return redirectSameOrigin('/admin');
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
