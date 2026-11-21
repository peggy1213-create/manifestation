import { fileURLToPath } from 'node:url';
import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Tests run inside the Workers runtime (workerd) against a real local D1 and R2,
// not a Node mock: if it passes here it behaves the same under `pnpm preview`.
const migrationsPath = fileURLToPath(new URL('../../migrations', import.meta.url));

export default defineConfig(async () => {
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        miniflare: {
          compatibilityDate: '2026-11-19',
          compatibilityFlags: ['nodejs_compat'],
          d1Databases: ['DB'],
          r2Buckets: ['BOARD'],
          // Read by src/test/apply-migrations.ts, which runs before each file.
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      setupFiles: ['./src/test/apply-migrations.ts'],
    },
  };
});
