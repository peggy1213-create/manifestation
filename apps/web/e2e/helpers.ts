import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import type { BrowserContext, Page } from '@playwright/test';
import { expect } from '@playwright/test';

const WEB_DIR = path.resolve(__dirname, '..');
const SESSION_COOKIE_NAME = 'cp_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Run SQL against the same local D1 the dev server uses. */
export function d1(sql: string): string {
  return execFileSync(
    'pnpm',
    ['exec', 'wrangler', 'd1', 'execute', 'clearpath', '--local', '--command', sql, '--json'],
    { cwd: WEB_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

/**
 * Seed a signed-in member and give the browser their session cookie. Google sign-in lands in
 * P04; until then this is exactly what that flow will leave behind: a users row that is not a
 * guest, plus a session holding only the SHA-256 hash of the cookie token.
 */
export async function signInAsMember(context: BrowserContext): Promise<{ userId: string }> {
  const userId = `member-${randomUUID()}`;
  const token = `e2e${randomUUID().replace(/-/g, '')}${randomUUID().replace(/-/g, '')}`.slice(
    0,
    50,
  );
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const now = Date.now();

  d1(
    `insert into users (id, is_guest, email, name, created_at) values ('${userId}', 0, '${userId}@example.com', '會員', ${now});` +
      `insert into sessions (token_hash, user_id, created_at, expires_at) values ('${tokenHash}', '${userId}', ${now}, ${now + SESSION_TTL_MS});`,
  );

  await context.addCookies([
    {
      name: SESSION_COOKIE_NAME,
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  return { userId };
}

/**
 * Pick a 可能性. The radio itself is visually hidden inside its label — the standard
 * accessible pattern — so a person clicks the label, and so does this.
 */
export async function pickLikelihood(page: Page, value: number): Promise<void> {
  await page
    .locator('label')
    .filter({ has: page.getByRole('radio', { name: String(value), exact: true }) })
    .click();
  await expect(page.getByRole('radio', { name: String(value), exact: true })).toBeChecked();
}

/** Fill the whole builder, one screen at a time, and start the 顯化. */
export async function writeManifestation(
  page: Page,
  wish: string,
  options: { likelihood?: number } = {},
): Promise<string> {
  await page.goto('/app/new');

  await page.getByLabel('我的願望').fill(wish);
  await page.getByRole('button', { name: '下一步' }).click();

  await page.getByLabel('最好的結果').fill('我在公園跑完十分鐘，呼吸是順的');
  await page.getByLabel('看到').fill('清晨的公園');
  await page.getByRole('button', { name: '下一步' }).click();

  await page.getByLabel('內在障礙').fill('下班進門就想躺在沙發上');
  await page.getByRole('button', { name: '下一步' }).click();

  await page.getByLabel('如果', { exact: true }).fill('我一進門就想躺下');
  await page.getByLabel('就', { exact: true }).fill('先換上跑鞋，走到家門口');
  await expect(page.getByText('如果我一進門就想躺下，就先換上跑鞋，走到家門口。')).toBeVisible();
  await page.getByRole('button', { name: '下一步' }).click();

  await page.getByPlaceholder('例：換上跑鞋').fill('換上跑鞋');
  await page.getByLabel('什麼時候').fill('下班進門後');
  await page.getByLabel('在哪裡').fill('玄關');
  await page.getByRole('button', { name: '下一步' }).click();

  await pickLikelihood(page, options.likelihood ?? 7);
  await page.getByRole('button', { name: '開始這個顯化' }).click();

  // /app/<id>, not /app/new and not /app/<id>/edit.
  await page.waitForURL((url) => /^\/app\/[0-9a-f-]{36}$/.test(url.pathname));
  const id = new URL(page.url()).pathname.split('/').pop();
  if (!id) throw new Error('no manifestation id in the url');
  return id;
}
