import { base64UrlDecode, base64UrlEncode, randomBytes, utf8Bytes, utf8String } from './encoding';
import { AuthError } from './errors';

const AES_GCM = 'AES-GCM';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * Imports `COOKIE_KEY` (a Wrangler secret) as an AES-256-GCM key. The secret is
 * 32 bytes, written as base64url, standard base64 or hex.
 */
export async function importCookieKey(material: string): Promise<CryptoKey> {
  const raw = decodeKeyMaterial(material.trim());
  if (raw.length !== KEY_BYTES) {
    throw new AuthError('cookie_key_invalid', `COOKIE_KEY must be ${KEY_BYTES} bytes`);
  }
  return crypto.subtle.importKey('raw', raw, { name: AES_GCM }, false, ['encrypt', 'decrypt']);
}

function decodeKeyMaterial(material: string): Uint8Array {
  if (/^[0-9a-fA-F]{64}$/.test(material)) {
    const bytes = new Uint8Array(KEY_BYTES);
    for (let i = 0; i < KEY_BYTES; i += 1) {
      bytes[i] = Number.parseInt(material.slice(i * 2, i * 2 + 2), 16);
    }
    return bytes;
  }
  try {
    return base64UrlDecode(material.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''));
  } catch {
    throw new AuthError('cookie_key_invalid', 'COOKIE_KEY is not base64url, base64 or hex');
  }
}

/** `base64url(iv ‖ AES-GCM(payload))`. The 96-bit IV is fresh for every seal. */
export async function seal(key: CryptoKey, payload: unknown): Promise<string> {
  const iv = randomBytes(IV_BYTES);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: AES_GCM, iv }, key, utf8Bytes(JSON.stringify(payload))),
  );
  const sealed = new Uint8Array(iv.length + ciphertext.length);
  sealed.set(iv);
  sealed.set(ciphertext, iv.length);
  return base64UrlEncode(sealed);
}

/** Returns `null` for anything that is not an intact seal under this key. */
export async function unseal<T>(key: CryptoKey, value: string): Promise<T | null> {
  try {
    const sealed = base64UrlDecode(value);
    if (sealed.length <= IV_BYTES) return null;
    const plaintext = await crypto.subtle.decrypt(
      { name: AES_GCM, iv: sealed.slice(0, IV_BYTES) },
      key,
      sealed.slice(IV_BYTES),
    );
    return JSON.parse(utf8String(new Uint8Array(plaintext))) as T;
  } catch {
    return null;
  }
}
