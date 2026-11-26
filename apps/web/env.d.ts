/// <reference types="@cloudflare/workers-types" />

// The Worker's bindings, as declared in wrangler.jsonc.
//
// This file is committed, because `pnpm typecheck` needs it on a fresh clone.
// `pnpm --filter web cf-typegen` writes a generated cloudflare-env.d.ts beside
// it, which is gitignored and merges into the same interface.
//
// The development-only vars at the bottom live in .dev.vars and never in
// production, so Wrangler cannot generate them.
declare global {
  interface CloudflareEnv {
    /** Cloudflare D1, `clearpath`. */
    DB: D1Database;
    /** Private R2 bucket for 顯化板 and 足跡 photos. */
    BOARD: R2Bucket;

    /** Google OAuth 2.0 web client (P04). Wrangler secrets in production. */
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    COOKIE_KEY?: string;

    /**
     * Development only. Set in apps/web/.dev.vars to open /api/dev/seed, which
     * seeds a 顯化 and signs in, so the check-in can be used before the Google
     * flow exists. Absent in production, where the route answers 404.
     */
    DEV_SEED_TOKEN?: string;
  }
}

export {};
