import type { D1Database } from '@cloudflare/workers-types';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Database = DrizzleD1Database<typeof schema>;

/**
 * The only way the app reaches D1. Components never touch this: every read and
 * write goes through a repo function that takes a `userId` and scopes by it.
 */
export function createDatabase(d1: D1Database): Database {
  return drizzle(d1, { schema });
}

export { schema };
