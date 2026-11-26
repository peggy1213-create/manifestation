import { expect, test } from '@playwright/test';

/**
 * Google sign-in, as far as it can be driven without Google. The ID-token
 * verification itself is covered in packages/auth, against tokens signed with
 * a real RSA key; what is checked here is everything this app does around it.
 */

const CALLBACK = '/api/auth/google/callback';

test.describe('signed out', () => {
  test('the front door offers sign-in', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: '開始' }).click();
    await expect(page.getByRole('heading', { name: '登入顯化' })).toBeVisible();
    await expect(page.getByRole('link', { name: '用 Google 繼續' })).toBeVisible();
  });

  test('a 顯化 sends you to sign in, and remembers where you were going', async ({ page }) => {
    await page.goto('/app/00000000-0000-4000-8000-000000000000');

    await expect(page).toHaveURL(/\/sign-in\?returnTo=%2Fapp%2F00000000/u);
    const start = page.getByRole('link', { name: '用 Google 繼續' });
    await expect(start).toHaveAttribute(
      'href',
      '/api/auth/google/start?returnTo=%2Fapp%2F00000000-0000-4000-8000-000000000000',
    );
  });

  test('the list sends you to sign in too', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL('/sign-in?returnTo=%2Fapp');
  });

  test('an off-site returnTo is dropped rather than followed', async ({ page }) => {
    await page.goto('/sign-in?returnTo=https%3A%2F%2Fevil.example');
    await expect(page.getByRole('link', { name: '用 Google 繼續' })).toHaveAttribute(
      'href',
      '/api/auth/google/start?returnTo=%2Fapp',
    );
  });
});

test.describe('starting the flow', () => {
  test('redirects to Google with PKCE, state and nonce, and seals the attempt', async ({
    request,
  }) => {
    const response = await request.get('/api/auth/google/start?returnTo=%2Fapp', {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    const location = new URL(response.headers().location ?? '');
    expect(location.origin + location.pathname).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('scope')).toBe('openid email profile');
    expect(location.searchParams.get('redirect_uri')).toContain(CALLBACK);

    const challenge = location.searchParams.get('code_challenge') ?? '';
    const state = location.searchParams.get('state') ?? '';
    const nonce = location.searchParams.get('nonce') ?? '';
    for (const value of [challenge, state, nonce]) {
      expect(value).toMatch(/^[A-Za-z0-9_-]{43}$/u);
    }
    expect(state).not.toBe(nonce);

    // The attempt rides in a sealed, HttpOnly cookie scoped to the callback —
    // the verifier and nonce never appear in it in the clear.
    const cookie = response.headers()['set-cookie'] ?? '';
    expect(cookie).toContain('cp_oauth=');
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=lax');
    expect(cookie).toContain('Path=/api/auth');
    expect(cookie).not.toContain(nonce);
  });

  test('mints a different attempt every time', async ({ request }) => {
    const states = new Set<string>();
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const response = await request.get('/api/auth/google/start', { maxRedirects: 0 });
      const location = new URL(response.headers().location ?? '');
      states.add(location.searchParams.get('state') ?? '');
    }
    expect(states.size).toBe(3);
  });
});

test.describe('coming back from Google', () => {
  test('a callback with no attempt cookie signs nobody in', async ({ request }) => {
    const response = await request.get(`${CALLBACK}?code=whatever&state=whatever`, {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain('/sign-in?error=expired');
    expect(response.headers()['set-cookie'] ?? '').not.toContain('cp_session=');
  });

  test('a state that does not match the attempt is refused', async ({ request }) => {
    // Start properly, then come back with somebody else's state.
    const start = await request.get('/api/auth/google/start', { maxRedirects: 0 });
    expect(start.status()).toBe(302);

    const response = await request.get(`${CALLBACK}?code=whatever&state=not-the-state`, {
      maxRedirects: 0,
    });

    expect(response.headers().location).toContain('/sign-in?error=refused');
    expect(response.headers()['set-cookie'] ?? '').not.toContain('cp_session=');
  });

  test('saying no at Google comes back gently, not as an error page', async ({ request }) => {
    await request.get('/api/auth/google/start', { maxRedirects: 0 });
    const response = await request.get(`${CALLBACK}?error=access_denied`, { maxRedirects: 0 });

    expect(response.status()).toBe(302);
    expect(response.headers().location).toContain('/sign-in?error=cancelled');
  });

  test('a spent attempt cookie is cleared, so it cannot be replayed', async ({ request }) => {
    await request.get('/api/auth/google/start', { maxRedirects: 0 });
    const response = await request.get(`${CALLBACK}?error=access_denied`, { maxRedirects: 0 });

    expect(response.headers()['set-cookie'] ?? '').toMatch(/cp_oauth=;|cp_oauth=;?\s*Max-Age=0/u);
  });
});

test.describe('signed in', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/api/dev/seed?token=local-dev-token');
    await expect(page).toHaveURL(/\/app\/[0-9a-f-]+$/u);
  });

  test('the front door steps aside', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/app');
    await expect(page.getByRole('heading', { name: '我的顯化' })).toBeVisible();
  });

  test('the list shows the 顯化 and which day it is on', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('link', { name: /每天走十分鐘/u })).toBeVisible();
    await expect(page.getByText(/第 \d+ 天 ／ 共 66 天/u)).toBeVisible();
  });

  test('signing out ends the session, not just the cookie', async ({ page }) => {
    await page.goto('/app');
    await page.getByRole('button', { name: '登出' }).click();
    await expect(page).toHaveURL('/');

    // Back to the front door, and the list is closed again.
    await page.goto('/app');
    await expect(page).toHaveURL('/sign-in?returnTo=%2Fapp');
  });
});
