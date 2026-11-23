import { resourcePath } from '@clearpath/core';
import { getTranslations } from 'next-intl/server';
import { publishedResources } from '@/lib/resources/published';
import { absoluteUrl } from '@/lib/site';

/** Prerendered at build time and served as a static asset — no Worker request work. */
export const dynamic = 'force-static';

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char,
  );

/** RSS dates are RFC 822; frontmatter dates are plain YYYY-MM-DD in Asia/Taipei. */
const rfc822 = (isoDate: string) => new Date(`${isoDate}T00:00:00+08:00`).toUTCString();

export async function GET() {
  const t = await getTranslations('resources');
  const articles = publishedResources();
  const feedUrl = absoluteUrl('/resources/rss.xml');

  const items = articles
    .map((article) => {
      const url = absoluteUrl(resourcePath(article.slug));
      return `    <item>
      <title>${escapeXml(article.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(article.summary)}</description>
      <category>${escapeXml(article.topic)}</category>
      <pubDate>${rfc822(article.published)}</pubDate>
    </item>`;
    })
    .join('\n');

  const lastBuildDate = articles[0] ? rfc822(articles[0].published) : undefined;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(t('feedTitle'))}</title>
    <link>${escapeXml(absoluteUrl('/resources'))}</link>
    <description>${escapeXml(t('feedDescription'))}</description>
    <language>zh-TW</language>
    <docs>https://www.rssboard.org/rss-specification</docs>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />${
      lastBuildDate ? `\n    <lastBuildDate>${lastBuildDate}</lastBuildDate>` : ''
    }
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      'content-type': 'application/rss+xml; charset=utf-8',
      'cache-control': 'public, max-age=0, must-revalidate',
    },
  });
}
