import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { TAP_TARGET, TOKENS_PACKAGE_NAME, color, colors, typography } from './index';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

/** `--cp-ink: #14213d;` -> `#14213d`, scoped to the light (`:root`) or dark block. */
function cssVar(name: string, scheme: 'light' | 'dark'): string | undefined {
  const darkStart = css.indexOf('@media (prefers-color-scheme: dark)');
  const block = scheme === 'light' ? css.slice(0, darkStart) : css.slice(darkStart);
  const match = new RegExp(`--cp-${name}:\\s*([^;]+);`).exec(block);
  return match?.[1]?.trim();
}

const cssNames: Record<string, string> = {
  ink: 'ink',
  inkMuted: 'ink-muted',
  paper: 'paper',
  paper2: 'paper-2',
  graphBlue: 'graph-blue',
  blueText: 'blue-text',
  highlighter: 'highlighter',
  coral: 'coral',
  inkOnAccent: 'ink-on-accent',
  rule: 'rule',
  neutral: 'neutral',
};

describe('tokens', () => {
  it('exposes the package name', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it.each(['light', 'dark'] as const)('matches tokens.css in %s mode', (scheme) => {
    for (const [tsName, cssName] of Object.entries(cssNames)) {
      expect(cssVar(cssName, scheme), `--cp-${cssName} (${scheme})`).toBe(
        colors[scheme][tsName as keyof (typeof colors)['light']],
      );
    }
  });

  it('keeps body type within the 16–17px / 1.75 rule', () => {
    expect(typography.bodySize).toBeGreaterThanOrEqual(16);
    expect(typography.bodySize).toBeLessThanOrEqual(17);
    expect(typography.bodyLineHeight).toBe(1.75);
  });

  it('keeps touch targets at 44px', () => {
    expect(TAP_TARGET).toBe(44);
    expect(cssVar('tap-target', 'light')).toBe('2.75rem');
  });

  it('reads a colour by name, defaulting to light', () => {
    expect(color('coral')).toBe('#ff7a59');
    expect(color('paper', 'dark')).toBe('#0b1222');
  });
});
