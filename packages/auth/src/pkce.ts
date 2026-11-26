/**
 * PKCE (RFC 7636) with S256, plus the `state` and `nonce` that go with an
 * OpenID Connect authorization code flow.
 *
 * - `state` ties the answer from Google to the browser that started the flow,
 *   so a callback someone else crafted does not sign anyone in.
 * - `nonce` ties the ID token to that same attempt, so an ID token captured
 *   elsewhere cannot be replayed here.
 * - the code verifier means the authorization code alone is not enough to
 *   exchange for tokens.
 *
 * All three are 32 bytes from crypto.getRandomValues.
 */

import { base64UrlEncode, randomBase64Url, sha256, utf8 } from './base64';

const RANDOM_BYTES = 32;

export function newCodeVerifier(): string {
  return randomBase64Url(RANDOM_BYTES);
}

export function newState(): string {
  return randomBase64Url(RANDOM_BYTES);
}

export function newNonce(): string {
  return randomBase64Url(RANDOM_BYTES);
}

/** The S256 challenge: base64url(SHA-256(verifier)). */
export async function codeChallengeS256(verifier: string): Promise<string> {
  return base64UrlEncode(await sha256(utf8(verifier)));
}
