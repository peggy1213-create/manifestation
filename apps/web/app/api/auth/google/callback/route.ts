import { cookies } from 'next/headers';
import {
  AuthFailure,
  SESSION_COOKIE,
  exchangeCodeForIdToken,
  hashSessionToken,
  newSessionToken,
  open,
  safeReturnTo,
  sessionCookieOptions,
  sessionExpiresAt,
  timingSafeEqual,
  verifyGoogleIdToken,
} from '@clearpath/auth';
import { createSession, upsertUserByEmail } from '@clearpath/core';
import { getDatabase } from '@/lib/cloudflare';
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_OPTIONS,
  callbackUrl,
  googleConfig,
  googleJwks,
  signInRedirect,
} from '@/lib/auth';
import type { OAuthAttempt } from '../start/route';

/**
 * Where Google sends the person back.
 *
 * Four things have to hold before anyone is signed in: the sealed cookie opens
 * (so this browser started the attempt and it is still in date), the state
 * matches it, Google hands over an ID token for the code and the PKCE
 * verifier, and that token passes every check in verifyGoogleIdToken —
 * signature, issuer, audience, expiry, our nonce and a verified email.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const store = await cookies();

  // However this ends, the attempt is spent.
  const clearAttempt = () => store.set(OAUTH_COOKIE, '', { ...OAUTH_COOKIE_OPTIONS, maxAge: 0 });

  const config = await googleConfig();
  if (!config) {
    clearAttempt();
    return signInRedirect(request, 'not_configured');
  }

  if (url.searchParams.get('error')) {
    // The person said no at Google's screen, or closed it.
    clearAttempt();
    return signInRedirect(request, 'cancelled');
  }

  const sealed = store.get(OAUTH_COOKIE)?.value;
  const attempt = sealed ? await open<OAuthAttempt>(config.cookieKey, sealed) : null;
  clearAttempt();

  if (!attempt) return signInRedirect(request, 'expired');

  const state = url.searchParams.get('state') ?? '';
  const code = url.searchParams.get('code') ?? '';
  if (!timingSafeEqual(state, attempt.state) || code.length === 0) {
    return signInRedirect(request, 'refused');
  }

  try {
    const idToken = await exchangeCodeForIdToken({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri: await callbackUrl(request),
      code,
      codeVerifier: attempt.verifier,
    });

    const identity = await verifyGoogleIdToken({
      idToken,
      clientId: config.clientId,
      nonce: attempt.nonce,
      jwks: googleJwks(),
    });

    const db = await getDatabase();
    const user = await upsertUserByEmail(db, {
      email: identity.email,
      displayName: identity.displayName,
      pictureUrl: identity.pictureUrl,
    });

    // The cookie carries the token; D1 only ever sees its hash.
    const token = newSessionToken();
    await createSession(db, {
      tokenHash: await hashSessionToken(token),
      userId: user.id,
      expiresAt: sessionExpiresAt(),
    });
    store.set(SESSION_COOKIE, token, sessionCookieOptions());

    return new Response(null, {
      status: 302,
      headers: {
        location: new URL(safeReturnTo(attempt.returnTo), url.origin).toString(),
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    // The reason is for the logs, not for the person or the query string.
    if (error instanceof AuthFailure) {
      console.warn('google sign-in refused:', error.reason);
      return signInRedirect(request, 'refused');
    }
    throw error;
  }
}
