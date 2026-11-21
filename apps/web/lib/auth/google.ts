import { fetchJwks, isAuthError, verifyIdToken, type GoogleIdTokenClaims } from '@clearpath/auth';
import { getDefaultCache } from '@/lib/env';

/** The redirect URI registered with the Google OAuth client. */
export function callbackUri(origin: string): string {
  return `${origin}/auth/google/callback`;
}

/**
 * Verifies a Google ID token against the cached JWKS. Google rotates its
 * signing keys, so a token signed with a key the cached set does not have gets
 * one retry past the cache before it counts as a failure.
 */
export async function verifyGoogleIdToken(options: {
  idToken: string;
  clientId: string;
  nonce: string;
}): Promise<GoogleIdTokenClaims> {
  const cache = getDefaultCache();

  try {
    return await verifyIdToken({ ...options, jwks: await fetchJwks({ cache }) });
  } catch (error) {
    if (!cache || !isAuthError(error) || error.code !== 'unknown_key') throw error;
    return verifyIdToken({ ...options, jwks: await fetchJwks({ cache, forceRefresh: true }) });
  }
}
