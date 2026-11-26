import { cookies } from 'next/headers';
import {
  SESSION_COOKIE,
  hashSessionToken,
  newSessionToken,
  sessionCookieOptions,
  sessionExpiresAt,
} from '@clearpath/auth';
import {
  createManifestation,
  createSession,
  listManifestations,
  today as todayIn,
  upsertUserByEmail,
} from '@clearpath/core';
import { getDatabase, getEnv } from '@/lib/cloudflare';

/**
 * Development only. The Google sign-in flow does not exist yet (P04), so this
 * route seeds one 顯化 and signs in, to make /app/[id] usable with
 * `pnpm dev` and `pnpm preview`.
 *
 * It opens solely when DEV_SEED_TOKEN is set in apps/web/.dev.vars and the
 * request carries the same value. That variable is never a production secret,
 * so in production the binding is absent and this route answers 404 — the same
 * answer as any path that does not exist.
 */
function notFound(): Response {
  return new Response('Not found', { status: 404 });
}

/** Constant-time comparison, so the answer never leaks the token by timing. */
function tokensMatch(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

export async function GET(request: Request): Promise<Response> {
  const env = await getEnv();
  const expected = env.DEV_SEED_TOKEN;
  if (!expected) return notFound();

  const provided = new URL(request.url).searchParams.get('token');
  if (!provided || !tokensMatch(provided, expected)) return notFound();

  const db = await getDatabase();
  const user = await upsertUserByEmail(db, {
    email: 'dev@clearpath.test',
    displayName: '開發用帳號',
  });

  const existing = await listManifestations(db, user.id);
  const manifestation =
    existing[0] ??
    (await createManifestation(db, user.id, {
      wish: '每天走十分鐘',
      outcome: '傍晚走到河邊，看看天色',
      obstacle: '一回家就坐到沙發上，就不想動了',
      planIf: '我一回家想坐下',
      planThen: '先把鞋子穿好，走到巷口',
      startedOn: todayIn(user.timeZone),
      timeZone: user.timeZone,
      steps: [{ body: '把鞋子放在門口' }, { body: '走到巷口' }, { body: '回來記下一句話' }],
    }));

  const token = newSessionToken();
  await createSession(db, {
    tokenHash: await hashSessionToken(token),
    userId: user.id,
    expiresAt: sessionExpiresAt(),
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());

  return new Response(null, {
    status: 302,
    headers: { location: `/app/${manifestation.id}`, 'cache-control': 'no-store' },
  });
}
