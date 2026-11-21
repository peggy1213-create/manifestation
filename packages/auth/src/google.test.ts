import { describe, expect, it, vi } from 'vitest';
import {
  buildGoogleAuthorizationUrl,
  exchangeAuthorizationCode,
  GOOGLE_AUTHORIZATION_ENDPOINT,
} from './google';

const params = {
  clientId: 'client-id.apps.googleusercontent.com',
  redirectUri: 'https://clearpath.app/auth/google/callback',
  state: 'state-value',
  nonce: 'nonce-value',
  codeChallenge: 'challenge-value',
};

describe('buildGoogleAuthorizationUrl', () => {
  it('asks for an authorization code with PKCE S256', () => {
    const url = new URL(buildGoogleAuthorizationUrl(params));
    expect(`${url.origin}${url.pathname}`).toBe(GOOGLE_AUTHORIZATION_ENDPOINT);
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-value');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe('state-value');
    expect(url.searchParams.get('nonce')).toBe('nonce-value');
    expect(url.searchParams.get('prompt')).toBe('select_account');
    expect(url.searchParams.get('redirect_uri')).toBe(params.redirectUri);
    expect(url.searchParams.get('client_id')).toBe(params.clientId);
  });

  it('never sends the code verifier to the browser', () => {
    const url = buildGoogleAuthorizationUrl(params);
    expect(url).not.toContain('code_verifier');
    expect(url).not.toContain('client_secret');
  });
});

describe('exchangeAuthorizationCode', () => {
  const exchange = {
    clientId: 'client-id.apps.googleusercontent.com',
    clientSecret: 'super-secret',
    code: 'auth-code',
    codeVerifier: 'verifier-value',
    redirectUri: 'https://clearpath.app/auth/google/callback',
  };

  it('posts the code, verifier and secret as a form', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id_token: 'id.token.value', expires_in: 3599 }), {
        headers: { 'content-type': 'application/json' },
      }),
    );

    const result = await exchangeAuthorizationCode({
      ...exchange,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    });
    expect(result.idToken).toBe('id.token.value');
    expect(result.expiresIn).toBe(3599);

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://oauth2.googleapis.com/token');
    expect(init.method).toBe('POST');
    const body = new URLSearchParams(String(init.body));
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('code_verifier')).toBe('verifier-value');
    expect(body.get('client_secret')).toBe('super-secret');
    expect(body.get('redirect_uri')).toBe(exchange.redirectUri);
  });

  it('fails without leaking the provider response', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: 'invalid_grant', code: 'auth-code' }), {
        status: 400,
      }),
    );
    await expect(
      exchangeAuthorizationCode({ ...exchange, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: 'token_exchange_failed' });

    const error: unknown = await exchangeAuthorizationCode({
      ...exchange,
      fetchImpl: fetchImpl as unknown as typeof fetch,
    }).catch((caught: unknown) => caught);
    expect((error as Error).message).not.toContain('auth-code');
  });

  it('fails when the response carries no id_token', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'only-access' }), {
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      exchangeAuthorizationCode({ ...exchange, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).rejects.toMatchObject({ code: 'token_exchange_failed' });
  });
});
