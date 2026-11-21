import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  // Internal packages are consumed as raw TS source, no build step of their own.
  transpilePackages: ['@clearpath/core', '@clearpath/auth', '@clearpath/tokens'],
};

// Reads ./i18n/request.ts (next-intl's default location).
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);

// Enables `getCloudflareContext()` (D1, R2, env bindings) inside `next dev`.
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';
initOpenNextCloudflareForDev();
