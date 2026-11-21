import { describe, expect, it } from 'vitest';
import {
  base64UrlDecode,
  base64UrlEncode,
  constantTimeEqual,
  randomBytes,
  randomToken,
  toHex,
  utf8Bytes,
  utf8String,
} from './encoding';
import { AuthError } from './errors';

describe('base64url', () => {
  it('round-trips bytes without padding', () => {
    const bytes = randomBytes(32);
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toContain('=');
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(Array.from(base64UrlDecode(encoded))).toEqual(Array.from(bytes));
  });

  it('round-trips 繁體中文 through UTF-8', () => {
    const value = '顯化：今天沒做到也沒關係';
    expect(utf8String(base64UrlDecode(base64UrlEncode(utf8Bytes(value))))).toBe(value);
  });

  it('rejects values that are not base64url', () => {
    expect(() => base64UrlDecode('not base64!')).toThrow(AuthError);
    expect(() => base64UrlDecode('AA+/')).toThrow(AuthError);
  });

  it('writes lowercase hex', () => {
    expect(toHex(new Uint8Array([0, 15, 16, 255]))).toBe('000f10ff');
  });

  it('makes tokens of the requested entropy', () => {
    expect(base64UrlDecode(randomToken(32))).toHaveLength(32);
    expect(base64UrlDecode(randomToken(16))).toHaveLength(16);
  });
});

describe('constantTimeEqual', () => {
  it('accepts identical strings', () => {
    expect(constantTimeEqual('abc', 'abc')).toBe(true);
    expect(constantTimeEqual('', '')).toBe(true);
  });

  it('rejects differences anywhere in the string', () => {
    expect(constantTimeEqual('abc', 'abd')).toBe(false);
    expect(constantTimeEqual('abc', 'bbc')).toBe(false);
  });

  it('rejects differing lengths', () => {
    expect(constantTimeEqual('abc', 'abcd')).toBe(false);
    expect(constantTimeEqual('abcd', 'abc')).toBe(false);
  });
});
