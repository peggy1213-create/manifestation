// Hand-written until the real D1 id lands in wrangler.jsonc; regenerate with
// `pnpm --filter web cf-typegen` after changing bindings.
import type { D1Database, Fetcher, R2Bucket } from '@cloudflare/workers-types';

declare global {
  interface CloudflareEnv {
    DB: D1Database;
    BOARD: R2Bucket;
    ASSETS: Fetcher;
  }
}
