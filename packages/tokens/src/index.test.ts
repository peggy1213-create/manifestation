import { describe, expect, it } from 'vitest';
import {
  MIN_TAP_TARGET,
  TOKENS_PACKAGE_NAME,
  darkPalette,
  lightPalette,
  palettes,
  typography,
} from './index';

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('carries the Warm notebook palette', () => {
    expect(lightPalette.ink).toBe('#2E2219');
    expect(lightPalette.paper).toBe('#FBF4EA');
    expect(lightPalette.terracottaStrong).toBe('#B4502A');
    expect(darkPalette.paper).toBe('#17110C');
    expect(darkPalette.terracottaStrong).toBe('#F09A73');
  });

  it('defines every colour in both themes, as hex', () => {
    expect(Object.keys(lightPalette).sort()).toEqual(Object.keys(darkPalette).sort());
    for (const palette of Object.values(palettes)) {
      for (const value of Object.values(palette)) {
        expect(value).toMatch(/^#[0-9A-F]{6}$/);
      }
    }
  });

  it('keeps body text readable and taps reachable', () => {
    expect(typography.bodySize).toBeGreaterThanOrEqual(16);
    expect(typography.bodyLineHeight).toBeCloseTo(1.75);
    expect(MIN_TAP_TARGET).toBe(44);
  });
});
