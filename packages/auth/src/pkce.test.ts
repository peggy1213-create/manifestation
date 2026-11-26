import { describe, expect, it } from 'vitest';
import { base64UrlDecode, base64UrlEncode, randomBase64Url, timingSafeEqual } from './base64';
import { codeChallengeS256, newCodeVerifier, newNonce, newState } from './pkce';

describe('base64url', () => {
  it('round-trips bytes, with no padding and no + or /', () => {
    const bytes = crypto.getRandomValues(new Uint8Array(96));
    const encoded = base64UrlEncode(bytes);
    expect(encoded).not.toMatch(/[+/=]/u);
    expect([...base64UrlDecode(encoded)]).toEqual([...bytes]);
  });

  it('round-trips every byte value', () => {
    const bytes = new Uint8Array(256).map((_, index) => index);
    expect([...base64UrlDecode(base64UrlEncode(bytes))]).toEqual([...bytes]);
  });

  it('makes random values of the asked-for length', () => {
    expect(base64UrlDecode(randomBase64Url(32))).toHaveLength(32);
    expect(new Set(Array.from({ length: 50 }, () => randomBase64Url(32))).size).toBe(50);
  });
});

describe('timingSafeEqual', () => {
  it('compares values without a length-dependent early exit', () => {
    expect(timingSafeEqual('abc', 'abc')).toBe(true);
    expect(timingSafeEqual('abc', 'abd')).toBe(false);
    expect(timingSafeEqual('abc', 'abcd')).toBe(false);
    expect(timingSafeEqual('', '')).toBe(true);
  });
});

describe('PKCE', () => {
  it('mints 32-byte verifiers, states and nonces that do not repeat', () => {
    for (const mint of [newCodeVerifier, newState, newNonce]) {
      const values = new Set(Array.from({ length: 50 }, () => mint()));
      expect(values.size).toBe(50);
      for (const value of values) {
        expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/u);
      }
    }
  });

  it('derives the S256 challenge as base64url(SHA-256(verifier))', async () => {
    // The worked example from RFC 7636 appendix B.
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    expect(await codeChallengeS256(verifier)).toBe('E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM');
  });

  it('gives a different challenge for a different verifier', async () => {
    const a = await codeChallengeS256(newCodeVerifier());
    const b = await codeChallengeS256(newCodeVerifier());
    expect(a).not.toBe(b);
    expect(a).not.toMatch(/[+/=]/u);
  });
});
