import { describe, expect, it } from 'vitest';
import { safeReturnTo } from './return-to';

describe('safeReturnTo', () => {
  it('keeps same-origin paths', () => {
    expect(safeReturnTo('/app')).toBe('/app');
    expect(safeReturnTo('/app/顯化/new?step=2#plan')).toBe('/app/顯化/new?step=2#plan');
  });

  it('falls back for anything that could leave our origin', () => {
    expect(safeReturnTo('https://evil.example/app')).toBe('/app');
    expect(safeReturnTo('//evil.example')).toBe('/app');
    expect(safeReturnTo('/\\evil.example')).toBe('/app');
    expect(safeReturnTo('javascript:alert(1)')).toBe('/app');
    expect(safeReturnTo('app')).toBe('/app');
  });

  it('falls back for missing, empty or absurd values', () => {
    expect(safeReturnTo(null)).toBe('/app');
    expect(safeReturnTo(undefined)).toBe('/app');
    expect(safeReturnTo('   ')).toBe('/app');
    expect(safeReturnTo(`/${'a'.repeat(600)}`)).toBe('/app');
    expect(safeReturnTo('/app\nSet-Cookie: x=1')).toBe('/app');
  });

  it('takes a different fallback', () => {
    expect(safeReturnTo(null, '/')).toBe('/');
  });
});
