import { NextRequest, NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, verifySessionValue } from '@/lib/admin-session';
import { redirectSameOrigin } from '@/lib/same-origin-redirect';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-levo-pathname', pathname);
  const pass = () => NextResponse.next({ request: { headers: requestHeaders } });

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
    if (session.role !== 'admin') {
      return redirectSameOrigin(request, '/admin');
    }
  }

  return pass();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.png|icon.svg|apple-icon.png).*)'],
};
