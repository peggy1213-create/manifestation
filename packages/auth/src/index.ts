/**
 * Hand-rolled OAuth 2.0 authorization code + PKCE for Clear Path (顯化).
 * Web Crypto only — `crypto.getRandomValues` and `crypto.subtle`. No auth
 * libraries, no Node crypto. Nothing in here touches D1: the route handlers in
 * apps/web combine these pieces with the repo functions in packages/core.
 */
export const AUTH_PACKAGE_NAME = '@clearpath/auth';

export { AuthError, isAuthError } from './errors';
export type { AuthErrorCode } from './errors';

export {
  base64UrlDecode,
  base64UrlEncode,
  constantTimeEqual,
  randomBytes,
  randomToken,
  toHex,
  utf8Bytes,
  utf8String,
} from './encoding';

export {
  CODE_VERIFIER_BYTES,
  createCodeVerifier,
  createPkcePair,
  deriveCodeChallenge,
} from './pkce';
export type { PkcePair } from './pkce';

export { importCookieKey, seal, unseal } from './seal';

export { clearCookie, parseCookieHeader, readCookie, serializeCookie } from './cookies';
export type { CookieOptions, SameSite } from './cookies';

export { fetchJwks, parseMaxAge, GOOGLE_JWKS_URL } from './jwks';
export type { FetchJwksOptions, JsonWebKey, JsonWebKeySet, JwksCache } from './jwks';

export { decodeJwt, verifyIdToken, GOOGLE_ISSUERS } from './jwt';
export type { DecodedJwt, GoogleIdTokenClaims, JwtHeader, VerifyIdTokenOptions } from './jwt';

export {
  buildGoogleAuthorizationUrl,
  exchangeAuthorizationCode,
  GOOGLE_AUTHORIZATION_ENDPOINT,
  GOOGLE_SCOPE,
  GOOGLE_TOKEN_ENDPOINT,
} from './google';
export type { AuthorizationUrlParams, TokenExchangeParams, TokenExchangeResult } from './google';

export {
  clearedOAuthCookie,
  oauthCookie,
  openTransaction,
  sealTransaction,
  startTransaction,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_COOKIE_NAME,
} from './transaction';
export type { OAuthTransaction } from './transaction';

export {
  clearedSessionCookie,
  createSessionToken,
  hashSessionToken,
  sessionCookie,
  shouldRenewSession,
  SESSION_COOKIE_NAME,
  SESSION_RENEW_AFTER_SECONDS,
  SESSION_TOKEN_BYTES,
  SESSION_TTL_SECONDS,
} from './session';

export { assertSameOrigin, isMutatingMethod, isSameOrigin, MUTATING_METHODS } from './origin';
export type { OriginCheckOptions } from './origin';

export { safeReturnTo, DEFAULT_RETURN_TO } from './return-to';
