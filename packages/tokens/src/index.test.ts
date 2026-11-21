import { describe, expect, it } from 'vitest';
import { darkColors, layout, lightColors, typography, TOKENS_PACKAGE_NAME } from './index';

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('defines every colour in both light and dark', () => {
    expect(Object.keys(darkColors)).toEqual(Object.keys(lightColors));
  });

  it('keeps the design rules it is the source of truth for', () => {
    expect(layout.tapTarget).toBe(44);
    expect(typography.bodySize).toBeGreaterThanOrEqual(16);
    expect(typography.bodyLineHeight).toBe(1.75);
  });
});
