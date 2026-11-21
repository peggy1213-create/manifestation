import { isAuthError, type AuthErrorCode } from '@clearpath/auth';

/** The four things the error page can explain. */
export type AuthErrorReason = 'denied' | 'expired' | 'token' | 'origin' | 'unknown';

const REASON_BY_CODE: Partial<Record<AuthErrorCode, AuthErrorReason>> = {
  consent_denied: 'denied',
  transaction_missing: 'expired',
  transaction_expired: 'expired',
  state_mismatch: 'expired',
  bad_origin: 'origin',
  token_exchange_failed: 'token',
  jwks_unavailable: 'token',
  invalid_jwt: 'token',
  unsupported_algorithm: 'token',
  unknown_key: 'token',
  bad_signature: 'token',
  wrong_issuer: 'token',
  wrong_audience: 'token',
  token_expired: 'token',
  token_not_yet_valid: 'token',
  nonce_mismatch: 'token',
  email_not_verified: 'token',
};

export function reasonForError(error: unknown): AuthErrorReason {
  if (isAuthError(error)) return REASON_BY_CODE[error.code] ?? 'unknown';
  return 'unknown';
}

export function isAuthErrorReason(value: string | null | undefined): value is AuthErrorReason {
  return (
    value === 'denied' ||
    value === 'expired' ||
    value === 'token' ||
    value === 'origin' ||
    value === 'unknown'
  );
}

/**
 * Redirects to the error page with a reason, never with a provider message:
 * nothing from Google or from a token reaches the browser.
 */
export function errorRedirect(
  origin: string,
  reason: AuthErrorReason,
  options: { setCookies?: readonly string[] } = {},
): Response {
  const headers = new Headers({
    location: `${origin}/auth/error?reason=${reason}`,
    'cache-control': 'no-store',
  });
  for (const cookie of options.setCookies ?? []) headers.append('set-cookie', cookie);
  return new Response(null, { status: 302, headers });
}
