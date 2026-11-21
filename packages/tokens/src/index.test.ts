import { describe, expect, it } from 'vitest';
import { TOKENS_PACKAGE_NAME } from './index';

describe('@clearpath/tokens', () => {
  it('exposes its package name as a sanity check', () => {
    expect(TOKENS_PACKAGE_NAME).toBe('@clearpath/tokens');
  });
});
