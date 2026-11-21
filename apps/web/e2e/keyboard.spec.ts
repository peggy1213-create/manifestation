import { expect, test, type Page } from '@playwright/test';
import messages from '../messages/zh-TW.json';

function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768;
}

test('the first tab stop is the skip link, and it moves focus to <main>', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: messages.a11y.skipToContent });
  await expect(skipLink).toBeFocused();
  // sr-only until focused, then visible — otherwise nobody can see where they are.
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('main#main')).toBeFocused();
});

test('header destinations are reachable and followable with the keyboard', async ({ page }) => {
  test.skip(isMobile(page), 'Covered by the menu-button test below md.');
  await page.goto('/');

  const resources = page
    .getByRole('navigation', { name: messages.nav.primaryLabel })
    .getByRole('link', { name: messages.nav.resources });

  // Tab forward until the link takes focus, rather than assuming a tab count.
  for (
    let i = 0;
    i < 10 && !(await resources.evaluate((el) => el === document.activeElement));
    i++
  ) {
    await page.keyboard.press('Tab');
  }
  await expect(resources).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/resources$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    messages.pages.resources.heading,
  );
});

test('the mobile menu opens, closes on Escape and returns focus', async ({ page }) => {
  test.skip(!isMobile(page), 'The menu button is hidden from md up.');
  await page.goto('/');

  const toggle = page.getByRole('button', { name: messages.nav.openMenu });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');

  await toggle.focus();
  await page.keyboard.press('Enter');

  const openToggle = page.getByRole('button', { name: messages.nav.closeMenu });
  await expect(openToggle).toHaveAttribute('aria-expanded', 'true');

  // The panel the toggle points at is the one that opened.
  const panelId = await openToggle.getAttribute('aria-controls');
  expect(panelId).toBeTruthy();
  const panel = page.locator(`[id="${panelId}"]`);
  await expect(panel).toBeVisible();

  // Focus lands on the first link in the panel.
  await expect(panel.getByRole('link').first()).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
});

test('the mobile menu navigates with the keyboard', async ({ page }) => {
  test.skip(!isMobile(page), 'The menu button is hidden from md up.');
  await page.goto('/');

  await page.getByRole('button', { name: messages.nav.openMenu }).focus();
  await page.keyboard.press('Enter');

  const panelId = await page
    .getByRole('button', { name: messages.nav.closeMenu })
    .getAttribute('aria-controls');
  const panel = page.locator(`[id="${panelId}"]`);

  await panel.getByRole('link', { name: messages.nav.space }).focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/space$/);
  // The panel closes on navigation rather than outliving its page.
  await expect(page.getByRole('button', { name: messages.nav.openMenu })).toHaveCount(0);
});

test('顯化空間 tabs are reachable and followable with the keyboard', async ({ page }) => {
  await page.goto('/space');

  const board = page
    .getByRole('navigation', { name: messages.spaceNav.label })
    .getByRole('link', { name: messages.spaceNav.board });

  await board.focus();
  await expect(board).toBeFocused();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/space\/board$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.pages.board.heading);
  await expect(
    page
      .getByRole('navigation', { name: messages.spaceNav.label })
      .getByRole('link', { name: messages.spaceNav.board }),
  ).toHaveAttribute('aria-current', 'page');
});

test('every nav target meets the 44px touch-target minimum', async ({ page }) => {
  await page.goto('/space');

  const links = page.getByRole('navigation', { name: messages.spaceNav.label }).getByRole('link');

  for (const link of await links.all()) {
    const box = await link.boundingBox();
    expect(box, 'nav link should be laid out').not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  }
});

test('focus is always visible on nav links', async ({ page }) => {
  await page.goto('/space');

  const link = page
    .getByRole('navigation', { name: messages.spaceNav.label })
    .getByRole('link', { name: messages.spaceNav.footprints });

  await link.focus();
  const outlineWidth = await link.evaluate((el) => getComputedStyle(el).outlineWidth);
  expect(parseFloat(outlineWidth)).toBeGreaterThan(0);
});
