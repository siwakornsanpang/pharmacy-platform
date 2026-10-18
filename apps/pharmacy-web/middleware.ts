import { NextResponse, NextRequest } from 'next/server';
import { safeReturnTo } from '@/lib/navigation/safe-return-to';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // This cookie is only a navigation hint. API routes still verify the opaque
  // server-side session before returning any member data.
  const isLoggedIn = Boolean(request.cookies.get('pharmacy_session')?.value);

  // 1. Root redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/home', request.url));
  }

  // 2. Auth-based Rewrites for overlapping routes (home, service, meeting)
  if (isLoggedIn) {
    if (pathname === '/home') {
      return NextResponse.rewrite(new URL('/member-home', request.url));
    }
    if (pathname === '/service') {
      return NextResponse.rewrite(new URL('/member-service', request.url));
    }
    if (pathname === '/meeting') {
      return NextResponse.rewrite(new URL('/member-meeting', request.url));
    }
  }

  // 3. Protection for Member-only routes
  const memberRoutes = ['/profile', '/learning', '/careers', '/tools', '/store', '/member-home', '/member-service', '/member-meeting'];
  const protectedMeetingRoute = /^\/meeting\/[^/]+\/(checkout|payment|success)(?:\/|$)/.test(pathname);
  if ((memberRoutes.some(route => pathname.startsWith(route)) || protectedMeetingRoute) && !isLoggedIn) {
    const login = new URL('/login', request.url);
    login.searchParams.set('returnTo', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  // 4. Protection for Login (if already logged in, go home)
  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL(safeReturnTo(request.nextUrl.searchParams.get('returnTo')), request.url));
  }

  return NextResponse.next();
}

// Config to match all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (local images)
     */
    '/((?!api|_next|favicon.ico|images).*)',
  ],
};
