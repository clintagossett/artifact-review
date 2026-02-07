import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for HTTP to HTTPS redirect
 *
 * Checks the x-forwarded-proto header (set by reverse proxies/load balancers)
 * and redirects HTTP requests to HTTPS with a 301 permanent redirect.
 *
 * Skipped in development to allow local HTTP development.
 */
export function middleware(request: NextRequest) {
  // Skip in development
  if (process.env.NODE_ENV === 'development') {
    return NextResponse.next();
  }

  // Check if request is HTTP (via x-forwarded-proto header)
  const forwardedProto = request.headers.get('x-forwarded-proto');

  // If protocol is HTTP, redirect to HTTPS
  if (forwardedProto === 'http') {
    const url = request.nextUrl.clone();
    url.protocol = 'https:';

    // 301 Permanent Redirect - preserves path and query params automatically
    return NextResponse.redirect(url, 301);
  }

  return NextResponse.next();
}

// Apply middleware to all routes except static files and API routes
// that shouldn't be redirected
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
