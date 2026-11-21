import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from '../db/client';
import { manifestations, sessions, users } from '../db/schema';
import {
  createManifestation,
  countManifestations,
  deleteManifestation,
  findManifestation,
  listManifestationSummaries,
  listManifestations,
} from './manifestations';
import {
  createSession,
  deleteExpiredSessions,
  deleteSessionByTokenHash,
  deleteSessionsForUser,
  findActiveSession,
  renewSession,
  SESSION_TTL_MS,
} from './sessions';
import { deleteUser, findUserByGoogleSub, findUserById, upsertUserByGoogleSub } from './users';

const NOW = Date.UTC(2026, 10, 21, 3, 0, 0);

let db: Database;

beforeEach(async () => {
  db = createDatabase(env.DB);
  // Each test starts from an empty database; sessions and 顯化 cascade from users.
  await db.delete(manifestations);
  await db.delete(sessions);
  await db.delete(users);
});

async function signIn(
  googleSub: string,
  email: string,
  name: string | null = null,
): Promise<string> {
  const user = await upsertUserByGoogleSub(db, { googleSub, email, name, now: NOW });
  return user.id;
}

describe('users', () => {
  it('creates an account on first sign-in', async () => {
    const user = await upsertUserByGoogleSub(db, {
      googleSub: 'google-sub-1',
      email: 'peggy@example.com',
      name: ' 佩君 ',
      now: NOW,
    });

    expect(user.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(user.googleSub).toBe('google-sub-1');
    expect(user.email).toBe('peggy@example.com');
    expect(user.name).toBe('佩君');
    expect(user.createdAt).toBe(NOW);
    await expect(findUserById(db, user.id)).resolves.toMatchObject({ id: user.id });
  });

  it('matches a returning account on google_sub, not email', async () => {
    const first = await upsertUserByGoogleSub(db, {
      googleSub: 'google-sub-1',
      email: 'old@example.com',
      name: '佩君',
      now: NOW,
    });
    const second = await upsertUserByGoogleSub(db, {
      googleSub: 'google-sub-1',
      email: 'new@example.com',
      name: 'Peggy',
      now: NOW + 1000,
    });

    expect(second.id).toBe(first.id);
    expect(second.email).toBe('new@example.com');
    expect(second.name).toBe('Peggy');
    expect(second.createdAt).toBe(NOW);
    expect(second.updatedAt).toBe(NOW + 1000);
    await expect(countUsers()).resolves.toBe(1);
  });

  it('keeps two Google accounts that share no subject apart', async () => {
    const a = await signIn('google-sub-1', 'a@example.com');
    const b = await signIn('google-sub-2', 'b@example.com');
    expect(a).not.toBe(b);
    await expect(countUsers()).resolves.toBe(2);
    await expect(findUserByGoogleSub(db, 'google-sub-2')).resolves.toMatchObject({ id: b });
    await expect(findUserByGoogleSub(db, 'nobody')).resolves.toBeNull();
  });

  it('stores an empty display name as null', async () => {
    const user = await upsertUserByGoogleSub(db, {
      googleSub: 'google-sub-1',
      email: 'a@example.com',
      name: '   ',
      now: NOW,
    });
    expect(user.name).toBeNull();
  });
});

describe('sessions', () => {
  it('finds the account behind a token hash', async () => {
    const userId = await signIn('google-sub-1', 'peggy@example.com', '佩君');
    const session = await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });

    expect(session.expiresAt).toBe(NOW + SESSION_TTL_MS);

    const active = await findActiveSession(db, 'hash-1', NOW + 1000);
    expect(active?.user.id).toBe(userId);
    expect(active?.user.name).toBe('佩君');
    expect(active?.session.id).toBe(session.id);
  });

  it('does not find an unknown hash', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });
    await expect(findActiveSession(db, 'another-hash', NOW)).resolves.toBeNull();
  });

  it('does not find an expired session', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });

    await expect(findActiveSession(db, 'hash-1', NOW + SESSION_TTL_MS - 1)).resolves.not.toBeNull();
    await expect(findActiveSession(db, 'hash-1', NOW + SESSION_TTL_MS)).resolves.toBeNull();
    await expect(findActiveSession(db, 'hash-1', NOW + SESSION_TTL_MS + 1)).resolves.toBeNull();
  });

  it('rolls the expiry forward on renewal', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });

    const later = NOW + 20 * 24 * 60 * 60 * 1000;
    await renewSession(db, (await findActiveSession(db, 'hash-1', later))!.session.id, {
      now: later,
    });

    const renewed = await findActiveSession(db, 'hash-1', later);
    expect(renewed?.session.lastUsedAt).toBe(later);
    expect(renewed?.session.expiresAt).toBe(later + SESSION_TTL_MS);
    // Still valid well past the original 30 days.
    await expect(
      findActiveSession(db, 'hash-1', NOW + 40 * 24 * 60 * 60 * 1000),
    ).resolves.not.toBeNull();
  });

  it('signs out by deleting the row', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });
    await createSession(db, { userId, tokenHash: 'hash-2', now: NOW });

    await deleteSessionByTokenHash(db, 'hash-1');
    await expect(findActiveSession(db, 'hash-1', NOW)).resolves.toBeNull();
    // Signing out on one device leaves the other signed in.
    await expect(findActiveSession(db, 'hash-2', NOW)).resolves.not.toBeNull();

    await deleteSessionsForUser(db, userId);
    await expect(findActiveSession(db, 'hash-2', NOW)).resolves.toBeNull();
  });

  it('deleting the account deletes its sessions', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'hash-1', now: NOW });
    await deleteUser(db, userId);
    await expect(findActiveSession(db, 'hash-1', NOW)).resolves.toBeNull();
  });

  it('cleans up only the expired rows', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createSession(db, { userId, tokenHash: 'old', now: NOW - 40 * 24 * 60 * 60 * 1000 });
    await createSession(db, { userId, tokenHash: 'fresh', now: NOW });

    await deleteExpiredSessions(db, NOW);
    await expect(findActiveSession(db, 'fresh', NOW)).resolves.not.toBeNull();
    const remaining = await db.select().from(sessions);
    expect(remaining).toHaveLength(1);
  });
});

describe('manifestations are scoped to their account', () => {
  it('user B cannot read user A 的顯化', async () => {
    const userA = await signIn('google-sub-a', 'a@example.com');
    const userB = await signIn('google-sub-b', 'b@example.com');

    const theirs = await createManifestation(db, userA, {
      wish: '每週跑三次',
      outcome: '週末爬山不會喘',
      obstacle: '下班就想躺著',
      plan: '如果下班想躺著，就先換上跑鞋走十分鐘',
      now: NOW,
    });

    await expect(findManifestation(db, userA, theirs.id)).resolves.toMatchObject({ id: theirs.id });
    // Same row id, other account: nothing comes back.
    await expect(findManifestation(db, userB, theirs.id)).resolves.toBeNull();
    await expect(listManifestations(db, userB)).resolves.toEqual([]);
    await expect(listManifestationSummaries(db, userB)).resolves.toEqual([]);
    await expect(countManifestations(db, userB)).resolves.toBe(0);
    await expect(countManifestations(db, userA)).resolves.toBe(1);
  });

  it('user B cannot delete user A 的顯化', async () => {
    const userA = await signIn('google-sub-a', 'a@example.com');
    const userB = await signIn('google-sub-b', 'b@example.com');
    const theirs = await createManifestation(db, userA, {
      wish: '每天寫三行筆記',
      outcome: '想法不再散落',
      obstacle: '睡前只想滑手機',
      plan: '如果睡前想滑手機，就先寫一行',
      now: NOW,
    });

    await deleteManifestation(db, userB, theirs.id);
    await expect(findManifestation(db, userA, theirs.id)).resolves.not.toBeNull();

    await deleteManifestation(db, userA, theirs.id);
    await expect(findManifestation(db, userA, theirs.id)).resolves.toBeNull();
  });

  it('records where a 顯化 came from and keeps the guest date', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    const written = Date.UTC(2026, 9, 1);
    const moved = await createManifestation(db, userId, {
      wish: '每週跑三次',
      outcome: '',
      obstacle: '',
      plan: '',
      source: 'guest',
      createdAt: written,
      now: NOW,
    });

    expect(moved.source).toBe('guest');
    expect(moved.createdAt).toBe(written);
    expect(moved.updatedAt).toBe(NOW);

    const summaries = await listManifestationSummaries(db, userId);
    expect(summaries).toEqual([{ id: moved.id, wish: '每週跑三次', createdAt: written }]);
  });

  it('lists a 顯化 oldest first', async () => {
    const userId = await signIn('google-sub-1', 'a@example.com');
    await createManifestation(db, userId, {
      wish: '第二個',
      outcome: '',
      obstacle: '',
      plan: '',
      createdAt: NOW + 1000,
      now: NOW,
    });
    await createManifestation(db, userId, {
      wish: '第一個',
      outcome: '',
      obstacle: '',
      plan: '',
      createdAt: NOW,
      now: NOW,
    });

    const wishes = (await listManifestations(db, userId)).map((row) => row.wish);
    expect(wishes).toEqual(['第一個', '第二個']);
  });
});

async function countUsers(): Promise<number> {
  return (await db.select().from(users)).length;
}
