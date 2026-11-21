import { AuthError } from './errors';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function utf8Bytes(value: string): Uint8Array {
  return encoder.encode(value);
}

export function utf8String(bytes: Uint8Array): string {
  return decoder.decode(bytes);
}

/** base64url (RFC 4648 §5), no padding — the encoding OAuth 2.0 and JWT use. */
export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(value)) {
    throw new AuthError('invalid_encoding', 'value is not base64url');
  }
  const padded =
    value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new AuthError('invalid_encoding', 'value is not base64url');
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function toHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

/** `crypto.getRandomValues` only — no Node crypto, no libraries. */
export function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

/** A random base64url token, `byteLength` bytes of entropy. */
export function randomToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

/**
 * Compares two strings without leaking where they differ. Unequal lengths are
 * reported as a mismatch, but still after a full pass over the first value.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  const left = utf8Bytes(a);
  const right = utf8Bytes(b);
  const sameLength = left.length === right.length;
  const reference = sameLength ? right : left;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) {
    diff |= (left[i] ?? 0) ^ (reference[i] ?? 0);
  }
  return sameLength && diff === 0;
}
