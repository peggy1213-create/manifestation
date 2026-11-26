import type { D1Migration } from '@cloudflare/vitest-plugin';

// The bindings the Workers test pool hands the tests, as configured in
// vitest.config.ts.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}
