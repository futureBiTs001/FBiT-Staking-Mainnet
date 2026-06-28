import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const LANDING_HOSTS = new Set(['futurebit.in', 'www.futurebit.in']);

export function middleware(request: NextRequest) {
  const host     = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
  const pathname = request.nextUrl.pathname;

  if (LANDING_HOSTS.has(host)) {
    // Root → landing page (URL stays as futurebit.in/)
    if (pathname === '/' || pathname === '') {
      const url = request.nextUrl.clone();
      url.pathname = '/landing';
      return NextResponse.rewrite(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|api).*)'],
};
