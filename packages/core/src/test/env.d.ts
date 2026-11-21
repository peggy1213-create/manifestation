// Bindings the Workers test pool provides (see vitest.config.ts).
import type { D1Migration } from 'cloudflare:test';

declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      BOARD: R2Bucket;
      /** Parsed migrations/*.sql, applied by src/test/apply-migrations.ts. */
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
