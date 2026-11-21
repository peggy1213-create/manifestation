import { describe, expect, it } from 'vitest';
import { AUTH_PACKAGE_NAME } from './index';

describe('@clearpath/auth', () => {
  it('exposes its package name as a sanity check', () => {
    expect(AUTH_PACKAGE_NAME).toBe('@clearpath/auth');
  });
});
