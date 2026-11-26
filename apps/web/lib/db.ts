import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createDb, type Db } from '@clearpath/core/repo';

/**
 * The D1 binding, as a typed query builder. Only lib/ and the server actions call this;
 * every read and write then goes through @clearpath/core/repo, scoped by userId.
 */
export async function getDb(): Promise<Db> {
  const { env } = await getCloudflareContext({ async: true });
  return createDb(env.DB);
}
