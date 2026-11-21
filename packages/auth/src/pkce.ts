import { base64UrlEncode, randomToken, utf8Bytes } from './encoding';

/** RFC 7636 allows 43–128 characters; 32 random bytes is 43 base64url characters. */
export const CODE_VERIFIER_BYTES = 32;

export interface PkcePair {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}

export function createCodeVerifier(): string {
  return randomToken(CODE_VERIFIER_BYTES);
}

/** RFC 7636 §4.2: `code_challenge = base64url(SHA-256(ascii(code_verifier)))`. */
export async function deriveCodeChallenge(codeVerifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', utf8Bytes(codeVerifier));
  return base64UrlEncode(new Uint8Array(digest));
}

export async function createPkcePair(): Promise<PkcePair> {
  const codeVerifier = createCodeVerifier();
  return {
    codeVerifier,
    codeChallenge: await deriveCodeChallenge(codeVerifier),
    codeChallengeMethod: 'S256',
  };
}
