import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TOKENS_PACKAGE_NAME, color, fonts, palette, TOUCH_TARGET_PX } from './index';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** Read a custom property out of a `:root { ... }` block of tokens.css. */
function cssVar(name: string, scheme: 'light' | 'dark'): string | undefined {
  // The light block is the first `:root`; the dark block is inside the
  // prefers-color-scheme media query that follows it.
  const darkIndex = css.indexOf('@media (prefers-color-scheme: dark)');
  const block = scheme === 'light' ? css.slice(0, darkIndex) : css.slice(darkIndex);
  return new RegExp(`${name}:\\s*([^;]+);`).exec(block)?.[1]?.trim();
}

/** `ink` -> `--cp-ink`, `paper2` -> `--cp-paper-2`, `blueOnWhite` -> `--cp-blue-on-white`. */
function cssNameFor(token: string): string {
  return `--cp-${token.replace(/([a-z])([A-Z0-9])/g, '$1-$2').toLowerCase()}`;
}

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('matches the palette in the design spec', () => {
    expect(color('ink')).toBe('#14213D');
    expect(color('ink', 'dark')).toBe('#E8EDF8');
    expect(color('paper')).toBe('#FFFFFF');
    expect(color('paper', 'dark')).toBe('#0B1222');
    expect(color('paper2')).toBe('#EEF2FA');
    expect(color('paper2', 'dark')).toBe('#141D33');
    expect(color('graphBlue')).toBe('#3A6FF7');
    expect(color('graphBlue', 'dark')).toBe('#7FA2FF');
    expect(color('blueOnWhite')).toBe('#2F5BD8');
    expect(color('highlighter')).toBe('#F7E26B');
    expect(color('coral')).toBe('#FF7A59');
  });

  it('keeps tokens.css in sync with the TypeScript palette', () => {
    for (const token of Object.keys(palette)) {
      const name = cssNameFor(token);
      for (const scheme of ['light', 'dark'] as const) {
        expect(cssVar(name, scheme), `${name} (${scheme})`).toBe(
          color(token as keyof typeof palette, scheme).toLowerCase(),
        );
      }
    }
  });

  it('keeps the 44px touch target in both sources', () => {
    expect(TOUCH_TARGET_PX).toBe(44);
    expect(cssVar('--cp-touch-target', 'light')).toBe('44px');
  });
});

describe('font stack', () => {
  it('lists Inter before Noto Sans TC so Latin and numbers use Inter', () => {
    const stack = fonts.sans;
    expect(stack.indexOf('Inter')).toBeLessThan(stack.indexOf('Noto Sans TC'));
    expect(cssVar('--cp-font-sans', 'light')).toBe(stack);
  });
});

/** WCAG relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light! + 0.05) / (dark! + 0.05);
}

describe('contrast', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`keeps body text readable on paper in ${scheme} mode`, () => {
      expect(contrast(color('ink', scheme), color('paper', scheme))).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color('ink', scheme), color('paper2', scheme))).toBeGreaterThanOrEqual(4.5);
    });

    it(`keeps secondary text at AA in ${scheme} mode`, () => {
      expect(contrast(color('inkMuted', scheme), color('paper', scheme))).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    it(`keeps blue text at AA on paper in ${scheme} mode`, () => {
      expect(contrast(color('blueOnWhite', scheme), color('paper', scheme))).toBeGreaterThanOrEqual(
        4.5,
      );
    });

    // The swipe only covers the lower part of the line, so ink has to clear AA
    // against the highlighter *and* against the page behind the rest of it.
    it(`keeps highlighted text readable in ${scheme} mode`, () => {
      expect(contrast(color('ink', scheme), color('highlighter', scheme))).toBeGreaterThanOrEqual(
        4.5,
      );
    });
  }
});
