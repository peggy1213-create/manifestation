import type { D1Database, R2Bucket } from '@cloudflare/workers-types';

/**
 * The Worker bindings and secrets this app runs with, declared on the
 * `CloudflareEnv` interface @opennextjs/cloudflare exposes. Bindings live in
 * wrangler.jsonc; secrets are Wrangler secrets (see .dev.vars.example).
 */
declare global {
  interface CloudflareEnv {
    /** D1: clearpath */
    DB: D1Database;
    /** R2: clearpath-board (private; photos are served through a Worker route) */
    BOARD: R2Bucket;
    /** Google OAuth 2.0 web client id. Public by nature, but kept with the secrets. */
    GOOGLE_CLIENT_ID: string;
    /** Wrangler secret. */
    GOOGLE_CLIENT_SECRET: string;
    /** Wrangler secret: 32 bytes, base64url. Encrypts the short-lived PKCE cookie. */
    COOKIE_KEY: string;
    /**
     * Public origin, e.g. https://clearpath.app. Set it when the Worker sits
     * behind a proxy that rewrites the host; otherwise the request's own
     * origin is used.
     */
    APP_ORIGIN?: string;
  }
}
