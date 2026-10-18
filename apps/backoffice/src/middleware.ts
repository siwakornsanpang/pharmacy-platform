import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getServerConfig } from './lib/config/server';

export function middleware(request: NextRequest) {
  const secure = new URL(getServerConfig().appOrigin).protocol === 'https:';
  const name = secure ? '__Host-pharmacy_staff' : 'pharmacy_staff';
  // Presence is only a navigation hint; server consumers must verify the current actor.
  if (request.nextUrl.pathname.startsWith('/backoffice') && !request.cookies.get(name)?.value) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  return NextResponse.next();
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/backoffice/:path*', '/login'],
};
