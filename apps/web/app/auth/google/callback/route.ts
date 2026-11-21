import {
  AuthError,
  clearedOAuthCookie,
  constantTimeEqual,
  exchangeAuthorizationCode,
  importCookieKey,
  openTransaction,
  readCookie,
  safeReturnTo,
  OAUTH_COOKIE_NAME,
} from '@clearpath/auth';
import { upsertUserByGoogleSub } from '@clearpath/core';
import { getAppOrigin, getDatabase, requireSecret } from '@/lib/env';
import { callbackUri, verifyGoogleIdToken } from '@/lib/auth/google';
import { errorRedirect, reasonForError } from '@/lib/auth/errors';
import { startSession } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/**
 * Step 2–4: check state, swap the code for tokens, verify the ID token, then
 * upsert the account and start a session. Any failure ends on /auth/error with
 * a reason and no provider detail.
 */
export async function GET(request: Request): Promise<Response> {
  const origin = getAppOrigin(request);
  const params = new URL(request.url).searchParams;

  try {
    if (params.get('error')) {
      // access_denied, or any other provider-side refusal.
      throw new AuthError(
        params.get('error') === 'access_denied' ? 'consent_denied' : 'token_exchange_failed',
      );
    }

    const code = params.get('code');
    const state = params.get('state');
    if (!code || !state) throw new AuthError('transaction_missing');

    const key = await importCookieKey(requireSecret('COOKIE_KEY'));
    const transaction = await openTransaction(key, readCookie(request, OAUTH_COOKIE_NAME));
    if (!transaction) throw new AuthError('transaction_expired');
    if (!constantTimeEqual(state, transaction.state)) throw new AuthError('state_mismatch');

    const clientId = requireSecret('GOOGLE_CLIENT_ID');
    const { idToken } = await exchangeAuthorizationCode({
      clientId,
      clientSecret: requireSecret('GOOGLE_CLIENT_SECRET'),
      code,
      codeVerifier: transaction.codeVerifier,
      redirectUri: callbackUri(origin),
    });

    const claims = await verifyGoogleIdToken({
      idToken,
      clientId,
      nonce: transaction.nonce,
    });

    const user = await upsertUserByGoogleSub(getDatabase(), {
      googleSub: claims.sub,
      email: String(claims.email),
      name: typeof claims.name === 'string' ? claims.name : null,
    });

    const { setCookie } = await startSession(user.id);

    const headers = new Headers({
      location: `${origin}${safeReturnTo(transaction.returnTo)}`,
      'cache-control': 'no-store',
    });
    headers.append('set-cookie', setCookie);
    headers.append('set-cookie', clearedOAuthCookie());
    return new Response(null, { status: 302, headers });
  } catch (error) {
    return errorRedirect(origin, reasonForError(error), {
      setCookies: [clearedOAuthCookie()],
    });
  }
}
