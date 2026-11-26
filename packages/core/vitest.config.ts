import path from 'node:path';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Domain logic and repo functions are both tested inside workerd, against a real
// local D1, so "it passes in Node" can never stand in for "it runs on Workers".
const migrations = await readD1Migrations(path.resolve(import.meta.dirname, '../../migrations'));

export default defineConfig({
  plugins: [
    cloudflareTest({
      config: false,
      miniflare: {
        compatibilityDate: '2026-11-21',
        compatibilityFlags: ['nodejs_compat'],
        d1Databases: { DB: 'clearpath-test' },
        bindings: { TEST_MIGRATIONS: migrations },
      },
    }),
  ],
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
});
