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

    /**
     * Google OAuth 2.0 web client. GOOGLE_CLIENT_SECRET and COOKIE_KEY are
     * Wrangler secrets in production, never values in this repo.
     */
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    /** 32 random bytes, base64url: seals the short-lived sign-in cookie. */
    COOKIE_KEY?: string;

    /**
     * Optional. Pins the origin used to build the OAuth redirect URI, for when
     * the Worker sits behind something that rewrites the request URL. It must
     * match the redirect URI registered in the Google client.
     */
    PUBLIC_ORIGIN?: string;

    /**
     * Development only. Set in apps/web/.dev.vars to open /api/dev/seed, which
     * seeds a 顯化 and signs in, so the check-in can be used before the Google
     * flow exists. Absent in production, where the route answers 404.
     */
    DEV_SEED_TOKEN?: string;
  }
}

export {};
