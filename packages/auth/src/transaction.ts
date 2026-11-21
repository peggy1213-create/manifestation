import { clearCookie, serializeCookie } from './cookies';
import { createPkcePair } from './pkce';
import { randomToken } from './encoding';
import { seal, unseal } from './seal';

/** The in-flight sign-in, kept only in an encrypted cookie on the visitor's browser. */
export interface OAuthTransaction {
  codeVerifier: string;
  state: string;
  nonce: string;
  /** Same-origin path to land on after sign-in. */
  returnTo: string;
  /** Epoch milliseconds. */
  createdAt: number;
}

export const OAUTH_COOKIE_NAME = 'cp_oauth';
export const OAUTH_COOKIE_MAX_AGE_SECONDS = 600;

export interface StartTransactionOptions {
  returnTo: string;
  now?: number;
}

export async function startTransaction(
  options: StartTransactionOptions,
): Promise<{ transaction: OAuthTransaction; codeChallenge: string }> {
  const { codeVerifier, codeChallenge } = await createPkcePair();
  return {
    transaction: {
      codeVerifier,
      state: randomToken(32),
      nonce: randomToken(32),
      returnTo: options.returnTo,
      createdAt: options.now ?? Date.now(),
    },
    codeChallenge,
  };
}

export async function sealTransaction(
  key: CryptoKey,
  transaction: OAuthTransaction,
): Promise<string> {
  return seal(key, transaction);
}

/**
 * Opens the PKCE cookie. Returns `null` when it is missing, was not sealed with
 * this key, is malformed, or is older than `maxAgeSeconds` (10 minutes).
 */
export async function openTransaction(
  key: CryptoKey,
  value: string | undefined,
  options: { now?: number; maxAgeSeconds?: number } = {},
): Promise<OAuthTransaction | null> {
  if (!value) return null;
  const { now = Date.now(), maxAgeSeconds = OAUTH_COOKIE_MAX_AGE_SECONDS } = options;
  const transaction = await unseal<OAuthTransaction>(key, value);
  if (!transaction || !isTransaction(transaction)) return null;
  if (now - transaction.createdAt > maxAgeSeconds * 1000) return null;
  if (transaction.createdAt - 60_000 > now) return null;
  return transaction;
}

function isTransaction(value: OAuthTransaction): boolean {
  return (
    typeof value.codeVerifier === 'string' &&
    value.codeVerifier.length >= 43 &&
    typeof value.state === 'string' &&
    value.state.length >= 16 &&
    typeof value.nonce === 'string' &&
    value.nonce.length >= 16 &&
    typeof value.returnTo === 'string' &&
    typeof value.createdAt === 'number'
  );
}

export function oauthCookie(sealed: string): string {
  return serializeCookie(OAUTH_COOKIE_NAME, sealed, {
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
    sameSite: 'Lax',
    httpOnly: true,
    secure: true,
  });
}

export function clearedOAuthCookie(): string {
  return clearCookie(OAUTH_COOKIE_NAME);
}
