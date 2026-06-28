import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LANDING_HOSTS = new Set(['futurebit.in', 'www.futurebit.in']);

export function middleware(request: NextRequest) {
  const host     = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const pathname = request.nextUrl.pathname;

  // futurebit.in → serve landing page at root (URL stays clean)
  if (LANDING_HOSTS.has(host) && (pathname === '/' || pathname === '')) {
    return NextResponse.rewrite(new URL('/landing', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js internals and static assets
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
