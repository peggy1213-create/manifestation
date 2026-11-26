import { getCloudflareContext } from '@opennextjs/cloudflare';
import { createDatabase, type Database } from '@clearpath/core';

/**
 * The single door to the Worker's bindings. Server components and route
 * handlers get a typed D1 client from here and then go through
 * packages/core/repo; nothing else touches the bindings.
 */
export async function getEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env;
}

export async function getDatabase(): Promise<Database> {
  const env = await getEnv();
  return createDatabase(env.DB);
}

/** The private R2 bucket holding check-in photos. */
export async function getBoardBucket(): Promise<R2Bucket> {
  const env = await getEnv();
  return env.BOARD;
}
