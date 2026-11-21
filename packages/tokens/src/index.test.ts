import { describe, expect, it } from 'vitest';
import {
  TOKENS_PACKAGE_NAME,
  themeColors,
  invariantColors,
  typeScale,
  spacing,
  radius,
  contrastRatio,
} from './index';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('defines exactly four type scale sizes', () => {
    expect(Object.keys(typeScale).sort()).toEqual(['body', 'caption', 'display', 'heading']);
  });

  it('gives headings weight 700 and body weight 400, per the Lab notebook spec', () => {
    expect(typeScale.heading.fontWeight).toBe(700);
    expect(typeScale.display.fontWeight).toBe(700);
    expect(typeScale.body.fontWeight).toBe(400);
    expect(typeScale.caption.fontWeight).toBe(400);
  });

  it('keeps body text at 16–17px with 1.75 line-height', () => {
    expect(typeScale.body.fontSize).toBe('1rem');
    expect(typeScale.body.lineHeight).toBe('1.75');
  });

  it('defines the full spacing and radius scales', () => {
    expect(Object.keys(spacing)).toEqual(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl', '4xl']);
    expect(Object.keys(radius)).toEqual(['sm', 'md', 'lg', 'full']);
  });

  // apps/web maps `--spacing` (Tailwind's base step, which drives p-1, gap-6, …) to the
  // xs token, so every named step has to stay a whole multiple of xs or the numeric
  // utilities stop lining up with the named scale.
  it('keeps every spacing step a whole multiple of the xs base step', () => {
    const rem = (value: string) => Number.parseFloat(value.replace('rem', ''));
    const base = rem(spacing.xs);

    for (const [key, value] of Object.entries(spacing)) {
      const steps = rem(value) / base;
      expect(Number.isInteger(steps), `${key} is ${steps} base steps`).toBe(true);
    }
  });

  describe.each(['light', 'dark'] as const)('%s theme contrast', (theme) => {
    const colors = themeColors[theme];

    it('ink on paper passes AA for body text', () => {
      expect(contrastRatio(colors.ink, colors.paper)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('ink on paper-2 passes AA for body text', () => {
      expect(contrastRatio(colors.ink, colors.paper2)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('blue-text on paper and paper-2 passes AA for links', () => {
      expect(contrastRatio(colors.blueText, colors.paper)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.blueText, colors.paper2)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('paper on ink passes AA — the inverted fill used by the primary button', () => {
      expect(contrastRatio(colors.paper, colors.ink)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it('graph-blue clears the non-text 3:1 minimum against both surfaces (focus rings, fills)', () => {
      expect(contrastRatio(colors.graphBlue, colors.paper)).toBeGreaterThanOrEqual(AA_NON_TEXT);
      expect(contrastRatio(colors.graphBlue, colors.paper2)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    });
  });

  it('ink-on-accent passes AA text contrast on both the highlighter and coral', () => {
    expect(
      contrastRatio(invariantColors.inkOnAccent, invariantColors.highlighter),
    ).toBeGreaterThanOrEqual(AA_TEXT);
    expect(
      contrastRatio(invariantColors.inkOnAccent, invariantColors.coral),
    ).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
