/**
 * The short-lived cookie that carries one sign-in attempt (code verifier,
 * state, nonce) from the redirect out to Google and back again.
 *
 * It is sealed with AES-GCM under COOKIE_KEY, so the browser holds it but
 * cannot read or alter it: AES-GCM authenticates as well as encrypts, and a
 * tampered cookie fails to open rather than opening with different contents.
 * The envelope carries its own expiry, so a stale attempt cannot be replayed.
 */

import { base64UrlDecode, base64UrlEncode } from './base64';

const IV_BYTES = 12;
const KEY_BYTES = 32;

interface Envelope<T> {
  /** The sealed value. */
  v: T;
  /** Expiry, epoch milliseconds. */
  e: number;
}

/**
 * Imports COOKIE_KEY, which is 32 random bytes written as base64url. Generate
 * one with:
 *
 *   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
 */
export async function importCookieKey(secret: string): Promise<CryptoKey> {
  const raw = base64UrlDecode(secret);
  if (raw.byteLength !== KEY_BYTES) {
    throw new TypeError(`COOKIE_KEY must be ${KEY_BYTES} bytes, base64url encoded`);
  }
  return crypto.subtle.importKey('raw', raw as BufferSource, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

export async function seal<T>(
  key: CryptoKey,
  value: T,
  ttlMs: number,
  now: number = Date.now(),
): Promise<string> {
  const envelope: Envelope<T> = { v: value, e: now + ttlMs };
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(envelope));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext as BufferSource),
  );

  const packed = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  packed.set(iv, 0);
  packed.set(ciphertext, iv.byteLength);
  return base64UrlEncode(packed);
}

/**
 * Opens a sealed cookie. Returns null for anything that is not a cookie this
 * key sealed and that is still in date — a wrong key, a changed byte, a
 * truncated value or an expired envelope all look the same from here.
 */
export async function open<T>(
  key: CryptoKey,
  sealed: string,
  now: number = Date.now(),
): Promise<T | null> {
  try {
    const packed = base64UrlDecode(sealed);
    if (packed.byteLength <= IV_BYTES) return null;

    const iv = packed.slice(0, IV_BYTES);
    const ciphertext = packed.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext as BufferSource,
    );

    const envelope = JSON.parse(new TextDecoder().decode(plaintext)) as Envelope<T>;
    if (typeof envelope?.e !== 'number' || envelope.e <= now) return null;
    return envelope.v;
  } catch {
    return null;
  }
}
