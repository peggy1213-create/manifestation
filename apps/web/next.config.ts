import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source, so Next compiles them itself.
  transpilePackages: ['@clearpath/core', '@clearpath/auth', '@clearpath/tokens'],
};

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

// Gives `next dev` the same D1 and R2 bindings the Worker gets in production.
initOpenNextCloudflareForDev();

export default withNextIntl(nextConfig);
