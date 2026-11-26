// The whole builder flow, for both kinds of viewer: a guest with nothing but a cookie, and a
// signed-in member. Both go through the same repo functions, scoped by userId.

import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyManifestationInput, type ManifestationInput } from '../index';
import {
  activateManifestation,
  createDb,
  createDraft,
  createGuestSession,
  createSessionForUser,
  findViewerBySession,
  getManifestation,
  listManifestations,
  releaseManifestation,
  saveManifestationInput,
  type Db,
  type Viewer,
} from './index';

const NOW = 1_764_000_000_000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** The same SHA-256-hex the session cookie is reduced to in @clearpath/auth. */
async function hash(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

let db: Db;

beforeEach(async () => {
  db = createDb(env.DB);
  await env.DB.exec('DELETE FROM manifestations');
  await env.DB.exec('DELETE FROM sessions');
  await env.DB.exec('DELETE FROM users');
});

async function signInGuest(token: string): Promise<Viewer> {
  await createGuestSession(db, { tokenHash: await hash(token), now: NOW, ttlMs: TTL_MS });
  const viewer = await findViewerBySession(db, await hash(token), NOW);
  if (!viewer) throw new Error('guest session not found');
  return viewer;
}

async function signInMember(token: string, userId: string): Promise<Viewer> {
  await env.DB.prepare(
    'insert into users (id, is_guest, email, name, created_at) values (?, 0, ?, ?, ?)',
  )
    .bind(userId, `${userId}@example.com`, '會員', NOW)
    .run();
  await createSessionForUser(db, userId, { tokenHash: await hash(token), now: NOW, ttlMs: TTL_MS });
  const viewer = await findViewerBySession(db, await hash(token), NOW);
  if (!viewer) throw new Error('member session not found');
  return viewer;
}

function complete(overrides: Partial<ManifestationInput> = {}): ManifestationInput {
  return {
    ...emptyManifestationInput(),
    wish: '每週運動三次',
    outcome: '我在公園跑完十分鐘',
    obstacle: '下班後太累',
    planIf: '我一回家就想躺下',
    planThen: '先換上跑鞋',
    steps: [{ action: '換上跑鞋', when: '下班進門後', where: '玄關' }],
    likelihood: 7,
    ...overrides,
  };
}

/** write → autosave → start → release, end to end. */
async function walkTheBuilder(viewer: Viewer, id: string) {
  const draft = await createDraft(db, viewer.userId, { wish: '每週運動' }, { id, now: NOW });
  expect(draft.status).toBe('draft');

  const autosaved = await saveManifestationInput(db, viewer.userId, id, complete(), {
    now: NOW + 1_000,
  });
  expect(autosaved.ok).toBe(true);
  expect(autosaved.ok && autosaved.value.status).toBe('draft');

  const started = await activateManifestation(db, viewer.userId, id, {}, { now: NOW + 2_000 });
  expect(started.ok && started.value).toMatchObject({ status: 'active', startedAt: NOW + 2_000 });

  const edited = await saveManifestationInput(
    db,
    viewer.userId,
    id,
    { wish: '每週運動兩次' },
    { now: NOW + 3_000 },
  );
  expect(edited.ok && edited.value).toMatchObject({ status: 'active', wish: '每週運動兩次' });

  const released = await releaseManifestation(db, viewer.userId, id, '現在不是時候', {
    now: NOW + 4_000,
  });
  expect(released.ok && released.value).toMatchObject({
    status: 'released',
    releaseNote: '現在不是時候',
    wish: '每週運動兩次',
  });

  // Letting go keeps the 顯化 — it is still there to look back on.
  await expect(getManifestation(db, viewer.userId, id)).resolves.toMatchObject({
    status: 'released',
  });
}

describe('create, edit and release', () => {
  it('works for a guest', async () => {
    const guest = await signInGuest('guest-token');
    expect(guest.isGuest).toBe(true);
    await walkTheBuilder(guest, 'guest-manifestation');
  });

  it('works for a signed-in member', async () => {
    const member = await signInMember('member-token', 'user-member');
    expect(member.isGuest).toBe(false);
    await walkTheBuilder(member, 'member-manifestation');
  });

  it('keeps a guest’s 顯化 when their guest row becomes a member (P04 sign-in)', async () => {
    const guest = await signInGuest('guest-token');
    await createDraft(db, guest.userId, complete(), { id: 'm1', now: NOW });

    // Signing in upgrades the same user row, so nothing they wrote moves or disappears.
    await env.DB.prepare('update users set is_guest = 0, email = ?, name = ? where id = ?')
      .bind('someone@example.com', '某人', guest.userId)
      .run();

    const after = await findViewerBySession(db, await hash('guest-token'), NOW + 1);
    expect(after).toEqual({ userId: guest.userId, isGuest: false });
    await expect(listManifestations(db, guest.userId)).resolves.toMatchObject([
      { id: 'm1', wish: '每週運動三次' },
    ]);
  });

  it('keeps one viewer out of another viewer’s 顯化, guest or member', async () => {
    const guest = await signInGuest('guest-token');
    const member = await signInMember('member-token', 'user-member');
    await createDraft(db, guest.userId, complete(), { id: 'guest-m', now: NOW });
    await createDraft(db, member.userId, complete(), { id: 'member-m', now: NOW });

    await expect(getManifestation(db, member.userId, 'guest-m')).resolves.toBeNull();
    await expect(getManifestation(db, guest.userId, 'member-m')).resolves.toBeNull();
    await expect(releaseManifestation(db, member.userId, 'guest-m')).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
  });
});
