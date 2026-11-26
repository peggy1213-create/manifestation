import { cookies } from 'next/headers';
import {
  buildAuthorizationUrl,
  codeChallengeS256,
  newCodeVerifier,
  newNonce,
  newState,
  safeReturnTo,
  seal,
} from '@clearpath/auth';
import {
  OAUTH_COOKIE,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_TTL_MS,
  callbackUrl,
  googleConfig,
  signInRedirect,
} from '@/lib/auth';

export interface OAuthAttempt {
  verifier: string;
  state: string;
  nonce: string;
  returnTo: string;
}

/**
 * Starts Google sign-in.
 *
 * The code verifier, state and nonce are minted here and sealed into a
 * ten-minute cookie, so the callback can prove the answer belongs to this
 * attempt in this browser. Nothing about the attempt is kept server-side.
 */
export async function GET(request: Request): Promise<Response> {
  const config = await googleConfig();
  if (!config) return signInRedirect(request, 'not_configured');

  const attempt: OAuthAttempt = {
    verifier: newCodeVerifier(),
    state: newState(),
    nonce: newNonce(),
    returnTo: safeReturnTo(new URL(request.url).searchParams.get('returnTo')),
  };

  const sealed = await seal(config.cookieKey, attempt, OAUTH_TTL_MS);
  (await cookies()).set(OAUTH_COOKIE, sealed, OAUTH_COOKIE_OPTIONS);

  const authorizationUrl = buildAuthorizationUrl({
    clientId: config.clientId,
    redirectUri: await callbackUrl(request),
    state: attempt.state,
    nonce: attempt.nonce,
    codeChallenge: await codeChallengeS256(attempt.verifier),
  });

  return new Response(null, {
    status: 302,
    headers: { location: authorizationUrl, 'cache-control': 'no-store' },
  });
}
