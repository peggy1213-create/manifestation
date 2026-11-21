import { expect, test, type Page } from '@playwright/test';
import messages from '../messages/zh-TW.json';

/** Every route in the app. The shell has to be on all of them. */
const paths = [
  '/',
  '/resources',
  '/about',
  '/privacy',
  '/contact',
  '/login',
  '/space',
  '/space/manifestations',
  '/space/board',
  '/space/rehearsal',
  '/space/footprints',
  '/this-route-does-not-exist',
];

function isMobile(page: Page): boolean {
  return (page.viewportSize()?.width ?? 0) < 768;
}

for (const path of paths) {
  test(`shell renders on ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response?.status()).toBe(path.includes('does-not-exist') ? 404 : 200);

    // zh-TW everywhere.
    await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');

    // Header: the wordmark links home, and the account slot offers 登入.
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(
      page.getByRole('link', { name: new RegExp(messages.site.shortName) }).first(),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: messages.nav.signIn })).toBeVisible();

    // A single main landmark, which the skip link targets.
    await expect(page.locator('main#main')).toHaveCount(1);

    // Footer: the links and the "not therapy" line.
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: messages.footer.about })).toBeVisible();
    await expect(footer.getByRole('link', { name: messages.footer.privacy })).toBeVisible();
    await expect(footer.getByRole('link', { name: messages.footer.contact })).toBeVisible();
    await expect(footer.getByText(messages.footer.disclaimer)).toBeVisible();

    // Exactly one h1 per screen.
    await expect(page.locator('h1')).toHaveCount(1);
  });
}

test('header nav shows the three primary destinations from md up', async ({ page }) => {
  test.skip(isMobile(page), 'The header nav is replaced by the menu button below md.');
  await page.goto('/');

  const nav = page.getByRole('navigation', { name: messages.nav.primaryLabel });
  await expect(nav.getByRole('link', { name: messages.nav.home })).toBeVisible();
  await expect(nav.getByRole('link', { name: messages.nav.resources })).toBeVisible();
  await expect(nav.getByRole('link', { name: messages.nav.space })).toBeVisible();
});

test('the current destination is marked aria-current="page"', async ({ page }) => {
  await page.goto('/resources');

  if (isMobile(page)) {
    // Below md the destinations live in the menu panel, so open it first.
    await page.getByRole('button', { name: messages.nav.openMenu }).click();
  }

  const current = page
    .getByRole('navigation', { name: messages.nav.primaryLabel })
    .getByRole('link', { name: messages.nav.resources });
  await expect(current).toHaveAttribute('aria-current', 'page');
});

test('nested 顯化空間 screens keep 顯化空間 marked as current', async ({ page }) => {
  test.skip(isMobile(page), 'The header nav is hidden below md.');
  await page.goto('/space/board');

  const nav = page.getByRole('navigation', { name: messages.nav.primaryLabel });
  await expect(nav.getByRole('link', { name: messages.nav.space })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('顯化空間 nav is a bottom tab bar on mobile and a sub-nav on desktop', async ({ page }) => {
  await page.goto('/space');

  const spaceNav = page.getByRole('navigation', { name: messages.spaceNav.label });
  await expect(spaceNav).toHaveCount(1); // The other presentation is display:none.

  for (const label of Object.values(messages.spaceNav).filter(
    (l) => l !== messages.spaceNav.label,
  )) {
    await expect(spaceNav.getByRole('link', { name: label })).toBeVisible();
  }

  // 今天 is the 顯化空間 index, so it is the current tab here.
  await expect(spaceNav.getByRole('link', { name: messages.spaceNav.today })).toHaveAttribute(
    'aria-current',
    'page',
  );
});

test('the header menu button only exists outside 顯化空間, and only on mobile', async ({
  page,
}) => {
  // Role queries skip anything hidden from assistive technology, so a count of
  // 0 covers both "not rendered" and "display:none".
  const exposedButton = page.getByRole('button', { name: messages.nav.openMenu });
  // The DOM-level locator tells the two apart.
  const renderedButton = page.locator('header button[aria-controls]');

  await page.goto('/');
  if (isMobile(page)) {
    await expect(exposedButton).toBeVisible();
  } else {
    // Rendered, but hidden with `md:hidden` from md up — the header nav is
    // showing instead, so the button is not offered to anyone.
    await expect(renderedButton).toHaveCount(1);
    await expect(exposedButton).toHaveCount(0);
  }

  // On 顯化空間 screens the component renders nothing at all: the tab bar below
  // md and the sub-nav from md up take over.
  await page.goto('/space');
  await expect(renderedButton).toHaveCount(0);
  await expect(exposedButton).toHaveCount(0);
});

test('page titles and Open Graph defaults are zh-TW', async ({ page }) => {
  await page.goto('/resources');

  await expect(page).toHaveTitle(`${messages.pages.resources.metaTitle} · ${messages.site.name}`);

  const ogLocale = page.locator('meta[property="og:locale"]');
  await expect(ogLocale).toHaveAttribute('content', 'zh_TW');

  const ogSite = page.locator('meta[property="og:site_name"]');
  await expect(ogSite).toHaveAttribute('content', messages.site.name);

  const ogTitle = page.locator('meta[property="og:title"]');
  await expect(ogTitle).toHaveAttribute(
    'content',
    `${messages.pages.resources.metaTitle} · ${messages.site.name}`,
  );

  const description = page.locator('meta[name="description"]');
  await expect(description).toHaveAttribute('content', messages.pages.resources.metaDescription);
});
