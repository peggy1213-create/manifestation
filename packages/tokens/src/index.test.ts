import { describe, expect, it } from 'vitest';
import { MIN_TOUCH_TARGET, TOKENS_PACKAGE_NAME, colors, typeScale } from './index';

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });

  it('has a light and a dark value for every colour', () => {
    expect(Object.keys(colors.dark)).toEqual(Object.keys(colors.light));
  });

  it('keeps body copy at 16–17px with notebook leading', () => {
    expect(typeScale.body).toEqual({ size: '1.0625rem', lineHeight: 1.75 });
  });

  it('keeps touch targets at 44px', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
  });
});
