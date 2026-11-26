import { beforeAll, describe, expect, it } from 'vitest';
import { createJwksCache } from './jwks';
import { createTestIssuer, stubJwksFetch, type TestIssuer } from './test-keys';

const URL_UNDER_TEST = 'https://www.googleapis.test/oauth2/v3/certs';

let issuer: TestIssuer;
let other: TestIssuer;

beforeAll(async () => {
  issuer = await createTestIssuer('key-a');
  other = await createTestIssuer('key-b');
});

describe('the JWKS cache', () => {
  it('fetches once and serves the key from memory after that', async () => {
    const stub = stubJwksFetch(issuer.jwks);
    const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: stub.fetch, now: () => 0 });

    expect(await cache.getKey('key-a')).not.toBeNull();
    expect(await cache.getKey('key-a')).not.toBeNull();
    expect(stub.calls).toBe(1);
  });

  it('shares one fetch between requests that arrive together', async () => {
    const stub = stubJwksFetch(issuer.jwks);
    const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: stub.fetch, now: () => 0 });

    const keys = await Promise.all([
      cache.getKey('key-a'),
      cache.getKey('key-a'),
      cache.getKey('key-a'),
    ]);

    expect(keys.every((key) => key !== null)).toBe(true);
    expect(stub.calls).toBe(1);
  });

  it('honours Cache-Control max-age and refetches once it has run out', async () => {
    let now = 0;
    const stub = stubJwksFetch(issuer.jwks, { 'cache-control': 'public, max-age=600' });
    const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: stub.fetch, now: () => now });

    await cache.getKey('key-a');
    now = 599_000;
    await cache.getKey('key-a');
    expect(stub.calls).toBe(1);

    // max-age is below the five-minute floor only in the other direction; 600s
    // stands, so the second fetch happens just after it.
    now = 601_000;
    await cache.getKey('key-a');
    expect(stub.calls).toBe(2);
  });

  it('looks again when a token arrives with a key id it has not seen', async () => {
    let now = 0;
    let served = issuer.jwks;
    const impl: typeof fetch = async () =>
      new Response(JSON.stringify(served), { headers: { 'cache-control': 'max-age=3600' } });

    const cache = createJwksCache({
      url: URL_UNDER_TEST,
      fetchImpl: impl,
      now: () => now,
      minRefetchMs: 60_000,
    });

    expect(await cache.getKey('key-a')).not.toBeNull();

    // Google rotated early: the new key is not in what we hold.
    served = other.jwks;
    now = 120_000;
    expect(await cache.getKey('key-b')).not.toBeNull();
  });

  it('does not refetch on every unknown key id', async () => {
    let now = 0;
    const stub = stubJwksFetch(issuer.jwks, { 'cache-control': 'max-age=3600' });
    const cache = createJwksCache({
      url: URL_UNDER_TEST,
      fetchImpl: stub.fetch,
      now: () => now,
      minRefetchMs: 60_000,
    });

    await cache.getKey('key-a');
    expect(stub.calls).toBe(1);

    // A burst of tokens naming keys that do not exist must not become a burst
    // of requests to Google.
    for (let index = 0; index < 20; index += 1) {
      now += 1000;
      expect(await cache.getKey(`made-up-${index}`)).toBeNull();
    }
    expect(stub.calls).toBe(1);

    // Once the window has passed, one more look is allowed.
    now += 60_000;
    expect(await cache.getKey('made-up-again')).toBeNull();
    expect(stub.calls).toBe(2);
  });

  it('keeps the keys it already trusts when a fetch fails', async () => {
    let now = 0;
    let fail = false;
    const impl: typeof fetch = async () => {
      if (fail) throw new Error('network down');
      return new Response(JSON.stringify(issuer.jwks), {
        headers: { 'cache-control': 'max-age=600' },
      });
    };

    const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: impl, now: () => now });
    expect(await cache.getKey('key-a')).not.toBeNull();

    fail = true;
    now = 601_000;
    expect(await cache.getKey('key-a')).not.toBeNull();
  });

  it('ignores an answer that is not a usable key set', async () => {
    for (const body of ['{}', '{"keys":[]}', 'not json', '{"keys":[{"kid":"x","kty":"EC"}]}']) {
      const impl: typeof fetch = async () => new Response(body);
      const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: impl, now: () => 0 });
      expect(await cache.getKey('key-a')).toBeNull();
    }
  });

  it('ignores a key set served with an error status', async () => {
    const impl: typeof fetch = async () =>
      new Response(JSON.stringify(issuer.jwks), { status: 500 });
    const cache = createJwksCache({ url: URL_UNDER_TEST, fetchImpl: impl, now: () => 0 });
    expect(await cache.getKey('key-a')).toBeNull();
  });
});
