import 'server-only';
import {
  draftsVisible,
  sortByPublishedDesc,
  type ResourceMeta,
  type ResourceTopic,
} from '@clearpath/core';
import { GENERATED_RESOURCES, RESOURCE_BODIES } from './generated';

/**
 * Server-side access to the article index built by scripts/generate-resources.mjs.
 *
 * Everything here is evaluated while the pages are prerendered, so no article
 * metadata is read at request time and nothing touches the filesystem on the
 * Worker.
 */

/** Whether this build includes articles marked `draft: true`. */
export function showDrafts(): boolean {
  return draftsVisible({
    nodeEnv: process.env.NODE_ENV,
    showDrafts: process.env.SHOW_DRAFTS,
  });
}

/** Every article this build may show, newest first. */
export function allResources(): ResourceMeta[] {
  const visible = showDrafts()
    ? GENERATED_RESOURCES
    : GENERATED_RESOURCES.filter((article) => !article.draft);
  return sortByPublishedDesc(visible);
}

export function findResource(slug: string): ResourceMeta | undefined {
  return allResources().find((article) => article.slug === slug);
}

/** Topics that actually have at least one article in this build. */
export function usedTopics(): Set<ResourceTopic> {
  return new Set(allResources().map((article) => article.topic));
}

/** The compiled MDX body for an article, or `undefined` if there is no such file. */
export async function loadResourceBody(slug: string) {
  const load = RESOURCE_BODIES[slug];
  if (!load) return undefined;
  const mod = await load();
  return mod.default;
}
