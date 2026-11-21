import {
  buildGoogleAuthorizationUrl,
  importCookieKey,
  oauthCookie,
  safeReturnTo,
  sealTransaction,
  startTransaction,
} from '@clearpath/auth';
import { getAppOrigin, requireSecret } from '@/lib/env';
import { callbackUri } from '@/lib/auth/google';

export const dynamic = 'force-dynamic';

/**
 * Step 1 of the sign-in: make a PKCE verifier, challenge, state and nonce,
 * keep everything but the challenge in a 10-minute encrypted cookie, and send
 * the visitor to Google.
 */
export async function GET(request: Request): Promise<Response> {
  const origin = getAppOrigin(request);
  const returnTo = safeReturnTo(new URL(request.url).searchParams.get('returnTo'));

  const { transaction, codeChallenge } = await startTransaction({ returnTo });
  const key = await importCookieKey(requireSecret('COOKIE_KEY'));
  const sealed = await sealTransaction(key, transaction);

  const authorizationUrl = buildGoogleAuthorizationUrl({
    clientId: requireSecret('GOOGLE_CLIENT_ID'),
    redirectUri: callbackUri(origin),
    state: transaction.state,
    nonce: transaction.nonce,
    codeChallenge,
    prompt: 'select_account',
  });

  return new Response(null, {
    status: 302,
    headers: {
      location: authorizationUrl,
      'set-cookie': oauthCookie(sealed),
      'cache-control': 'no-store',
    },
  });
}
