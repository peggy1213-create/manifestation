import type { MetadataRoute } from 'next';
import { resourcePath } from '@clearpath/core';
import { publishedResources } from '@/lib/resources/published';
import { absoluteUrl } from '@/lib/site';

export const dynamic = 'error';

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = publishedResources();

  // The library's own freshness is the most recently reviewed article.
  const libraryLastModified = articles.reduce<string | undefined>(
    (latest, article) => (!latest || article.reviewed > latest ? article.reviewed : latest),
    undefined,
  );

  return [
    {
      url: absoluteUrl('/'),
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: absoluteUrl('/resources'),
      ...(libraryLastModified ? { lastModified: libraryLastModified } : {}),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...articles.map((article) => ({
      url: absoluteUrl(resourcePath(article.slug)),
      lastModified: article.reviewed,
      changeFrequency: 'yearly' as const,
      priority: 0.6,
    })),
  ];
}
