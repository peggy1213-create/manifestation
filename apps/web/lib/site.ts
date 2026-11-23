/**
 * Absolute site origin, needed for canonical URLs, sitemap.xml, the RSS feed
 * and Open Graph image URLs. Set `NEXT_PUBLIC_SITE_URL` at build time (see
 * .env.example); the localhost fallback keeps `pnpm dev` and `pnpm preview`
 * working without configuration.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/+$/,
  '',
);

export const SITE_NAME = 'Clear Path 顯化';

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
