import { cloudflareTest } from '@cloudflare/vitest-plugin';
import { defineConfig } from 'vitest/config';

// Session tokens use Web Crypto exactly as the Worker will, so the tests run in
// workerd rather than Node.
export default defineConfig({
  plugins: [cloudflareTest({ config: false, miniflare: { compatibilityDate: '2026-11-21' } })],
});
