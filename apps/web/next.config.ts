import createMDX from '@next/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Internal packages are consumed as raw TS source, no build step of their own.
  transpilePackages: ['@clearpath/core', '@clearpath/auth', '@clearpath/tokens'],
  pageExtensions: ['ts', 'tsx', 'mdx'],
};

const withMDX = createMDX({
  extension: /\.mdx$/,
  options: {
    // Frontmatter is parsed again here so each MDX module also exports it; the
    // list page and sitemap read the generated index instead (see
    // scripts/generate-resources.mjs), which needs no module evaluation.
    remarkPlugins: [remarkGfm, remarkFrontmatter, [remarkMdxFrontmatter, { name: 'frontmatter' }]],
    rehypePlugins: [],
  },
});

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(withMDX(nextConfig));

// Enables `getCloudflareContext()` (D1, R2, env bindings) inside `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
