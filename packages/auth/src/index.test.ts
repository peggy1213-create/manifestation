import { describe, expect, it } from 'vitest';
import * as auth from './index';

describe('@clearpath/auth', () => {
  it('exposes the flow the web app wires together', () => {
    expect(auth.AUTH_PACKAGE_NAME).toBe('@clearpath/auth');
    for (const name of [
      'createPkcePair',
      'buildGoogleAuthorizationUrl',
      'exchangeAuthorizationCode',
      'fetchJwks',
      'verifyIdToken',
      'importCookieKey',
      'startTransaction',
      'openTransaction',
      'createSessionToken',
      'hashSessionToken',
      'sessionCookie',
      'isSameOrigin',
      'safeReturnTo',
    ] as const) {
      expect(typeof auth[name], name).toBe('function');
    }
  });
});
