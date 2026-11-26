import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/**
 * Key flows for the 顯化 builder. The dev server runs with the real Cloudflare bindings
 * (initOpenNextCloudflareForDev in next.config.ts), so these drive local D1.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  timeout: 60_000,
  use: { baseURL, trace: 'off', locale: 'zh-TW', timezoneId: 'Asia/Taipei' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
