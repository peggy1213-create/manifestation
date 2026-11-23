/**
 * Domain logic for the 資源 (resources) library: the four topics an article can
 * carry, the reading-time rule, and the rules that decide which articles a
 * build is allowed to show.
 *
 * Pure TypeScript — no React, no filesystem, no framework imports. The web app
 * feeds these functions metadata parsed from MDX frontmatter at build time.
 */

/** The four topics an article can be filed under. Order is the chip order. */
export const RESOURCE_TOPICS = ['顯化方法', '想像練習', '習慣', '研究解讀'] as const;

export type ResourceTopic = (typeof RESOURCE_TOPICS)[number];

export function isResourceTopic(value: unknown): value is ResourceTopic {
  return (RESOURCE_TOPICS as readonly unknown[]).includes(value);
}

/** One entry in an article's 參考文獻 block. */
export interface ResourceReference {
  author: string;
  year: number;
  title: string;
  url: string;
}

/** Everything the list page, sitemap, RSS feed and OG image need about an article. */
export interface ResourceMeta {
  slug: string;
  title: string;
  summary: string;
  topic: ResourceTopic;
  /** ISO date (YYYY-MM-DD). */
  published: string;
  /** ISO date (YYYY-MM-DD) of the last 檢閱. */
  reviewed: string;
  references: ResourceReference[];
  /** Workspace route this article hands the reader on to, e.g. `/workspace/woop`. */
  exercise: string | null;
  draft: boolean;
  /**
   * Reading units in the body: one per CJK character, one per Latin word.
   * Counted at build time, because the body itself never reaches the client.
   */
  charCount: number;
}

/**
 * Reading speed for 繁體中文 prose. Chinese is read by character rather than by
 * word, so the usual 200-words-per-minute figure does not transfer; 350 字 per
 * minute is a conservative middle of the range reported for Chinese.
 */
export const READING_CHARS_PER_MINUTE = 350;

/** Whole minutes, rounded up, never less than one. */
export function readingTimeMinutes(charCount: number): number {
  if (!Number.isFinite(charCount) || charCount <= 0) return 1;
  return Math.max(1, Math.ceil(charCount / READING_CHARS_PER_MINUTE));
}

/**
 * Whether this build may include articles marked `draft: true`.
 *
 * Drafts are for the author's review, so they show while developing and in a
 * build that opts in explicitly with `SHOW_DRAFTS=1`. A production build with
 * no flag set never includes them.
 */
export function draftsVisible(env: {
  nodeEnv?: string | undefined;
  showDrafts?: string | undefined;
}): boolean {
  if (env.showDrafts === '1' || env.showDrafts === 'true') return true;
  return env.nodeEnv !== 'production';
}

/** Newest 顯化 writing first; ties broken by slug so the order is stable. */
export function sortByPublishedDesc<T extends Pick<ResourceMeta, 'published' | 'slug'>>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => b.published.localeCompare(a.published) || a.slug.localeCompare(b.slug),
  );
}

/** `null` means 全部 — no filter applied. */
export function filterByTopic<T extends Pick<ResourceMeta, 'topic'>>(
  items: readonly T[],
  topic: ResourceTopic | null,
): T[] {
  if (topic === null) return [...items];
  return items.filter((item) => item.topic === topic);
}

/** How many articles sit under each topic, for the counts on the filter chips. */
export function countByTopic<T extends Pick<ResourceMeta, 'topic'>>(
  items: readonly T[],
): Record<ResourceTopic, number> {
  const counts = Object.fromEntries(RESOURCE_TOPICS.map((topic) => [topic, 0])) as Record<
    ResourceTopic,
    number
  >;
  for (const item of items) counts[item.topic] += 1;
  return counts;
}

/** Canonical path for an article. */
export function resourcePath(slug: string): string {
  return `/resources/${slug}`;
}
