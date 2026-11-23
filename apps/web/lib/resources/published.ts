import 'server-only';
import type { ResourceMeta } from '@clearpath/core';
import { allResources } from './index';

/**
 * Articles that may be advertised to the outside world.
 *
 * `allResources()` can include drafts (when a build sets SHOW_DRAFTS, for
 * review). Drafts must never reach sitemap.xml, the RSS feed or anything else a
 * crawler reads, so those callers go through this function instead.
 */
export function publishedResources(): ResourceMeta[] {
  return allResources().filter((article) => !article.draft);
}
