/**
 * Every failure in the sign-in flow is an `AuthError` with a stable `code`.
 * Route handlers map the code to a reason on the error page, so no raw
 * provider message or token ever reaches the browser.
 */
export type AuthErrorCode =
  // configuration / input
  | 'cookie_key_invalid'
  | 'invalid_encoding'
  // the user said no at Google's consent screen
  | 'consent_denied'
  // the short-lived PKCE cookie is missing, unreadable or older than 10 minutes
  | 'transaction_missing'
  | 'transaction_expired'
  | 'state_mismatch'
  // the code could not be swapped for tokens
  | 'token_exchange_failed'
  // the ID token did not verify
  | 'jwks_unavailable'
  | 'invalid_jwt'
  | 'unsupported_algorithm'
  | 'unknown_key'
  | 'bad_signature'
  | 'wrong_issuer'
  | 'wrong_audience'
  | 'token_expired'
  | 'token_not_yet_valid'
  | 'nonce_mismatch'
  | 'email_not_verified'
  // a mutating request did not come from our own origin
  | 'bad_origin';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
    this.code = code;
  }
}

export function isAuthError(value: unknown): value is AuthError {
  return value instanceof AuthError;
}
