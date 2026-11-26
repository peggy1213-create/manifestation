import { expect, test, type Page } from '@playwright/test';

/**
 * 記下今天 on /app/[id]: the day lands on 足跡 straight away, it is still there
 * after a reload, and a day recorded with no network waits on the device and
 * goes up when the network returns.
 */

const SEED_TOKEN = process.env.DEV_SEED_TOKEN ?? 'local-dev-token';

/** Signs in and opens the seeded 顯化 (the Google flow lands in P04). */
async function openSeededPath(page: Page): Promise<void> {
  await page.goto(`/api/dev/seed?token=${encodeURIComponent(SEED_TOKEN)}`);
  await expect(page).toHaveURL(/\/app\/[0-9a-f-]+$/u);
  await expect(page.getByRole('heading', { name: '記下今天' })).toBeVisible();
}

/**
 * Clears every 今日行動 tick. Today may already carry a check-in from an earlier
 * run, and the form restores its ticks, so each test starts from a blank day.
 */
async function clearCues(page: Page): Promise<void> {
  const cues = page.getByRole('checkbox');
  for (let index = 0; index < (await cues.count()); index += 1) {
    await cues.nth(index).uncheck();
  }
}

/** Today's cell on the 足跡 map, found by the status in its label. */
function todayCell(page: Page, status: '做到了' | '部分' | '今天沒做到' | '沒有紀錄') {
  return page.locator(`[aria-label*="今天"][aria-label*="${status}"]`);
}

test.beforeEach(async ({ page }) => {
  await openSeededPath(page);
  await clearCues(page);
});

test('ticking every 今日行動 reads as 做到了, and the day lands on 足跡', async ({ page }) => {
  const cues = page.getByRole('checkbox');
  const count = await cues.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    await cues.nth(index).check();
  }

  // The cue rule picks the status; nothing was typed to choose it.
  await expect(page.getByRole('button', { name: '做到了', pressed: true })).toBeVisible();

  await page.getByLabel('今天的一句話').fill('走到河邊，看到夕陽');
  await page.getByRole('button', { name: /記下今天|更新今天/u }).click();

  // 足跡 moves without a reload.
  await expect(todayCell(page, '做到了')).toBeVisible();
  await expect(page.getByText('記下來了。今天走到了。')).toBeVisible();

  // And it is still there afterwards, from D1 rather than from the browser.
  await page.reload();
  await expect(todayCell(page, '做到了')).toBeVisible();
  await expect(page.getByLabel('今天的一句話')).toHaveValue('走到河邊，看到夕陽');
  await expect(page.getByText('今天已經記過了，可以直接改。')).toBeVisible();
});

test('ticking some cues reads as 部分', async ({ page }) => {
  await page.getByRole('checkbox').first().check();
  await expect(page.getByRole('button', { name: '部分', pressed: true })).toBeVisible();

  await page.getByRole('button', { name: /記下今天|更新今天/u }).click();
  await expect(todayCell(page, '部分')).toBeVisible();

  // Wait for the save to resolve before reloading: 足跡 moves on the optimistic
  // record, and reloading mid-flight would race the write rather than test it.
  await expect(page.getByText('記下來了。走了一點也是走了。')).toBeVisible();
  await page.reload();
  await expect(todayCell(page, '部分')).toBeVisible();
});

test('今天沒做到 is recorded as neutrally as any other day', async ({ page }) => {
  await page.getByRole('button', { name: '今天沒做到' }).click();
  await page.getByRole('button', { name: /記下今天|更新今天/u }).click();

  await expect(page.getByText('記下來了。明天再來。')).toBeVisible();
  await page.reload();
  await expect(todayCell(page, '今天沒做到')).toBeVisible();
});

test('a day recorded with no network waits on the device and syncs later', async ({
  context,
  page,
}) => {
  await context.setOffline(true);

  await page.getByRole('button', { name: '做到了' }).click();
  await page.getByLabel('今天的一句話').fill('在沒有訊號的地方記下');
  await page.getByRole('button', { name: /記下今天|更新今天/u }).click();

  // The day is on 足跡 and on the device, and the copy says so plainly.
  await expect(todayCell(page, '做到了')).toBeVisible();
  await expect(page.getByText(/已經記在這台裝置上/u)).toBeVisible();
  await expect(page.getByText('還有 1 天等著同步。')).toBeVisible();

  // Back online, the queue drains by itself.
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await expect(page.getByText('還有 1 天等著同步。')).toBeHidden();

  // The server has it now, so a reload shows it coming back from D1.
  await page.reload();
  await expect(todayCell(page, '做到了')).toBeVisible();
  await expect(page.getByLabel('今天的一句話')).toHaveValue('在沒有訊號的地方記下');
});

test('the path map and the cycle stats describe the cycle without a target', async ({ page }) => {
  await page.getByRole('button', { name: '做到了' }).click();
  await page.getByRole('button', { name: /記下今天|更新今天/u }).click();
  await expect(todayCell(page, '做到了')).toBeVisible();

  // 66 cells, one per day of the path.
  await expect(page.locator('[aria-label^="第 "]')).toHaveCount(66);

  await expect(page.getByText('有做到的天數')).toBeVisible();
  await expect(page.getByText('最近連續')).toBeVisible();
  await expect(page.getByText('有做到的比例')).toBeVisible();
  await expect(page.getByText('預演次數')).toBeVisible();

  // Nothing on the page frames a missed day as a failure or counts down.
  const body = await page.locator('body').innerText();
  for (const forbidden of ['目標', '達成', '任務', '打卡', '進度', 'KPI', '失敗', '連續中斷']) {
    expect(body).not.toContain(forbidden);
  }
});
