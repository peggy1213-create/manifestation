import { describe, expect, it } from 'vitest';
import { AuthError } from './errors';
import { assertSameOrigin, isMutatingMethod, isSameOrigin } from './origin';

function request(init: {
  method: string;
  origin?: string;
  referer?: string;
  url?: string;
}): Request {
  const headers = new Headers();
  if (init.origin) headers.set('origin', init.origin);
  if (init.referer) headers.set('referer', init.referer);
  return new Request(init.url ?? 'https://clearpath.app/auth/logout', {
    method: init.method,
    headers,
  });
}

describe('isMutatingMethod', () => {
  it('covers POST, PUT, PATCH and DELETE', () => {
    for (const method of ['POST', 'put', 'Patch', 'DELETE']) {
      expect(isMutatingMethod(method)).toBe(true);
    }
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      expect(isMutatingMethod(method)).toBe(false);
    }
  });
});

describe('isSameOrigin', () => {
  it('lets reads through untouched', () => {
    expect(isSameOrigin(request({ method: 'GET' }))).toBe(true);
    expect(isSameOrigin(request({ method: 'GET', origin: 'https://evil.example' }))).toBe(true);
  });

  it('accepts a POST from our own origin', () => {
    expect(isSameOrigin(request({ method: 'POST', origin: 'https://clearpath.app' }))).toBe(true);
  });

  it('rejects a POST from another origin', () => {
    expect(isSameOrigin(request({ method: 'POST', origin: 'https://evil.example' }))).toBe(false);
    expect(isSameOrigin(request({ method: 'POST', origin: 'null' }))).toBe(false);
  });

  it('falls back to the Referer when Origin is absent', () => {
    expect(isSameOrigin(request({ method: 'POST', referer: 'https://clearpath.app/app' }))).toBe(
      true,
    );
    expect(isSameOrigin(request({ method: 'POST', referer: 'https://evil.example/x' }))).toBe(
      false,
    );
  });

  it('rejects a POST with neither header', () => {
    expect(isSameOrigin(request({ method: 'DELETE' }))).toBe(false);
  });

  it('can check against a configured origin instead of the request URL', () => {
    const behindProxy = request({
      method: 'POST',
      origin: 'https://clearpath.app',
      url: 'http://127.0.0.1:8788/auth/logout',
    });
    expect(isSameOrigin(behindProxy)).toBe(false);
    expect(isSameOrigin(behindProxy, { expectedOrigin: 'https://clearpath.app' })).toBe(true);
  });

  it('throws AuthError("bad_origin") when asserted', () => {
    expect(() =>
      assertSameOrigin(request({ method: 'POST', origin: 'https://evil.example' })),
    ).toThrow(AuthError);
    expect(() =>
      assertSameOrigin(request({ method: 'POST', origin: 'https://clearpath.app' })),
    ).not.toThrow();
  });
});
