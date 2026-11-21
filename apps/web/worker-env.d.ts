// Cloudflare bindings available to the Worker (see wrangler.jsonc).
// `pnpm --filter web cf-typegen` writes the full generated version to
// cloudflare-env.d.ts (gitignored, 16k lines of runtime types); this small file
// is the committed part, so `tsc` and `next build` work on a fresh clone.
// Both declare the same members and merge cleanly if the generated file exists.
/// <reference types="@cloudflare/workers-types" />

declare namespace Cloudflare {
  interface Env {
    /** Cloudflare D1, database `clearpath`. */
    DB: D1Database;
    /** Cloudflare R2, private bucket `clearpath-board`. */
    BOARD: R2Bucket;
    ASSETS: Fetcher;
  }
}

interface CloudflareEnv {
  DB: D1Database;
  BOARD: R2Bucket;
  ASSETS: Fetcher;
}
