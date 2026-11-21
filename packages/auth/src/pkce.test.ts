import { describe, expect, it } from 'vitest';
import { createCodeVerifier, createPkcePair, deriveCodeChallenge } from './pkce';

describe('PKCE', () => {
  it('matches the RFC 7636 appendix B test vector', async () => {
    // https://www.rfc-editor.org/rfc/rfc7636#appendix-B
    const verifier = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
    await expect(deriveCodeChallenge(verifier)).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });

  it('creates verifiers in the character set and length RFC 7636 allows', () => {
    const verifier = createCodeVerifier();
    expect(verifier).toMatch(/^[A-Za-z0-9\-._~]+$/);
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    expect(verifier.length).toBeLessThanOrEqual(128);
  });

  it('never repeats a verifier', () => {
    const verifiers = new Set(Array.from({ length: 50 }, () => createCodeVerifier()));
    expect(verifiers.size).toBe(50);
  });

  it('pairs a verifier with its S256 challenge', async () => {
    const pair = await createPkcePair();
    expect(pair.codeChallengeMethod).toBe('S256');
    expect(pair.codeChallenge).toBe(await deriveCodeChallenge(pair.codeVerifier));
    expect(pair.codeChallenge).not.toBe(pair.codeVerifier);
    expect(pair.codeChallenge).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});
