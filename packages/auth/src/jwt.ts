import { base64UrlDecode, constantTimeEqual, utf8Bytes, utf8String } from './encoding';
import { AuthError } from './errors';
import type { JsonWebKey, JsonWebKeySet } from './jwks';

export interface JwtHeader {
  alg: string;
  kid?: string;
  typ?: string;
}

export interface GoogleIdTokenClaims {
  iss: string;
  aud: string | string[];
  sub: string;
  exp: number;
  iat: number;
  nonce?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  [claim: string]: unknown;
}

export interface DecodedJwt {
  header: JwtHeader;
  claims: GoogleIdTokenClaims;
  /** `header.payload` as ASCII bytes — what the signature covers. */
  signingInput: Uint8Array;
  signature: Uint8Array;
}

/** Google issues ID tokens with either form of its issuer. */
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'] as const;

/** Splits and parses a JWT without checking anything cryptographic. */
export function decodeJwt(token: string): DecodedJwt {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthError('invalid_jwt', 'a JWT has three parts');
  const [headerPart, claimsPart, signaturePart] = parts as [string, string, string];
  if (!headerPart || !claimsPart || !signaturePart) {
    throw new AuthError('invalid_jwt', 'a JWT part was empty');
  }

  let header: unknown;
  let claims: unknown;
  try {
    header = JSON.parse(utf8String(base64UrlDecode(headerPart)));
    claims = JSON.parse(utf8String(base64UrlDecode(claimsPart)));
  } catch {
    throw new AuthError('invalid_jwt', 'the JWT header or claims were not JSON');
  }

  if (!isJwtHeader(header)) throw new AuthError('invalid_jwt', 'the JWT header had no alg');
  if (!isClaims(claims)) throw new AuthError('invalid_jwt', 'the JWT claims were incomplete');

  return {
    header,
    claims,
    signingInput: utf8Bytes(`${headerPart}.${claimsPart}`),
    signature: base64UrlDecode(signaturePart),
  };
}

function isJwtHeader(value: unknown): value is JwtHeader {
  return (
    typeof value === 'object' && value !== null && typeof (value as JwtHeader).alg === 'string'
  );
}

function isClaims(value: unknown): value is GoogleIdTokenClaims {
  if (typeof value !== 'object' || value === null) return false;
  const claims = value as GoogleIdTokenClaims;
  const audOk = typeof claims.aud === 'string' || Array.isArray(claims.aud);
  return (
    typeof claims.iss === 'string' &&
    typeof claims.sub === 'string' &&
    typeof claims.exp === 'number' &&
    typeof claims.iat === 'number' &&
    audOk
  );
}

export interface VerifyIdTokenOptions {
  idToken: string;
  /** Our Google OAuth client id — the only accepted `aud`. */
  clientId: string;
  /** The nonce we put in the authorization request. */
  nonce: string;
  jwks: JsonWebKeySet;
  /** Epoch seconds; defaults to now. */
  now?: number;
  leewaySeconds?: number;
  issuers?: readonly string[];
  /** Google only ever sends a verified email for a Google account. */
  requireVerifiedEmail?: boolean;
}

/**
 * Verifies a Google ID token: RS256 signature against the JWKS, then iss, aud,
 * exp/iat with leeway, nonce and email_verified. Throws `AuthError` on the
 * first problem; returns the claims when everything holds.
 */
export async function verifyIdToken(options: VerifyIdTokenOptions): Promise<GoogleIdTokenClaims> {
  const {
    idToken,
    clientId,
    nonce,
    jwks,
    now = Math.floor(Date.now() / 1000),
    leewaySeconds = 60,
    issuers = GOOGLE_ISSUERS,
    requireVerifiedEmail = true,
  } = options;

  const { header, claims, signingInput, signature } = decodeJwt(idToken);

  if (header.alg !== 'RS256') {
    throw new AuthError('unsupported_algorithm', `alg ${header.alg} is not RS256`);
  }

  const jwk = selectKey(jwks, header.kid);
  if (!jwk) throw new AuthError('unknown_key', 'no JWKS key matched the token kid');

  const key = await importRsaVerifyKey(jwk);
  const signatureValid = await crypto.subtle.verify(
    { name: 'RSASSA-PKCS1-v1_5' },
    key,
    signature,
    signingInput,
  );
  if (!signatureValid)
    throw new AuthError('bad_signature', 'the ID token signature did not verify');

  if (!issuers.includes(claims.iss)) {
    throw new AuthError('wrong_issuer', `unexpected iss ${claims.iss}`);
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.some((aud) => typeof aud === 'string' && constantTimeEqual(aud, clientId))) {
    throw new AuthError('wrong_audience', 'the ID token was issued for another client');
  }

  if (claims.exp + leewaySeconds <= now) {
    throw new AuthError('token_expired', 'the ID token has expired');
  }
  if (claims.iat - leewaySeconds > now) {
    throw new AuthError('token_not_yet_valid', 'the ID token is issued in the future');
  }

  if (typeof claims.nonce !== 'string' || !constantTimeEqual(claims.nonce, nonce)) {
    throw new AuthError('nonce_mismatch', 'the ID token nonce did not match this sign-in');
  }

  if (
    requireVerifiedEmail &&
    (claims.email_verified !== true || typeof claims.email !== 'string')
  ) {
    throw new AuthError('email_not_verified', 'the Google account has no verified email');
  }

  return claims;
}

function selectKey(jwks: JsonWebKeySet, kid: string | undefined): JsonWebKey | undefined {
  const candidates = jwks.keys.filter(
    (key) => key.kty === 'RSA' && (key.alg === undefined || key.alg === 'RS256'),
  );
  if (kid) return candidates.find((key) => key.kid === kid);
  // No kid: only unambiguous when Google publishes a single RSA key.
  return candidates.length === 1 ? candidates[0] : undefined;
}

async function importRsaVerifyKey(jwk: JsonWebKey): Promise<CryptoKey> {
  if (!jwk.n || !jwk.e) throw new AuthError('unknown_key', 'the JWKS key had no modulus');
  try {
    return await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    throw new AuthError('unknown_key', 'the JWKS key could not be imported');
  }
}
