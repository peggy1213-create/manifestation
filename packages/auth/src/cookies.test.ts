import { describe, expect, it } from 'vitest';
import { clearCookie, parseCookieHeader, readCookie, serializeCookie } from './cookies';

describe('serializeCookie', () => {
  it('defaults to HttpOnly, Secure, SameSite=Lax, Path=/', () => {
    expect(serializeCookie('a', 'b')).toBe('a=b; Path=/; SameSite=Lax; HttpOnly; Secure');
  });

  it('adds Max-Age and a matching Expires', () => {
    const cookie = serializeCookie('a', 'b', { maxAge: 600 });
    expect(cookie).toContain('Max-Age=600');
    expect(cookie).toMatch(/Expires=\w{3}, \d{2} \w{3} \d{4}/);
  });

  it('clamps a negative Max-Age to 0', () => {
    expect(clearCookie('a')).toContain('Max-Age=0');
    expect(serializeCookie('a', 'b', { maxAge: -5 })).toContain('Max-Age=0');
  });
});

describe('parseCookieHeader', () => {
  it('reads a cookie jar', () => {
    expect(parseCookieHeader('cp_session=abc; cp_oauth=def')).toEqual({
      cp_session: 'abc',
      cp_oauth: 'def',
    });
  });

  it('survives junk, blanks and duplicates', () => {
    expect(parseCookieHeader(null)).toEqual({});
    expect(parseCookieHeader('')).toEqual({});
    expect(parseCookieHeader('novalue; =empty; a=1; a=2')).toEqual({ a: '1' });
  });

  it('reads one cookie off a Request', () => {
    const request = new Request('https://example.com', {
      headers: { cookie: 'cp_session=abc' },
    });
    expect(readCookie(request, 'cp_session')).toBe('abc');
    expect(readCookie(request, 'cp_oauth')).toBeUndefined();
  });
});
