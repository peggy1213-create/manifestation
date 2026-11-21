import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { openGraphLocale } from '@/i18n/config';

/**
 * Absolute origin used for canonical URLs and Open Graph. Override per
 * environment with NEXT_PUBLIC_SITE_URL.
 */
export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://clearpath.tw';

/** Pages that carry metadata, keyed by their namespace in `pages.*`. */
export type MetadataPage =
  | 'home'
  | 'resources'
  | 'login'
  | 'about'
  | 'privacy'
  | 'contact'
  | 'today'
  | 'manifestations'
  | 'board'
  | 'rehearsal'
  | 'footprints'
  | 'notFound';

/**
 * Per-page metadata, with the zh-TW Open Graph defaults filled in. The title
 * goes through the `%s · 顯化 Clear Path` template set in the root layout;
 * og:title spells the site name out, because social cards get no template.
 */
export async function pageMetadata(page: MetadataPage, path: string): Promise<Metadata> {
  const t = await getTranslations('pages');
  const site = await getTranslations('site');

  const title = t(`${page}.metaTitle`);
  const description = t(`${page}.metaDescription`);
  const siteName = site('name');

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      locale: openGraphLocale,
      siteName,
      title: `${title} · ${siteName}`,
      description,
      url: path,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} · ${siteName}`,
      description,
    },
  };
}
