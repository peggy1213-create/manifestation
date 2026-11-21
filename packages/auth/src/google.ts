import { AuthError } from './errors';

export const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** openid for the ID token, email and profile for the address and display name. */
export const GOOGLE_SCOPE = 'openid email profile';

export interface AuthorizationUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  /** `select_account` so a shared browser never signs in silently. */
  prompt?: 'select_account' | 'consent' | 'none';
  loginHint?: string;
}

export function buildGoogleAuthorizationUrl(params: AuthorizationUrlParams): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPE);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', params.state);
  url.searchParams.set('nonce', params.nonce);
  url.searchParams.set('prompt', params.prompt ?? 'select_account');
  if (params.loginHint) url.searchParams.set('login_hint', params.loginHint);
  return url.toString();
}

export interface TokenExchangeParams {
  clientId: string;
  clientSecret: string;
  code: string;
  codeVerifier: string;
  redirectUri: string;
  fetchImpl?: typeof fetch;
  tokenEndpoint?: string;
}

export interface TokenExchangeResult {
  idToken: string;
  accessToken?: string;
  expiresIn?: number;
  scope?: string;
  tokenType?: string;
}

/**
 * Swaps the authorization code for tokens. Server-side only: the client secret
 * and the code verifier both go in this request and never near the browser.
 */
export async function exchangeAuthorizationCode(
  params: TokenExchangeParams,
): Promise<TokenExchangeResult> {
  const {
    clientId,
    clientSecret,
    code,
    codeVerifier,
    redirectUri,
    fetchImpl = fetch,
    tokenEndpoint = GOOGLE_TOKEN_ENDPOINT,
  } = params;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
  });

  const response = await fetchImpl(tokenEndpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body,
  });

  if (!response.ok) {
    // The body can carry the user's code; keep it out of logs and responses.
    throw new AuthError('token_exchange_failed', `token endpoint responded ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AuthError('token_exchange_failed', 'the token response was not JSON');
  }

  const tokens = payload as Record<string, unknown>;
  if (typeof tokens.id_token !== 'string' || tokens.id_token.length === 0) {
    throw new AuthError('token_exchange_failed', 'the token response had no id_token');
  }

  return {
    idToken: tokens.id_token,
    accessToken: typeof tokens.access_token === 'string' ? tokens.access_token : undefined,
    expiresIn: typeof tokens.expires_in === 'number' ? tokens.expires_in : undefined,
    scope: typeof tokens.scope === 'string' ? tokens.scope : undefined,
    tokenType: typeof tokens.token_type === 'string' ? tokens.token_type : undefined,
  };
}
