import { expect, test } from '@playwright/test';
import { pickLikelihood, writeManifestation } from './helpers';

test.describe('顯化 builder, as a guest', () => {
  test('writes a 顯化 one question at a time and starts it', async ({ page }) => {
    await writeManifestation(page, '每週運動三次，讓身體有力氣');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('每週運動三次，讓身體有力氣');
    await expect(page.getByText('進行中')).toBeVisible();
    await expect(page.getByText('如果我一進門就想躺下，就先換上跑鞋，走到家門口。')).toBeVisible();
    await expect(page.getByText('換上跑鞋', { exact: true })).toBeVisible();
    await expect(page.getByText('下班進門後·玄關')).toBeVisible();
  });

  test('tells a guest their 顯化 is private to this browser', async ({ page }) => {
    await page.goto('/app/new');
    await expect(page.getByText(/這個瀏覽器的私人紀錄/)).toBeVisible();
  });

  test('autosaves a draft and keeps it across a reload', async ({ page }) => {
    await page.goto('/app/new');
    await page.getByLabel('我的願望').fill('每天寫三行');

    await expect(page.getByText(/草稿已存/)).toBeVisible();
    await expect(page).toHaveURL(/\/app\/[^/]+\/edit$/);

    await page.reload();
    await expect(page.getByLabel('我的願望')).toHaveValue('每天寫三行');
  });

  test('edits a 顯化 that has already started, without restarting it', async ({ page }) => {
    const id = await writeManifestation(page, '每週運動三次');

    await page.goto(`/app/${id}/edit`);
    await page.getByLabel('我的願望').fill('每週運動兩次');
    await expect(page.getByText(/修改已存/)).toBeVisible();

    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: '下一步' }).click();
    }
    await page.getByRole('button', { name: '存下修改' }).click();

    await page.waitForURL(`/app/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('每週運動兩次');
    await expect(page.getByText('進行中')).toBeVisible();
  });

  test('releases a 顯化 with a kind message, and keeps it', async ({ page }) => {
    const id = await writeManifestation(page, '每天讀二十頁');

    await page.goto(`/app/${id}`);
    await page.getByRole('button', { name: '放下這個顯化' }).click();
    await page.getByLabel('想留一句話給自己嗎？').fill('現在不是時候');
    await page.getByRole('button', { name: '放下它' }).click();

    await expect(page.getByText('已放下')).toBeVisible();
    await expect(page.getByText('已經放下了。這也算走了一段路。')).toBeVisible();
    await expect(page.getByText('「現在不是時候」')).toBeVisible();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('每天讀二十頁');

    // A released 顯化 is kept, not edited.
    await page.goto(`/app/${id}/edit`);
    await expect(page.getByText('已放下')).toBeVisible();
    await expect(page.getByLabel('我的願望')).toHaveCount(0);
  });

  test('suggests a smaller 願望 when the likelihood is below 4', async ({ page }) => {
    await page.goto('/app/new');
    await page.getByLabel('我的願望').fill('一年內跑完全馬');
    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: '下一步' }).click();
    }

    await pickLikelihood(page, 2);
    await expect(page.getByText(/這個願望現在有點太大/)).toBeVisible();

    await page.getByRole('button', { name: '回去把願望改小一點' }).click();
    await expect(page.getByLabel('我的願望')).toBeVisible();

    await page.getByLabel('我的願望').fill('這週跑兩次，每次十分鐘');
    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: '下一步' }).click();
    }
    await pickLikelihood(page, 8);
    await expect(page.getByText(/你對這個顯化有信心/)).toBeVisible();
  });

  test('points at the unfinished question instead of saving half a 顯化', async ({ page }) => {
    await page.goto('/app/new');
    await page.getByLabel('我的願望').fill('每週運動三次');
    for (let step = 0; step < 5; step += 1) {
      await page.getByRole('button', { name: '下一步' }).click();
    }
    await pickLikelihood(page, 7);
    await page.getByRole('button', { name: '開始這個顯化' }).click();

    // It jumps back to the question that is still unanswered instead of starting the 顯化.
    await expect(page.getByText('寫下實現之後最好的結果')).toBeVisible();
    await expect(page.getByLabel('最好的結果')).toBeVisible();
    await expect(page).toHaveURL(/\/app\/[^/]+\/edit$/);
  });

  test('keeps one guest’s 顯化 out of another guest’s browser', async ({ page, browser }) => {
    const id = await writeManifestation(page, '每週游泳一次');

    const otherGuest = await browser.newContext();
    const otherPage = await otherGuest.newPage();
    const response = await otherPage.goto(`/app/${id}`);
    expect(response?.status()).toBe(404);
    await otherGuest.close();
  });

  test('offers 安心專線 1925 gently when someone writes about self-harm', async ({ page }) => {
    await page.goto('/app/new');
    await page.getByLabel('我的願望').fill('不要再想死了');

    await expect(page.getByRole('note')).toContainText('安心專線 1925');
    await expect(page.getByLabel('我的願望')).toHaveValue('不要再想死了');
  });
});
