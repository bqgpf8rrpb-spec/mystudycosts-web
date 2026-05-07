import createMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Pass locale to root layout via request header
  const pathname = request.nextUrl.pathname;
  const segment = pathname.split('/')[1];
  const locale = routing.locales.includes(segment as typeof routing.locales[number]) ? segment : routing.defaultLocale;

  // For redirect responses, client will follow; next request will have locale in path
  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-next-intl-locale', locale);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  // Exclude test-map - it lives at root, not under [locale]
  matcher: ['/((?!api|_next|_vercel|test-map|.*\\..*).*)'],
};
