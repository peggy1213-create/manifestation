import { defineCloudflareConfig } from '@opennextjs/cloudflare';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

export default defineCloudflareConfig({
  /**
   * Every page in this app is prerendered at build time and nothing revalidates,
   * so prerendered HTML is served straight from the Workers assets binding.
   * Without an incremental cache, the Worker cannot find prerendered pages at
   * all and answers 404; with KV or R2 instead, serving static pages would cost
   * a storage read per request.
   */
  incrementalCache: staticAssetsIncrementalCache,
});
