// The only place a D1 binding becomes a typed query builder. Components never see either:
// every read and write goes through src/repo/*, which always takes a userId.

import type { D1Database } from '@cloudflare/workers-types';
import { drizzle, type DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

export type Db = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): Db {
  return drizzle(d1, { schema });
}

export { schema };
