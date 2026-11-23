import createMDX from '@next/mdx';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal packages are consumed as raw TS source, no build step of their own.
  transpilePackages: ['@clearpath/core', '@clearpath/auth', '@clearpath/tokens'],
};

// Articles are MDX in content/resources, with zh-TW frontmatter exported as `frontmatter`.
// Plugins are named as strings so the same config works for webpack and Turbopack.
const withMDX = createMDX({
  extension: /\.mdx$/,
  options: {
    remarkPlugins: [['remark-frontmatter'], ['remark-mdx-frontmatter', { name: 'frontmatter' }]],
  },
});

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(withMDX(nextConfig));

// Enables `getCloudflareContext()` (D1, R2, env bindings) inside `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
