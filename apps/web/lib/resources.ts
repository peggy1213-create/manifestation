import type { ComponentType } from 'react';
import IfThenPlans, { frontmatter as ifThenPlans } from '@/content/resources/if-then-plans.mdx';
import MentalContrasting, {
  frontmatter as mentalContrasting,
} from '@/content/resources/mental-contrasting.mdx';
import SixtySixDays, { frontmatter as sixtySixDays } from '@/content/resources/sixty-six-days.mdx';

export interface ResourceMeta {
  /** ISO date, e.g. `2026-11-20`. */
  readonly publishedAt: string;
  readonly title: string;
  readonly description: string;
  readonly readingMinutes: number;
  readonly sources: readonly string[];
}

export interface Resource extends ResourceMeta {
  readonly slug: string;
  readonly Content: ComponentType;
}

/** Fails the build rather than rendering an article with missing frontmatter. */
function parseMeta(slug: string, raw: Record<string, unknown>): ResourceMeta {
  const { title, description, publishedAt, readingMinutes, sources } = raw;

  if (typeof title !== 'string' || typeof description !== 'string') {
    throw new TypeError(`${slug}: frontmatter needs a string title and description`);
  }
  if (typeof publishedAt !== 'string' || Number.isNaN(Date.parse(publishedAt))) {
    throw new TypeError(`${slug}: frontmatter needs a valid publishedAt date`);
  }
  if (typeof readingMinutes !== 'number') {
    throw new TypeError(`${slug}: frontmatter needs a numeric readingMinutes`);
  }
  if (!Array.isArray(sources) || sources.some((source) => typeof source !== 'string')) {
    throw new TypeError(`${slug}: frontmatter needs a list of sources`);
  }

  return { title, description, publishedAt, readingMinutes, sources: sources as string[] };
}

/** Every article, newest first. */
export const resources: readonly Resource[] = [
  { slug: 'mental-contrasting', raw: mentalContrasting, Content: MentalContrasting },
  { slug: 'if-then-plans', raw: ifThenPlans, Content: IfThenPlans },
  { slug: 'sixty-six-days', raw: sixtySixDays, Content: SixtySixDays },
]
  .map(({ slug, raw, Content }) => ({ slug, Content, ...parseMeta(slug, raw) }))
  .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

export function latestResources(count = 3): readonly Resource[] {
  return resources.slice(0, count);
}

export function findResource(slug: string): Resource | undefined {
  return resources.find((resource) => resource.slug === slug);
}
