// The only place that wraps a D1 binding. Everything else goes through
// packages/core/src/repo, which always scopes by userId.

import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = DrizzleD1Database<typeof schema>;

/** Wraps a D1 binding (env.DB) in a typed Drizzle client. */
export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}
