import { GOOGLE_JWKS_URL, createJwksCache, importCookieKey, type JwksCache } from '@clearpath/auth';
import { getEnv } from './cloudflare';

/**
 * Wiring between the Worker's environment and the protocol code in
 * @clearpath/auth. The secrets stay here; nothing below app/api/auth reads
 * them directly.
 */

/** The cookie that carries one sign-in attempt out to Google and back. */
export const OAUTH_COOKIE = 'cp_oauth';

/** An attempt is good for ten minutes. */
export const OAUTH_TTL_MS = 10 * 60 * 1000;

/**
 * Scoped to the callback: this cookie has no business being sent with any
 * other request. SameSite=Lax so it survives Google's redirect back.
 */
export const OAUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/api/auth',
  maxAge: Math.floor(OAUTH_TTL_MS / 1000),
} as const;

export const CALLBACK_PATH = '/api/auth/google/callback';

export interface GoogleConfig {
  clientId: string;
  clientSecret: string;
  cookieKey: CryptoKey;
}

/**
 * The Google client, or null when it has not been set up. Returning null
 * rather than throwing lets the sign-in page say so plainly instead of
 * answering 500.
 */
export async function googleConfig(): Promise<GoogleConfig | null> {
  const env = await getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.COOKIE_KEY) return null;

  try {
    return {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      cookieKey: await importCookieKey(env.COOKIE_KEY),
    };
  } catch {
    return null;
  }
}

/**
 * The URL Google redirects back to. It has to match the one registered in the
 * Google client exactly, so PUBLIC_ORIGIN can pin it when the Worker sits
 * behind something that rewrites the request URL.
 */
export async function callbackUrl(request: Request): Promise<string> {
  const env = await getEnv();
  const origin = env.PUBLIC_ORIGIN?.trim() || new URL(request.url).origin;
  return new URL(CALLBACK_PATH, origin).toString();
}

// One cache per isolate: Google's signing keys are the same for every request.
let jwks: JwksCache | null = null;

export function googleJwks(): JwksCache {
  jwks ??= createJwksCache({ url: GOOGLE_JWKS_URL });
  return jwks;
}

/** Sends the person back to the sign-in page with a gentle reason. */
export function signInRedirect(request: Request, reason: string): Response {
  const url = new URL('/sign-in', request.url);
  url.searchParams.set('error', reason);
  return new Response(null, {
    status: 302,
    headers: { location: url.toString(), 'cache-control': 'no-store' },
  });
}
