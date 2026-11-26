/**
 * The one place a D1 binding turns into a typed query client. Components never
 * import this: they call repo functions, which all take a userId and scope by it.
 */

import { drizzle, type AnyD1Database, type DrizzleD1Database } from 'drizzle-orm/d1';
import { schema } from './schema';

export type Database = DrizzleD1Database<typeof schema>;

export function createDatabase(binding: AnyD1Database): Database {
  return drizzle(binding, { schema });
}
