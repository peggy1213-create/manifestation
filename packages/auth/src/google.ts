/**
 * Google sign-in: OpenID Connect authorization code flow with PKCE, written
 * against the protocol rather than against a library.
 *
 * The ID token is what signs someone in, so it is checked all the way through:
 * RS256 signature against Google's JWKS, issuer, audience, expiry, the nonce
 * from this very attempt, and a verified email address. Any one of those
 * failing refuses the sign-in.
 */

import { timingSafeEqual } from './base64';
import { decodeJwt, verifyRs256 } from './jwt';
import type { JwksCache } from './jwks';

export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

/** Google issues tokens under both spellings. */
export const GOOGLE_ISSUERS = ['https://accounts.google.com', 'accounts.google.com'] as const;

/** Clocks drift; a minute of tolerance on exp and iat. */
export const CLOCK_SKEW_MS = 60 * 1000;

export type AuthFailureReason =
  | 'token_request_failed'
  | 'no_id_token'
  | 'malformed_id_token'
  | 'wrong_algorithm'
  | 'unknown_key'
  | 'bad_signature'
  | 'wrong_issuer'
  | 'wrong_audience'
  | 'expired'
  | 'issued_in_future'
  | 'wrong_nonce'
  | 'no_subject'
  | 'email_not_verified';

/** A sign-in that was refused, with the reason it was refused for the logs. */
export class AuthFailure extends Error {
  readonly reason: AuthFailureReason;

  constructor(reason: AuthFailureReason) {
    super(`Google sign-in refused: ${reason}`);
    this.name = 'AuthFailure';
    this.reason = reason;
  }
}

export interface AuthorizationUrlInput {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}

export function buildAuthorizationUrl(input: AuthorizationUrlInput): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.search = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: 'code',
    // The name and picture are nice to have; the email is what identifies the
    // person. Nothing else is asked for.
    scope: 'openid email profile',
    state: input.state,
    nonce: input.nonce,
    code_challenge: input.codeChallenge,
    code_challenge_method: 'S256',
    // Always land on the account chooser rather than silently reusing one.
    prompt: 'select_account',
  }).toString();
  return url.toString();
}

export interface TokenExchangeInput {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  code: string;
  codeVerifier: string;
  fetchImpl?: typeof fetch;
}

/** Swaps the authorization code for tokens. Only the ID token is used. */
export async function exchangeCodeForIdToken(input: TokenExchangeInput): Promise<string> {
  const fetchImpl = input.fetchImpl ?? fetch;

  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: input.codeVerifier,
    }).toString(),
  });

  if (!response.ok) throw new AuthFailure('token_request_failed');

  let body: { id_token?: unknown };
  try {
    body = (await response.json()) as { id_token?: unknown };
  } catch {
    throw new AuthFailure('token_request_failed');
  }

  if (typeof body.id_token !== 'string' || body.id_token.length === 0) {
    throw new AuthFailure('no_id_token');
  }

  return body.id_token;
}

export interface GoogleIdentity {
  /** Google's stable account id. */
  subject: string;
  email: string;
  displayName: string | null;
  pictureUrl: string | null;
}

export interface VerifyIdTokenInput {
  idToken: string;
  clientId: string;
  /** The nonce sealed into the cookie when this attempt started. */
  nonce: string;
  jwks: JwksCache;
  now?: number;
}

export async function verifyGoogleIdToken(input: VerifyIdTokenInput): Promise<GoogleIdentity> {
  const now = input.now ?? Date.now();

  const decoded = decodeJwt(input.idToken);
  if (!decoded) throw new AuthFailure('malformed_id_token');

  // Pinning the algorithm closes the "alg: none" and HMAC-with-the-public-key
  // families of attack before a key is even fetched.
  if (decoded.header.alg !== 'RS256') throw new AuthFailure('wrong_algorithm');
  if (typeof decoded.header.kid !== 'string') throw new AuthFailure('unknown_key');

  const key = await input.jwks.getKey(decoded.header.kid);
  if (!key) throw new AuthFailure('unknown_key');
  if (!(await verifyRs256(key, decoded))) throw new AuthFailure('bad_signature');

  const claims = decoded.claims;

  const issuer = typeof claims.iss === 'string' ? claims.iss : '';
  if (!(GOOGLE_ISSUERS as readonly string[]).includes(issuer)) {
    throw new AuthFailure('wrong_issuer');
  }

  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.some((aud) => typeof aud === 'string' && timingSafeEqual(aud, input.clientId))) {
    throw new AuthFailure('wrong_audience');
  }

  const exp = typeof claims.exp === 'number' ? claims.exp * 1000 : 0;
  if (exp + CLOCK_SKEW_MS <= now) throw new AuthFailure('expired');

  const iat = typeof claims.iat === 'number' ? claims.iat * 1000 : 0;
  if (iat - CLOCK_SKEW_MS > now) throw new AuthFailure('issued_in_future');

  // Without this, an ID token obtained for another sign-in attempt could be
  // posted to our callback.
  const nonce = typeof claims.nonce === 'string' ? claims.nonce : '';
  if (!timingSafeEqual(nonce, input.nonce)) throw new AuthFailure('wrong_nonce');

  const subject = typeof claims.sub === 'string' ? claims.sub : '';
  if (subject.length === 0) throw new AuthFailure('no_subject');

  const email = typeof claims.email === 'string' ? claims.email : '';
  // An unverified email would let someone claim an address they do not own,
  // and the email is the account.
  if (email.length === 0 || claims.email_verified !== true) {
    throw new AuthFailure('email_not_verified');
  }

  return {
    subject,
    email,
    displayName: typeof claims.name === 'string' && claims.name.length > 0 ? claims.name : null,
    pictureUrl:
      typeof claims.picture === 'string' && claims.picture.length > 0 ? claims.picture : null,
  };
}
