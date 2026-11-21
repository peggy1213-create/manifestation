import { AuthError } from './errors';

export const GOOGLE_JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

export interface JsonWebKey {
  kty: string;
  kid?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

export interface JsonWebKeySet {
  keys: JsonWebKey[];
}

/** Narrow slice of the Cache API, so tests can pass a plain fake. */
export interface JwksCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface FetchJwksOptions {
  url?: string;
  /** `caches.default` in a Worker; omit (or pass null) to fetch every time. */
  cache?: JwksCache | null;
  fetchImpl?: typeof fetch;
  /** Skip the cached copy, for the one retry after a key rotation. */
  forceRefresh?: boolean;
  /** Floor and ceiling applied to the upstream `max-age`. */
  minMaxAgeSeconds?: number;
  maxMaxAgeSeconds?: number;
  fallbackMaxAgeSeconds?: number;
}

/** Reads `max-age` (seconds) out of a `Cache-Control` header. */
export function parseMaxAge(cacheControl: string | null | undefined): number | null {
  if (!cacheControl) return null;
  const match = /(?:^|[,\s])max-age\s*=\s*"?(\d+)"?/i.exec(cacheControl);
  if (!match?.[1]) return null;
  const seconds = Number.parseInt(match[1], 10);
  return Number.isFinite(seconds) ? seconds : null;
}

function isKeySet(value: unknown): value is JsonWebKeySet {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as JsonWebKeySet).keys) &&
    (value as JsonWebKeySet).keys.every((key) => typeof key === 'object' && key !== null)
  );
}

/**
 * Google's signing keys, cached in the Cache API for the `max-age` Google
 * sends (clamped), so a sign-in costs one extra request at most per rotation.
 */
export async function fetchJwks(options: FetchJwksOptions = {}): Promise<JsonWebKeySet> {
  const {
    url = GOOGLE_JWKS_URL,
    cache = null,
    fetchImpl = fetch,
    forceRefresh = false,
    minMaxAgeSeconds = 60,
    maxMaxAgeSeconds = 86_400,
    fallbackMaxAgeSeconds = 3_600,
  } = options;

  const cacheKey = new Request(url, { method: 'GET' });

  if (cache && !forceRefresh) {
    const hit = await cache.match(cacheKey);
    if (hit) {
      const cached: unknown = await hit.json().catch(() => null);
      if (isKeySet(cached)) return cached;
    }
  }

  const response = await fetchImpl(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new AuthError('jwks_unavailable', `JWKS responded ${response.status}`);
  }

  const body = await response.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AuthError('jwks_unavailable', 'JWKS was not JSON');
  }
  if (!isKeySet(parsed)) {
    throw new AuthError('jwks_unavailable', 'JWKS had no keys');
  }

  if (cache) {
    const maxAge = Math.min(
      maxMaxAgeSeconds,
      Math.max(
        minMaxAgeSeconds,
        parseMaxAge(response.headers.get('cache-control')) ?? fallbackMaxAgeSeconds,
      ),
    );
    await cache.put(
      cacheKey,
      new Response(body, {
        headers: { 'content-type': 'application/json', 'cache-control': `max-age=${maxAge}` },
      }),
    );
  }

  return parsed;
}
