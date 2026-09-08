import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';
import { redirectSameOrigin } from '@/lib/same-origin-redirect';
import { canManageUsers } from '@shared/admin-roles';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const pass = () => NextResponse.next();

  if (!pathname.startsWith('/admin')) {
    return pass();
  }

  const token = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const session = await verifySessionValue(token);

  if (pathname === '/admin/login') {
    if (session) {
      return redirectSameOrigin(request, '/admin');
    }
    return pass();
  }

  if (!session) {
    const next = new URLSearchParams({ next: pathname });
    return redirectSameOrigin(request, '/admin/login', next.toString());
  }

  if (pathname === '/admin/users' || pathname.startsWith('/admin/users/')) {
    if (!canManageUsers(session.role)) {
      return redirectSameOrigin(request, '/admin');
    }
  }

  return pass();
}

export const config = {
  matcher: ['/admin', '/admin/:path*'],
};
