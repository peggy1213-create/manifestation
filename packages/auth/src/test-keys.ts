/**
 * A real RSA key pair, generated in workerd, for the ID-token tests. Signing
 * genuine RS256 tokens and serving a genuine JWKS means the verification path
 * is exercised as written, not against a stand-in.
 */

import { base64UrlEncode, utf8 } from './base64';

export interface TestIssuer {
  jwks: { keys: unknown[] };
  kid: string;
  sign(claims: Record<string, unknown>, header?: Record<string, unknown>): Promise<string>;
}

export async function createTestIssuer(kid = 'test-key-1'): Promise<TestIssuer> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;

  const publicJwk = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as {
    n: string;
    e: string;
  };

  return {
    kid,
    jwks: { keys: [{ kid, kty: 'RSA', alg: 'RS256', use: 'sig', n: publicJwk.n, e: publicJwk.e }] },
    async sign(claims, header = {}) {
      const encodedHeader = base64UrlEncode(
        utf8(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid, ...header })),
      );
      const encodedClaims = base64UrlEncode(utf8(JSON.stringify(claims)));
      const signingInput = utf8(`${encodedHeader}.${encodedClaims}`);
      const signature = new Uint8Array(
        await crypto.subtle.sign(
          'RSASSA-PKCS1-v1_5',
          pair.privateKey,
          signingInput as BufferSource,
        ),
      );
      return `${encodedHeader}.${encodedClaims}.${base64UrlEncode(signature)}`;
    },
  };
}

/** A fetch that answers one JWKS URL and counts how often it was asked. */
export function stubJwksFetch(jwks: { keys: unknown[] }, headers: Record<string, string> = {}) {
  let calls = 0;
  const impl: typeof fetch = async () => {
    calls += 1;
    return new Response(JSON.stringify(jwks), {
      headers: { 'content-type': 'application/json', ...headers },
    });
  };
  return {
    fetch: impl,
    get calls() {
      return calls;
    },
  };
}
