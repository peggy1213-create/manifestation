import { beforeAll, describe, expect, it } from 'vitest';
import { base64UrlEncode, utf8Bytes } from './encoding';
import { AuthError } from './errors';
import type { JsonWebKey, JsonWebKeySet } from './jwks';
import { decodeJwt, verifyIdToken } from './jwt';

const CLIENT_ID = '1234567890-clearpath.apps.googleusercontent.com';
const NONCE = 'nonce-from-the-pkce-cookie';
const NOW = 1_800_000_000; // epoch seconds, fixed so expiry maths is readable

interface SigningKey {
  kid: string;
  privateKey: CryptoKey;
  jwk: JsonWebKey;
}

let google: SigningKey;
let attacker: SigningKey;
let jwks: JsonWebKeySet;

async function generateSigningKey(kid: string): Promise<SigningKey> {
  const pair = (await crypto.subtle.generateKey(
    {
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256',
    },
    true,
    ['sign', 'verify'],
  )) as CryptoKeyPair;
  const exported = (await crypto.subtle.exportKey('jwk', pair.publicKey)) as {
    n: string;
    e: string;
  };
  return {
    kid,
    privateKey: pair.privateKey,
    jwk: { kty: 'RSA', alg: 'RS256', use: 'sig', kid, n: exported.n, e: exported.e },
  };
}

type Claims = Record<string, unknown>;

function validClaims(overrides: Claims = {}): Claims {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '110169484474386276334',
    exp: NOW + 3600,
    iat: NOW - 10,
    nonce: NONCE,
    email: 'peggy@example.com',
    email_verified: true,
    name: '佩君',
    ...overrides,
  };
}

async function signIdToken(
  key: SigningKey,
  claims: Claims = validClaims(),
  header: Record<string, unknown> = {},
): Promise<string> {
  const encodedHeader = base64UrlEncode(
    utf8Bytes(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: key.kid, ...header })),
  );
  const encodedClaims = base64UrlEncode(utf8Bytes(JSON.stringify(claims)));
  const signingInput = `${encodedHeader}.${encodedClaims}`;
  const signature = await crypto.subtle.sign(
    { name: 'RSASSA-PKCS1-v1_5' },
    key.privateKey,
    utf8Bytes(signingInput),
  );
  return `${signingInput}.${base64UrlEncode(new Uint8Array(signature))}`;
}

function verify(idToken: string, overrides: Partial<Parameters<typeof verifyIdToken>[0]> = {}) {
  return verifyIdToken({
    idToken,
    clientId: CLIENT_ID,
    nonce: NONCE,
    jwks,
    now: NOW,
    ...overrides,
  });
}

beforeAll(async () => {
  google = await generateSigningKey('google-key-1');
  attacker = await generateSigningKey('google-key-1'); // same kid, different key
  jwks = { keys: [google.jwk] };
}, 30_000);

describe('decodeJwt', () => {
  it('reads the header and claims', async () => {
    const decoded = decodeJwt(await signIdToken(google));
    expect(decoded.header).toMatchObject({ alg: 'RS256', kid: 'google-key-1' });
    expect(decoded.claims.sub).toBe('110169484474386276334');
    expect(decoded.claims.name).toBe('佩君');
  });

  it('rejects anything that is not three base64url parts', () => {
    expect(() => decodeJwt('one.two')).toThrow(AuthError);
    expect(() => decodeJwt('one.two.three.four')).toThrow(AuthError);
    expect(() => decodeJwt('not!.a!.jwt!')).toThrow(AuthError);
    expect(() => decodeJwt('')).toThrow(AuthError);
  });
});

describe('verifyIdToken', () => {
  it('accepts a well-formed Google ID token', async () => {
    const claims = await verify(await signIdToken(google));
    expect(claims.sub).toBe('110169484474386276334');
    expect(claims.email).toBe('peggy@example.com');
    expect(claims.name).toBe('佩君');
  });

  it('accepts the bare issuer form Google also uses', async () => {
    const token = await signIdToken(google, validClaims({ iss: 'accounts.google.com' }));
    await expect(verify(token)).resolves.toMatchObject({ iss: 'accounts.google.com' });
  });

  it('rejects a token signed by another key with the same kid', async () => {
    const token = await signIdToken(attacker);
    await expect(verify(token)).rejects.toMatchObject({ code: 'bad_signature' });
  });

  it('rejects a token whose claims were edited after signing', async () => {
    const token = await signIdToken(google);
    const [header, , signature] = token.split('.') as [string, string, string];
    const forged = base64UrlEncode(
      utf8Bytes(JSON.stringify(validClaims({ email: 'attacker@example.com' }))),
    );
    await expect(verify(`${header}.${forged}.${signature}`)).rejects.toMatchObject({
      code: 'bad_signature',
    });
  });

  it('rejects a token signed by a key that is not in the JWKS', async () => {
    const token = await signIdToken(attacker, validClaims(), { kid: 'rotated-away' });
    await expect(verify(token)).rejects.toMatchObject({ code: 'unknown_key' });
  });

  it('rejects alg: none and other algorithms', async () => {
    const claims = base64UrlEncode(utf8Bytes(JSON.stringify(validClaims())));
    const header = base64UrlEncode(utf8Bytes(JSON.stringify({ alg: 'none', typ: 'JWT' })));
    await expect(verify(`${header}.${claims}.`)).rejects.toThrow(AuthError);

    const hs256 = base64UrlEncode(utf8Bytes(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
    await expect(verify(`${hs256}.${claims}.AAAA`)).rejects.toMatchObject({
      code: 'unsupported_algorithm',
    });
  });

  it('rejects a token issued for another client', async () => {
    const token = await signIdToken(
      google,
      validClaims({ aud: 'someone-else.apps.googleusercontent.com' }),
    );
    await expect(verify(token)).rejects.toMatchObject({ code: 'wrong_audience' });
  });

  it('rejects a token from another issuer', async () => {
    const token = await signIdToken(google, validClaims({ iss: 'https://evil.example.com' }));
    await expect(verify(token)).rejects.toMatchObject({ code: 'wrong_issuer' });
  });

  it('rejects an expired token, with 60s of leeway', async () => {
    const justExpired = await signIdToken(google, validClaims({ exp: NOW - 30 }));
    await expect(verify(justExpired)).resolves.toBeTruthy();

    const expired = await signIdToken(google, validClaims({ exp: NOW - 120 }));
    await expect(verify(expired)).rejects.toMatchObject({ code: 'token_expired' });
  });

  it('rejects a token issued in the future, with 60s of leeway', async () => {
    const slightlyAhead = await signIdToken(google, validClaims({ iat: NOW + 30 }));
    await expect(verify(slightlyAhead)).resolves.toBeTruthy();

    const ahead = await signIdToken(google, validClaims({ iat: NOW + 600, exp: NOW + 4200 }));
    await expect(verify(ahead)).rejects.toMatchObject({ code: 'token_not_yet_valid' });
  });

  it('rejects a replayed token from another sign-in (wrong nonce)', async () => {
    const token = await signIdToken(google, validClaims({ nonce: 'a-different-nonce' }));
    await expect(verify(token)).rejects.toMatchObject({ code: 'nonce_mismatch' });

    const noNonce = await signIdToken(google, validClaims({ nonce: undefined }));
    await expect(verify(noNonce)).rejects.toMatchObject({ code: 'nonce_mismatch' });
  });

  it('rejects an unverified email', async () => {
    const token = await signIdToken(google, validClaims({ email_verified: false }));
    await expect(verify(token)).rejects.toMatchObject({ code: 'email_not_verified' });

    const noEmail = await signIdToken(
      google,
      validClaims({ email: undefined, email_verified: undefined }),
    );
    await expect(verify(noEmail)).rejects.toMatchObject({ code: 'email_not_verified' });
  });

  it('accepts an aud array that contains our client id', async () => {
    const token = await signIdToken(google, validClaims({ aud: ['other-client', CLIENT_ID] }));
    await expect(verify(token)).resolves.toBeTruthy();
  });
});
