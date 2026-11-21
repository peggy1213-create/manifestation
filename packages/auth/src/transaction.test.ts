import { describe, expect, it } from 'vitest';
import { base64UrlEncode, randomBytes } from './encoding';
import { importCookieKey } from './seal';
import {
  clearedOAuthCookie,
  oauthCookie,
  openTransaction,
  sealTransaction,
  startTransaction,
  OAUTH_COOKIE_MAX_AGE_SECONDS,
  OAUTH_COOKIE_NAME,
} from './transaction';

const now = 1_700_000_000_000;
const key = await importCookieKey(base64UrlEncode(randomBytes(32)));

describe('startTransaction', () => {
  it('creates a verifier, challenge, state and nonce', async () => {
    const { transaction, codeChallenge } = await startTransaction({ returnTo: '/app', now });
    expect(transaction.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(transaction.state).not.toBe(transaction.nonce);
    expect(transaction.returnTo).toBe('/app');
    expect(transaction.createdAt).toBe(now);
  });
});

describe('the PKCE cookie', () => {
  it('round-trips through the seal', async () => {
    const { transaction } = await startTransaction({ returnTo: '/app/顯化', now });
    const sealed = await sealTransaction(key, transaction);
    await expect(openTransaction(key, sealed, { now })).resolves.toEqual(transaction);
  });

  it('is short-lived, HttpOnly, Secure, SameSite=Lax', async () => {
    const { transaction } = await startTransaction({ returnTo: '/app', now });
    const cookie = oauthCookie(await sealTransaction(key, transaction));
    expect(cookie.startsWith(`${OAUTH_COOKIE_NAME}=`)).toBe(true);
    expect(cookie).toContain(`Max-Age=${OAUTH_COOKIE_MAX_AGE_SECONDS}`);
    expect(OAUTH_COOKIE_MAX_AGE_SECONDS).toBe(600);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(clearedOAuthCookie()).toContain('Max-Age=0');
  });

  it('expires after 10 minutes', async () => {
    const { transaction } = await startTransaction({ returnTo: '/app', now });
    const sealed = await sealTransaction(key, transaction);
    await expect(openTransaction(key, sealed, { now: now + 9 * 60_000 })).resolves.not.toBeNull();
    await expect(openTransaction(key, sealed, { now: now + 11 * 60_000 })).resolves.toBeNull();
  });

  it('refuses a cookie that is missing, forged or from another key', async () => {
    const other = await importCookieKey(base64UrlEncode(randomBytes(32)));
    const { transaction } = await startTransaction({ returnTo: '/app', now });
    const sealed = await sealTransaction(key, transaction);

    await expect(openTransaction(key, undefined, { now })).resolves.toBeNull();
    await expect(openTransaction(key, '', { now })).resolves.toBeNull();
    await expect(openTransaction(other, sealed, { now })).resolves.toBeNull();
    await expect(openTransaction(key, 'garbage!', { now })).resolves.toBeNull();
  });

  it('refuses a cookie whose payload is not a transaction', async () => {
    const { transaction } = await startTransaction({ returnTo: '/app', now });
    const shortVerifier = await sealTransaction(key, { ...transaction, codeVerifier: 'tiny' });
    await expect(openTransaction(key, shortVerifier, { now })).resolves.toBeNull();

    const noState = await sealTransaction(key, { ...transaction, state: '' });
    await expect(openTransaction(key, noState, { now })).resolves.toBeNull();

    const dated = await sealTransaction(key, { ...transaction, createdAt: now + 10 * 60_000 });
    await expect(openTransaction(key, dated, { now })).resolves.toBeNull();
  });
});
