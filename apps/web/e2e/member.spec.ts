import { expect, test } from '@playwright/test';
import { signInAsMember, writeManifestation } from './helpers';

test.describe('顯化 builder, as a signed-in member', () => {
  test('creates, edits and releases a 顯化', async ({ page, context }) => {
    await signInAsMember(context);

    const id = await writeManifestation(page, '每週運動三次');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('每週運動三次');

    // No guest notice for a signed-in member.
    await page.goto(`/app/${id}/edit`);
    await expect(page.getByText(/這個瀏覽器的私人紀錄/)).toHaveCount(0);

    await page.getByLabel('我的願望').fill('每週運動四次');
    await expect(page.getByText(/修改已存/)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('我的願望')).toHaveValue('每週運動四次');

    await page.goto(`/app/${id}`);
    await page.getByRole('button', { name: '放下這個顯化' }).click();
    await page.getByRole('button', { name: '放下它' }).click();
    await expect(page.getByText('已放下')).toBeVisible();
  });

  test('lists only this member’s 顯化', async ({ page, context, browser }) => {
    await signInAsMember(context);
    await writeManifestation(page, '每天走一萬步');

    await page.goto('/app');
    await expect(page.getByText('每天走一萬步')).toBeVisible();

    const otherContext = await browser.newContext();
    const otherPage = await otherContext.newPage();
    await signInAsMember(otherContext);
    await otherPage.goto('/app');
    await expect(otherPage.getByText('每天走一萬步')).toHaveCount(0);
    await expect(otherPage.getByText(/還沒有顯化/)).toBeVisible();
    await otherContext.close();
  });
});
