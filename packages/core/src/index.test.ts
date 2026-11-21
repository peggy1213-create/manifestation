import { describe, expect, it } from 'vitest';
import * as core from './index';

describe('@clearpath/core', () => {
  it('exposes the repo functions and guest merge the web app uses', () => {
    expect(core.CORE_PACKAGE_NAME).toBe('@clearpath/core');
    for (const name of [
      'createDatabase',
      'upsertUserByGoogleSub',
      'createSession',
      'findActiveSession',
      'renewSession',
      'deleteSessionByTokenHash',
      'createManifestation',
      'listManifestationSummaries',
      'parseGuestDraft',
      'planGuestMerge',
    ] as const) {
      expect(typeof core[name], name).toBe('function');
    }
  });
});
