import path from 'node:path';
import { defineWorkersConfig, readD1Migrations } from '@cloudflare/vitest-pool-workers/config';

// The repo functions talk to D1, so the whole suite runs in the Workers
// runtime (Miniflare) against a real local D1, migrated from migrations/.
const migrations = await readD1Migrations(path.join(import.meta.dirname, '../../migrations'));

export default defineWorkersConfig({
  test: {
    setupFiles: ['./test/apply-migrations.ts'],
    poolOptions: {
      workers: {
        singleWorker: true,
        miniflare: {
          // The newest date the Miniflare pinned by @cloudflare/vitest-pool-workers
          // supports; production uses the date in apps/web/wrangler.jsonc.
          compatibilityDate: '2024-12-30',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: { DB: 'clearpath-test' },
          bindings: { TEST_MIGRATIONS: migrations },
        },
      },
    },
  },
});
