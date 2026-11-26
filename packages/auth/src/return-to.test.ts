import { describe, expect, it } from 'vitest';
import { DEFAULT_RETURN_TO, safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('keeps a path on this site', () => {
    expect(safeReturnTo('/app/abc')).toBe('/app/abc');
    expect(safeReturnTo('/app?day=2026-01-01')).toBe('/app?day=2026-01-01');
  });

  it('refuses anything that would leave the site', () => {
    for (const value of [
      'https://evil.example/app',
      '//evil.example',
      '/\\evil.example',
      'app/abc',
      'javascript:alert(1)',
      '/app\nSet-Cookie: x=1',
      '',
      null,
      undefined,
      42,
    ]) {
      expect(safeReturnTo(value)).toBe(DEFAULT_RETURN_TO);
    }
  });

  it('can be given its own fallback', () => {
    expect(safeReturnTo('https://evil.example', '/')).toBe('/');
  });
});
