/**
 * Just enough JWT to verify a Google ID token. Nothing here trusts a token:
 * decoding only splits and parses it, and the caller must verify the signature
 * and the claims before believing a word of it.
 */

import { base64UrlDecode, utf8 } from './base64';

export interface JwtHeader {
  alg?: string;
  kid?: string;
  typ?: string;
}

export interface DecodedJwt {
  header: JwtHeader;
  claims: Record<string, unknown>;
  /** The bytes the signature covers: `${header}.${payload}`. */
  signingInput: Uint8Array;
  signature: Uint8Array;
}

export function decodeJwt(token: string): DecodedJwt | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  if (!encodedHeader || !encodedClaims || !encodedSignature) return null;

  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedHeader))) as unknown;
    const claims = JSON.parse(new TextDecoder().decode(base64UrlDecode(encodedClaims))) as unknown;

    if (typeof header !== 'object' || header === null) return null;
    if (typeof claims !== 'object' || claims === null) return null;

    return {
      header: header as JwtHeader,
      claims: claims as Record<string, unknown>,
      signingInput: utf8(`${encodedHeader}.${encodedClaims}`),
      signature: base64UrlDecode(encodedSignature),
    };
  } catch {
    return null;
  }
}

/** RS256 only: the one algorithm Google signs ID tokens with. */
export async function verifyRs256(
  key: CryptoKey,
  decoded: Pick<DecodedJwt, 'signingInput' | 'signature'>,
): Promise<boolean> {
  try {
    return await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decoded.signature as BufferSource,
      decoded.signingInput as BufferSource,
    );
  } catch {
    return false;
  }
}
