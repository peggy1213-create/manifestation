import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { emptyManifestationInput, type ManifestationInput } from '../index';
import {
  activateManifestation,
  createDb,
  createDraft,
  createGuestSession,
  getManifestation,
  listManifestations,
  releaseManifestation,
  saveManifestationInput,
  type Db,
} from './index';

const NOW = 1_764_000_000_000;
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

function completeInput(overrides: Partial<ManifestationInput> = {}): ManifestationInput {
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

let db: Db;

async function guest(suffix: string): Promise<string> {
  const { userId } = await createGuestSession(db, {
    tokenHash: `hash-${suffix}`,
    userId: `user-${suffix}`,
    now: NOW,
    ttlMs: TTL_MS,
  });
  return userId;
}

beforeEach(async () => {
  db = createDb(env.DB);
  await env.DB.exec('DELETE FROM manifestations');
  await env.DB.exec('DELETE FROM sessions');
  await env.DB.exec('DELETE FROM users');
});

describe('createDraft', () => {
  it('stores a blank draft a guest can come back to', async () => {
    const userId = await guest('a');
    const draft = await createDraft(
      db,
      userId,
      { wish: '  每週運動三次 ' },
      { id: 'm1', now: NOW },
    );

    expect(draft).toMatchObject({
      id: 'm1',
      userId,
      status: 'draft',
      wish: '每週運動三次',
      likelihood: null,
      createdAt: NOW,
      updatedAt: NOW,
      startedAt: null,
      releasedAt: null,
    });

    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({
      wish: '每週運動三次',
    });
  });

  it('round-trips 過程步驟 through storage', async () => {
    const userId = await guest('a');
    const steps = [
      { action: '換上跑鞋', when: '下班進門後', where: '玄關' },
      { action: '走到公園', when: '七點', where: '大安森林公園' },
    ];
    await createDraft(db, userId, { steps }, { id: 'm1', now: NOW });

    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({ steps });
  });
});

describe('saveManifestationInput', () => {
  it('autosaves a half-written draft without complaining', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, {}, { id: 'm1', now: NOW });

    const saved = await saveManifestationInput(
      db,
      userId,
      'm1',
      { wish: '每週運動三次', obstacle: '太累' },
      { now: NOW + 5_000 },
    );

    expect(saved.ok).toBe(true);
    expect(saved.ok && saved.value).toMatchObject({
      wish: '每週運動三次',
      obstacle: '太累',
      status: 'draft',
      updatedAt: NOW + 5_000,
    });
  });

  it('leaves untouched fields alone', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, { wish: '每週運動三次' }, { id: 'm1', now: NOW });
    await saveManifestationInput(db, userId, 'm1', { obstacle: '太累' }, { now: NOW + 1 });

    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({
      wish: '每週運動三次',
      obstacle: '太累',
    });
  });

  it('refuses to edit a released 顯化', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });
    await releaseManifestation(db, userId, 'm1', '', { now: NOW + 1 });

    await expect(saveManifestationInput(db, userId, 'm1', { wish: '改一下' })).resolves.toEqual({
      ok: false,
      reason: 'released',
    });
  });
});

describe('activateManifestation', () => {
  it('starts the path once the 顯化 is complete', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, {}, { id: 'm1', now: NOW });

    const result = await activateManifestation(db, userId, 'm1', completeInput(), {
      now: NOW + 60_000,
    });

    expect(result.ok).toBe(true);
    expect(result.ok && result.value).toMatchObject({
      status: 'active',
      startedAt: NOW + 60_000,
      wish: '每週運動三次',
      likelihood: 7,
    });
  });

  it('reports what is still missing instead of saving half a 顯化', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, {}, { id: 'm1', now: NOW });

    const result = await activateManifestation(db, userId, 'm1', completeInput({ planThen: '' }));

    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    expect(!result.ok && result.reason === 'invalid' && result.issues).toEqual([
      expect.objectContaining({ field: 'planThen', code: 'required' }),
    ]);
    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({ status: 'draft' });
  });

  it('drops step rows with no 小行動 as it activates', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, {}, { id: 'm1', now: NOW });

    const result = await activateManifestation(
      db,
      userId,
      'm1',
      completeInput({
        steps: [
          { action: '換上跑鞋', when: '下班後', where: '玄關' },
          { action: '', when: '早上', where: '家裡' },
        ],
      }),
      { now: NOW },
    );

    expect(result.ok && result.value.steps).toEqual([
      { action: '換上跑鞋', when: '下班後', where: '玄關' },
    ]);
  });

  it('never restarts day 1 when an active 顯化 is edited', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, {}, { id: 'm1', now: NOW });
    await activateManifestation(db, userId, 'm1', completeInput(), { now: NOW });

    const edited = await activateManifestation(
      db,
      userId,
      'm1',
      { wish: '每週運動兩次' },
      { now: NOW + 10 * 24 * 60 * 60 * 1000 },
    );

    expect(edited.ok && edited.value).toMatchObject({ startedAt: NOW, wish: '每週運動兩次' });
  });
});

describe('releaseManifestation', () => {
  it('keeps the 顯化 with its note and its date', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });

    const released = await releaseManifestation(db, userId, 'm1', ' 現在不是時候 ', {
      now: NOW + 1_000,
    });

    expect(released.ok && released.value).toMatchObject({
      status: 'released',
      releasedAt: NOW + 1_000,
      releaseNote: '現在不是時候',
      wish: '每週運動三次',
    });
  });

  it('needs no note', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });

    const released = await releaseManifestation(db, userId, 'm1');
    expect(released.ok && released.value.releaseNote).toBeNull();
  });

  it('releases a draft too — letting go of an unfinished 顯化 still counts', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, { wish: '半成品' }, { id: 'm1', now: NOW });

    const released = await releaseManifestation(db, userId, 'm1', '', { now: NOW + 1 });
    expect(released.ok && released.value.status).toBe('released');
  });

  it('only happens once', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });
    await releaseManifestation(db, userId, 'm1', '', { now: NOW });

    await expect(releaseManifestation(db, userId, 'm1')).resolves.toEqual({
      ok: false,
      reason: 'released',
    });
  });

  it('rejects an over-long note', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });

    const result = await releaseManifestation(db, userId, 'm1', '字'.repeat(400));

    expect(result).toMatchObject({ ok: false, reason: 'invalid' });
    await expect(getManifestation(db, userId, 'm1')).resolves.toMatchObject({ status: 'draft' });
  });
});

describe('listManifestations', () => {
  it('returns only this user’s 顯化, newest first', async () => {
    const [a, b] = [await guest('a'), await guest('b')];
    await createDraft(db, a, { wish: '舊的' }, { id: 'm1', now: NOW });
    await createDraft(db, a, { wish: '新的' }, { id: 'm2', now: NOW + 1_000 });
    await createDraft(db, b, { wish: '別人的' }, { id: 'm3', now: NOW + 2_000 });

    const mine = await listManifestations(db, a);
    expect(mine.map((m) => m.wish)).toEqual(['新的', '舊的']);
  });

  it('can filter by status', async () => {
    const userId = await guest('a');
    await createDraft(db, userId, completeInput(), { id: 'm1', now: NOW });
    await createDraft(db, userId, {}, { id: 'm2', now: NOW });
    await activateManifestation(db, userId, 'm1', {}, { now: NOW });

    const active = await listManifestations(db, userId, { statuses: ['active'] });
    expect(active.map((m) => m.id)).toEqual(['m1']);
  });
});

describe('user scoping', () => {
  it('does not let user B read user A’s 顯化', async () => {
    const [a, b] = [await guest('a'), await guest('b')];
    await createDraft(db, a, { wish: '只有 A 看得到' }, { id: 'm1', now: NOW });

    await expect(getManifestation(db, b, 'm1')).resolves.toBeNull();
    await expect(listManifestations(db, b)).resolves.toEqual([]);
  });

  it('does not let user B write, activate or release user A’s 顯化', async () => {
    const [a, b] = [await guest('a'), await guest('b')];
    await createDraft(db, a, completeInput(), { id: 'm1', now: NOW });

    await expect(saveManifestationInput(db, b, 'm1', { wish: '被改掉' })).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
    await expect(activateManifestation(db, b, 'm1', {})).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });
    await expect(releaseManifestation(db, b, 'm1')).resolves.toEqual({
      ok: false,
      reason: 'notFound',
    });

    await expect(getManifestation(db, a, 'm1')).resolves.toMatchObject({
      wish: '每週運動三次',
      status: 'draft',
    });
  });
});
