import { defineConfig } from '@playwright/test';

/**
 * The key flows run against the real Worker (`wrangler dev` over the
 * @opennextjs/cloudflare bundle), not `next dev`, so what the tests exercise is
 * the runtime that production uses: D1, R2 and the Workers request lifecycle.
 *
 * Before the first run: copy .dev.vars.example to .dev.vars, set
 * DEV_SEED_TOKEN, and apply the migrations to the local D1:
 *
 *   wrangler d1 migrations apply clearpath --local
 */
const PORT = Number(process.env.E2E_PORT ?? 8787);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL,
    locale: 'zh-TW',
    timezoneId: 'Asia/Taipei',
    trace: 'off',
  },
  // The two widths the layout is built for, both on Chromium.
  projects: [
    {
      name: 'mobile',
      use: {
        browserName: 'chromium',
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: 'desktop',
      use: { browserName: 'chromium', viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm exec opennextjs-cloudflare build && pnpm exec wrangler dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: true,
    timeout: 300_000,
  },
});
