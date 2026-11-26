/**
 * Google's signing keys, cached.
 *
 * Google rotates these, so the cache honours the Cache-Control max-age on the
 * JWKS response and refetches when a token arrives with a key id we have not
 * seen. That refetch is rate limited: an unknown kid is otherwise a way to make
 * this Worker hammer Google on demand.
 */

export interface Jwk {
  kid?: string;
  kty?: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

export interface JwksCache {
  getKey(kid: string): Promise<CryptoKey | null>;
}

export interface JwksCacheOptions {
  url: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  /** Used when the response carries no usable Cache-Control. */
  defaultTtlMs?: number;
  /** The shortest gap between two fetches prompted by an unknown key id. */
  minRefetchMs?: number;
}

const DEFAULT_TTL_MS = 60 * 60 * 1000;
const MIN_TTL_MS = 5 * 60 * 1000;
const MAX_TTL_MS = 24 * 60 * 60 * 1000;
const MIN_REFETCH_MS = 60 * 1000;

function maxAgeFrom(header: string | null): number | null {
  if (!header) return null;
  const match = /max-age\s*=\s*(\d+)/iu.exec(header);
  if (!match?.[1]) return null;
  const seconds = Number.parseInt(match[1], 10);
  return Number.isFinite(seconds) ? seconds * 1000 : null;
}

async function importJwk(jwk: Jwk): Promise<CryptoKey | null> {
  if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) return null;
  if (jwk.alg && jwk.alg !== 'RS256') return null;
  if (jwk.use && jwk.use !== 'sig') return null;

  try {
    return await crypto.subtle.importKey(
      'jwk',
      { kty: 'RSA', n: jwk.n, e: jwk.e, alg: 'RS256', ext: true },
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
  } catch {
    return null;
  }
}

export function createJwksCache(options: JwksCacheOptions): JwksCache {
  const fetchImpl = options.fetchImpl ?? fetch;
  const now = options.now ?? Date.now;
  const defaultTtl = options.defaultTtlMs ?? DEFAULT_TTL_MS;
  const minRefetch = options.minRefetchMs ?? MIN_REFETCH_MS;

  let keys = new Map<string, CryptoKey>();
  let expiresAt = 0;
  let lastFetchAt = 0;
  let inFlight: Promise<void> | null = null;

  async function refresh(): Promise<void> {
    // One fetch at a time: concurrent requests share it rather than stampede.
    inFlight ??= (async () => {
      try {
        const response = await fetchImpl(options.url, { headers: { accept: 'application/json' } });
        lastFetchAt = now();
        if (!response.ok) return;

        const body = (await response.json()) as { keys?: Jwk[] };
        if (!Array.isArray(body.keys)) return;

        const next = new Map<string, CryptoKey>();
        for (const jwk of body.keys) {
          if (!jwk.kid) continue;
          const key = await importJwk(jwk);
          if (key) next.set(jwk.kid, key);
        }

        // An empty or unusable answer leaves the keys we already trust in place.
        if (next.size === 0) return;

        keys = next;
        const ttl = maxAgeFrom(response.headers.get('cache-control')) ?? defaultTtl;
        expiresAt = now() + Math.min(MAX_TTL_MS, Math.max(MIN_TTL_MS, ttl));
      } catch {
        lastFetchAt = now();
      } finally {
        inFlight = null;
      }
    })();

    await inFlight;
  }

  return {
    async getKey(kid: string): Promise<CryptoKey | null> {
      if (now() >= expiresAt) {
        await refresh();
      } else if (!keys.has(kid) && now() - lastFetchAt >= minRefetch) {
        // A key id we do not know, within the cache window: Google may have
        // rotated early. Look once, no more often than minRefetch.
        await refresh();
      }

      return keys.get(kid) ?? null;
    },
  };
}
