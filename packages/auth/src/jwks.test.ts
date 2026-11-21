import { describe, expect, it, vi } from 'vitest';
import { AuthError } from './errors';
import { fetchJwks, parseMaxAge, type JwksCache } from './jwks';

const KEY_SET = { keys: [{ kty: 'RSA', kid: 'k1', alg: 'RS256', n: 'abc', e: 'AQAB' }] };

function jwksResponse(cacheControl = 'public, max-age=18000, must-revalidate') {
  return new Response(JSON.stringify(KEY_SET), {
    headers: { 'content-type': 'application/json', 'cache-control': cacheControl },
  });
}

/** A fake of the slice of the Cache API we use, honouring nothing but storage. */
function fakeCache(): JwksCache & { stored: Map<string, Response> } {
  const stored = new Map<string, Response>();
  return {
    stored,
    async match(request: Request) {
      const hit = stored.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request: Request, response: Response) {
      stored.set(request.url, response);
    },
  };
}

describe('parseMaxAge', () => {
  it('reads max-age in seconds', () => {
    expect(parseMaxAge('public, max-age=18000, must-revalidate')).toBe(18_000);
    expect(parseMaxAge('max-age=60')).toBe(60);
    expect(parseMaxAge('max-age="60"')).toBe(60);
  });

  it('ignores headers without one, and s-maxage lookalikes', () => {
    expect(parseMaxAge('no-store')).toBeNull();
    expect(parseMaxAge(null)).toBeNull();
    expect(parseMaxAge('public, s-maxage=99')).toBeNull();
  });
});

describe('fetchJwks', () => {
  it('fetches the key set', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jwksResponse());
    await expect(fetchJwks({ fetchImpl: fetchImpl as unknown as typeof fetch })).resolves.toEqual(
      KEY_SET,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('caches by max-age and serves the second sign-in from the cache', async () => {
    const cache = fakeCache();
    const fetchImpl = vi.fn().mockResolvedValue(jwksResponse());
    const options = { cache, fetchImpl: fetchImpl as unknown as typeof fetch };

    await expect(fetchJwks(options)).resolves.toEqual(KEY_SET);
    await expect(fetchJwks(options)).resolves.toEqual(KEY_SET);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const cached = [...cache.stored.values()][0];
    expect(cached?.headers.get('cache-control')).toBe('max-age=18000');
  });

  it('clamps the cached max-age', async () => {
    const cache = fakeCache();
    await fetchJwks({
      cache,
      fetchImpl: vi.fn().mockResolvedValue(jwksResponse('max-age=5')) as unknown as typeof fetch,
    });
    expect([...cache.stored.values()][0]?.headers.get('cache-control')).toBe('max-age=60');

    const otherCache = fakeCache();
    await fetchJwks({
      cache: otherCache,
      fetchImpl: vi
        .fn()
        .mockResolvedValue(jwksResponse('max-age=999999')) as unknown as typeof fetch,
    });
    expect([...otherCache.stored.values()][0]?.headers.get('cache-control')).toBe('max-age=86400');
  });

  it('falls back to a default max-age when Google sends none', async () => {
    const cache = fakeCache();
    await fetchJwks({
      cache,
      fetchImpl: vi.fn().mockResolvedValue(
        new Response(JSON.stringify(KEY_SET), {
          headers: { 'content-type': 'application/json' },
        }),
      ) as unknown as typeof fetch,
    });
    expect([...cache.stored.values()][0]?.headers.get('cache-control')).toBe('max-age=3600');
  });

  it('refetches past the cache when a key has rotated', async () => {
    const cache = fakeCache();
    const fetchImpl = vi.fn().mockImplementation(async () => jwksResponse());
    const options = { cache, fetchImpl: fetchImpl as unknown as typeof fetch };

    await fetchJwks(options);
    await fetchJwks({ ...options, forceRefresh: true });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('refetches when the cached entry is not a key set', async () => {
    const cache = fakeCache();
    await cache.put(
      new Request('https://www.googleapis.com/oauth2/v3/certs'),
      new Response('null'),
    );
    const fetchImpl = vi.fn().mockResolvedValue(jwksResponse());
    await expect(
      fetchJwks({ cache, fetchImpl: fetchImpl as unknown as typeof fetch }),
    ).resolves.toEqual(KEY_SET);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('throws when the key set is unavailable or malformed', async () => {
    await expect(
      fetchJwks({
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response('', { status: 503 })) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: 'jwks_unavailable' });

    await expect(
      fetchJwks({
        fetchImpl: vi.fn().mockResolvedValue(new Response('<html>')) as unknown as typeof fetch,
      }),
    ).rejects.toThrow(AuthError);

    await expect(
      fetchJwks({
        fetchImpl: vi
          .fn()
          .mockResolvedValue(new Response('{"nokeys":1}')) as unknown as typeof fetch,
      }),
    ).rejects.toMatchObject({ code: 'jwks_unavailable' });
  });
});
