import { describe, expect, it } from 'vitest';
import { color, space, TOKENS_PACKAGE_NAME, type } from './index';

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('defines the same token names in light and dark', () => {
    expect(Object.keys(color.dark).sort()).toEqual(Object.keys(color.light).sort());
  });

  it('uses uppercase six-digit hex for every colour', () => {
    for (const scheme of Object.values(color)) {
      for (const [name, value] of Object.entries(scheme)) {
        expect(value, name).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('keeps body copy in the 16–17px range with generous leading', () => {
    expect(type.bodySize).toBeGreaterThanOrEqual(16);
    expect(type.bodySize).toBeLessThanOrEqual(17);
    expect(type.bodyLineHeight).toBeGreaterThanOrEqual(1.7);
  });

  it('keeps touch targets at 44px or more', () => {
    expect(space.touchTarget).toBeGreaterThanOrEqual(44);
  });
});
