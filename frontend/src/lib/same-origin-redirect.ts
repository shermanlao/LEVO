import { NextResponse } from 'next/server';

/**
 * Redirect without writing the Next.js bind host (localhost / 127.0.0.1:3000)
 * into Location. Browsers resolve a same-site path against the public URL.
 */
export function redirectSameOrigin(path: string, search?: string): NextResponse {
  const location = search ? `${path}?${search}` : path;
  const response = NextResponse.redirect(new URL(location, 'http://127.0.0.1'));
  response.headers.set('Location', location);
  return response;
}
