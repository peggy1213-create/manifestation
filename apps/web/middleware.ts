import { NextResponse, type NextRequest } from 'next/server';
import { isMutatingMethod, sessionCookie, SESSION_COOKIE_NAME } from '@clearpath/auth';

/**
 * Two jobs, both cheap enough to do on every request:
 *
 * 1. CSRF: a POST/PUT/PATCH/DELETE has to come from our own origin. Route
 *    handlers check this again before they write anything.
 * 2. /app/* needs a session cookie, otherwise it redirects to /login. This is
 *    the optimistic check only — whether the cookie is a live session is
 *    decided in D1 by `getSession()`, on the page itself.
 */
export function middleware(request: NextRequest): NextResponse {
  const configuredOrigin = process.env.APP_ORIGIN?.trim();
  const expectedOrigin = configuredOrigin || request.nextUrl.origin;

  if (isMutatingMethod(request.method) && !hasTrustedOrigin(request, expectedOrigin)) {
    return new NextResponse('這個請求不是從顯化的頁面送出的。', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (request.nextUrl.pathname.startsWith('/app')) {
    if (!token) {
      const login = new URL('/login', request.nextUrl.origin);
      login.searchParams.set('returnTo', `${request.nextUrl.pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(login);
    }

    // Rolling cookie: every visit pushes the browser's copy 30 days out, to
    // match the rolling expiry `getSession()` writes in D1.
    const next = NextResponse.next();
    next.headers.append('set-cookie', sessionCookie(token));
    return next;
  }

  return NextResponse.next();
}

function hasTrustedOrigin(request: NextRequest, expectedOrigin: string): boolean {
  const origin = request.headers.get('origin');
  if (origin) return sameOrigin(origin, expectedOrigin);

  const referer = request.headers.get('referer');
  if (referer) return sameOrigin(referer, expectedOrigin);

  return false;
}

function sameOrigin(candidate: string, expectedOrigin: string): boolean {
  try {
    return new URL(candidate).origin === new URL(expectedOrigin).origin;
  } catch {
    return false;
  }
}

export const config = {
  // Everything except Next's own assets and the favicon, so the origin check
  // covers every route that can be POSTed to.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
