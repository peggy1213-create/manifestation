import { describe, expect, it } from 'vitest';
import { CORE_PACKAGE_NAME } from './index';

describe('@clearpath/core', () => {
  it('exposes its package name as a sanity check', () => {
    expect(CORE_PACKAGE_NAME).toBe('@clearpath/core');
  });
});
