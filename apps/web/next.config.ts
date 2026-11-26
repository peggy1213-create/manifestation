import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Internal packages are consumed as raw TS source, no build step of their own.
  transpilePackages: ['@clearpath/core', '@clearpath/auth', '@clearpath/tokens'],
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

export default withNextIntl(nextConfig);

// Enables `getCloudflareContext()` (D1, R2, env bindings) inside `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
