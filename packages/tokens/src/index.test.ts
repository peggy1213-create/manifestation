import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { GRID_SIZE, TOKENS_PACKAGE_NAME, TOUCH_TARGET, colors, fonts } from './index';

const css = readFileSync(fileURLToPath(new URL('./tokens.css', import.meta.url)), 'utf8');

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('carries the Warm notebook palette', () => {
    expect(colors.ink.light).toBe('#2E2219');
    expect(colors.paper.light).toBe('#FBF4EA');
    expect(colors.terracotta.light).toBe('#D9683C');
    expect(colors.kraft.light).toBe('#C9A27A');
  });

  it('gives every colour a dark-mode value', () => {
    for (const [name, pair] of Object.entries(colors)) {
      expect(pair.light, name).toMatch(/^#[0-9A-F]{6}$/);
      expect(pair.dark, name).toMatch(/^#[0-9A-F]{6}$/);
    }
  });

  it('keeps the CSS custom properties in step with the TS objects', () => {
    const variables: Record<string, string> = {
      '--cp-ink': colors.ink.light,
      '--cp-paper': colors.paper.light,
      '--cp-paper-2': colors.paper2.light,
      '--cp-terracotta': colors.terracotta.light,
      '--cp-terracotta-strong': colors.terracottaStrong.light,
      '--cp-honey': colors.honey.light,
      '--cp-kraft': colors.kraft.light,
    };
    for (const [variable, value] of Object.entries(variables)) {
      expect(css, variable).toContain(`${variable}: ${value.toLowerCase()};`);
    }
  });

  it('redefines the colours that change in dark mode', () => {
    const dark = css.slice(css.indexOf("[data-theme='dark']"));
    expect(dark).toContain(colors.ink.dark.toLowerCase());
    expect(dark).toContain(colors.paper.dark.toLowerCase());
    expect(dark).toContain(colors.kraft.dark.toLowerCase());
  });

  it('names the design fonts and the 44px touch target', () => {
    expect(fonts.sans).toContain('Noto Sans TC');
    expect(fonts.latin).toContain('Inter');
    expect(TOUCH_TARGET).toBe(44);
    expect(GRID_SIZE).toBe(8);
  });
});
