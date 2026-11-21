import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createDatabase, type Database } from '@clearpath/core';

/** The Worker's bindings and secrets. Only ever read on the server. */
export function getEnv(): CloudflareEnv {
  return getCloudflareContext().env;
}

export function getDatabase(): Database {
  return createDatabase(getEnv().DB);
}

/**
 * Our own origin. `APP_ORIGIN` wins when it is set (a Worker behind a proxy);
 * otherwise the request tells us where it arrived.
 */
export function getAppOrigin(request: Request): string {
  const configured = getEnv().APP_ORIGIN?.trim();
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Fall through to the request's own origin.
    }
  }
  return new URL(request.url).origin;
}

/**
 * Reads a required secret. The message names the variable only — never its
 * value — so a misconfigured deployment is debuggable from the logs.
 */
export function requireSecret(
  name: 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET' | 'COOKIE_KEY',
): string {
  const value = getEnv()[name];
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${name} is not set. See apps/web/.dev.vars.example.`);
  }
  return value;
}

/** The Cache API, used to cache Google's JWKS. Absent outside the Worker runtime. */
export function getDefaultCache(): Cache | null {
  const api = (globalThis as { caches?: { default?: Cache } }).caches;
  return api?.default ?? null;
}
