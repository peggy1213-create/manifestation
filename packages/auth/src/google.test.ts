import { beforeAll, describe, expect, it } from 'vitest';
import {
  AuthFailure,
  GOOGLE_JWKS_URL,
  buildAuthorizationUrl,
  exchangeCodeForIdToken,
  verifyGoogleIdToken,
} from './google';
import { createJwksCache } from './jwks';
import { createTestIssuer, stubJwksFetch, type TestIssuer } from './test-keys';

const CLIENT_ID = '1234.apps.googleusercontent.com';
const NONCE = 'nonce-from-the-sealed-cookie';
const NOW = 1_800_000_000_000;
const SECONDS = Math.floor(NOW / 1000);

let issuer: TestIssuer;

beforeAll(async () => {
  issuer = await createTestIssuer();
});

function jwksFor(source: TestIssuer, headers?: Record<string, string>) {
  const stub = stubJwksFetch(source.jwks, headers);
  return {
    stub,
    cache: createJwksCache({ url: GOOGLE_JWKS_URL, fetchImpl: stub.fetch, now: () => NOW }),
  };
}

function goodClaims(overrides: Record<string, unknown> = {}) {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: '110000000000000000001',
    email: 'someone@example.test',
    email_verified: true,
    name: '小雨',
    picture: 'https://lh3.googleusercontent.test/a/photo',
    nonce: NONCE,
    iat: SECONDS - 10,
    exp: SECONDS + 3600,
    ...overrides,
  };
}

async function verify(claims: Record<string, unknown>, header?: Record<string, unknown>) {
  const idToken = await issuer.sign(claims, header);
  return verifyGoogleIdToken({
    idToken,
    clientId: CLIENT_ID,
    nonce: NONCE,
    jwks: jwksFor(issuer).cache,
    now: NOW,
  });
}

/** The reason a refusal carried, for a token that should be refused. */
async function reasonFor(
  claims: Record<string, unknown>,
  header?: Record<string, unknown>,
): Promise<string> {
  try {
    await verify(claims, header);
  } catch (error) {
    expect(error).toBeInstanceOf(AuthFailure);
    return (error as AuthFailure).reason;
  }
  throw new Error('expected the sign-in to be refused');
}

describe('the authorization URL', () => {
  const url = new URL(
    buildAuthorizationUrl({
      clientId: CLIENT_ID,
      redirectUri: 'https://clearpath.example/api/auth/google/callback',
      state: 'the-state',
      nonce: NONCE,
      codeChallenge: 'the-challenge',
    }),
  );

  it('goes to Google with an authorization code request', () => {
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe(CLIENT_ID);
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://clearpath.example/api/auth/google/callback',
    );
  });

  it('carries PKCE S256, state and nonce', () => {
    expect(url.searchParams.get('code_challenge')).toBe('the-challenge');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('the-state');
    expect(url.searchParams.get('nonce')).toBe(NONCE);
  });

  it('asks for the account, and nothing more', () => {
    expect(url.searchParams.get('scope')).toBe('openid email profile');
  });
});

describe('exchanging the code', () => {
  function tokenStub(response: Response) {
    const seen: { body?: string } = {};
    const fetchImpl: typeof fetch = async (_input, init) => {
      seen.body = String(init?.body ?? '');
      return response;
    };
    return { fetchImpl, seen };
  }

  const input = {
    clientId: CLIENT_ID,
    clientSecret: 'the-secret',
    redirectUri: 'https://clearpath.example/api/auth/google/callback',
    code: 'the-code',
    codeVerifier: 'the-verifier',
  };

  it('sends the code and the PKCE verifier, and returns the ID token', async () => {
    const { fetchImpl, seen } = tokenStub(
      new Response(JSON.stringify({ id_token: 'an.id.token', access_token: 'ignored' })),
    );

    expect(await exchangeCodeForIdToken({ ...input, fetchImpl })).toBe('an.id.token');

    const body = new URLSearchParams(seen.body ?? '');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('the-code');
    expect(body.get('code_verifier')).toBe('the-verifier');
    expect(body.get('client_secret')).toBe('the-secret');
  });

  it('refuses when Google turns the exchange down', async () => {
    const { fetchImpl } = tokenStub(new Response('{"error":"invalid_grant"}', { status: 400 }));
    await expect(exchangeCodeForIdToken({ ...input, fetchImpl })).rejects.toMatchObject({
      reason: 'token_request_failed',
    });
  });

  it('refuses an answer with no ID token in it', async () => {
    const { fetchImpl } = tokenStub(new Response(JSON.stringify({ access_token: 'only-this' })));
    await expect(exchangeCodeForIdToken({ ...input, fetchImpl })).rejects.toMatchObject({
      reason: 'no_id_token',
    });
  });
});

describe('verifying the ID token', () => {
  it('accepts a properly signed token and reads the identity off it', async () => {
    expect(await verify(goodClaims())).toEqual({
      subject: '110000000000000000001',
      email: 'someone@example.test',
      displayName: '小雨',
      pictureUrl: 'https://lh3.googleusercontent.test/a/photo',
    });
  });

  it('accepts the bare issuer spelling and an aud array', async () => {
    const identity = await verify(goodClaims({ iss: 'accounts.google.com', aud: [CLIENT_ID] }));
    expect(identity.email).toBe('someone@example.test');
  });

  it('treats a missing name or picture as absent, not as empty text', async () => {
    const identity = await verify(goodClaims({ name: undefined, picture: '' }));
    expect(identity.displayName).toBeNull();
    expect(identity.pictureUrl).toBeNull();
  });

  it('refuses a token signed by somebody else', async () => {
    const impostor = await createTestIssuer('test-key-1');
    const idToken = await impostor.sign(goodClaims());

    await expect(
      verifyGoogleIdToken({
        idToken,
        clientId: CLIENT_ID,
        nonce: NONCE,
        // The JWKS carries our real key under the same kid, so only the
        // signature check can catch this.
        jwks: jwksFor(issuer).cache,
        now: NOW,
      }),
    ).rejects.toMatchObject({ reason: 'bad_signature' });
  });

  it('refuses an unsigned token, whatever the header claims', async () => {
    expect(await reasonFor(goodClaims(), { alg: 'none' })).toBe('wrong_algorithm');
    expect(await reasonFor(goodClaims(), { alg: 'HS256' })).toBe('wrong_algorithm');
  });

  it('refuses a token signed with a key it does not know', async () => {
    expect(await reasonFor(goodClaims(), { kid: 'some-other-key' })).toBe('unknown_key');
    expect(await reasonFor(goodClaims(), { kid: undefined })).toBe('unknown_key');
  });

  it('refuses the wrong issuer or the wrong audience', async () => {
    expect(await reasonFor(goodClaims({ iss: 'https://evil.example' }))).toBe('wrong_issuer');
    expect(await reasonFor(goodClaims({ iss: undefined }))).toBe('wrong_issuer');
    expect(await reasonFor(goodClaims({ aud: 'another-client.apps.googleusercontent.com' }))).toBe(
      'wrong_audience',
    );
    expect(await reasonFor(goodClaims({ aud: undefined }))).toBe('wrong_audience');
  });

  it('refuses a token that has expired, allowing a minute of clock drift', async () => {
    expect(await reasonFor(goodClaims({ exp: SECONDS - 3600 }))).toBe('expired');
    expect(await reasonFor(goodClaims({ exp: undefined }))).toBe('expired');
    // Thirty seconds past expiry is within the skew, so it still passes.
    await expect(verify(goodClaims({ exp: SECONDS - 30 }))).resolves.toBeTruthy();
  });

  it('refuses a token issued in the future', async () => {
    expect(await reasonFor(goodClaims({ iat: SECONDS + 3600 }))).toBe('issued_in_future');
  });

  it('refuses a token minted for a different sign-in attempt', async () => {
    expect(await reasonFor(goodClaims({ nonce: 'a-nonce-from-somewhere-else' }))).toBe(
      'wrong_nonce',
    );
    expect(await reasonFor(goodClaims({ nonce: undefined }))).toBe('wrong_nonce');
  });

  it('refuses an account with no verified email, because the email is the account', async () => {
    expect(await reasonFor(goodClaims({ email_verified: false }))).toBe('email_not_verified');
    expect(await reasonFor(goodClaims({ email_verified: 'true' }))).toBe('email_not_verified');
    expect(await reasonFor(goodClaims({ email: undefined }))).toBe('email_not_verified');
  });

  it('refuses a token with no subject', async () => {
    expect(await reasonFor(goodClaims({ sub: undefined }))).toBe('no_subject');
  });

  it('refuses something that is not a token at all', async () => {
    for (const idToken of ['', 'not.a.jwt', 'only-one-part', 'a.b', `${'x'.repeat(10)}.y.z`]) {
      await expect(
        verifyGoogleIdToken({
          idToken,
          clientId: CLIENT_ID,
          nonce: NONCE,
          jwks: jwksFor(issuer).cache,
          now: NOW,
        }),
      ).rejects.toBeInstanceOf(AuthFailure);
    }
  });
});
