import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { createDatabase, type Database } from '../db/client';
import {
  checkinCues,
  checkins,
  manifestations,
  processSteps,
  rehearsals,
  users,
} from '../db/schema';
import {
  listCheckins,
  saveCheckin,
  listCompletedRehearsalDays,
  findCheckinForDay,
} from './checkins';
import {
  createManifestation,
  findManifestation,
  getManifestation,
  listManifestations,
  listProcessSteps,
} from './manifestations';
import { upsertUserByEmail } from './users';
import { createSession, deleteSession, extendSession, findUserBySessionHash } from './sessions';
import { NotFoundError } from './errors';

const NOW = 1_800_000_000_000;

let db: Database;

/**
 * Two people with a 顯化 each. Every assertion below asks one of them for the
 * other's data; D1 has no row-level security, so the repo functions are the only
 * thing standing between them.
 */
async function seed() {
  db = createDatabase(env.DB);

  await db.delete(checkinCues);
  await db.delete(checkins);
  await db.delete(rehearsals);
  await db.delete(processSteps);
  await db.delete(manifestations);
  await db.delete(users);

  await db.insert(users).values([
    { id: 'user-a', email: 'a@example.test', timeZone: 'Asia/Taipei', createdAt: NOW },
    { id: 'user-b', email: 'b@example.test', timeZone: 'Asia/Taipei', createdAt: NOW },
  ]);

  await db.insert(manifestations).values([
    {
      id: 'm-a',
      userId: 'user-a',
      wish: '每天走路',
      outcome: '走到河邊看夕陽',
      obstacle: '下班就癱在沙發上',
      planIf: '如果我下班想躺下',
      planThen: '我就先換上鞋子走到巷口',
      startedOn: '2026-01-01',
      timeZone: 'Asia/Taipei',
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
    {
      id: 'm-b',
      userId: 'user-b',
      wish: '每天寫三行',
      outcome: '寫完一本筆記',
      obstacle: '晚上太想滑手機',
      planIf: '如果我拿起手機',
      planThen: '我就先翻開筆記本',
      startedOn: '2026-01-01',
      timeZone: 'Asia/Taipei',
      archivedAt: null,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ]);

  await db.insert(processSteps).values([
    {
      id: 'step-a1',
      manifestationId: 'm-a',
      userId: 'user-a',
      body: '換上鞋子',
      position: 1,
      isCue: 1,
      createdAt: NOW,
    },
    {
      id: 'step-a2',
      manifestationId: 'm-a',
      userId: 'user-a',
      body: '走到巷口',
      position: 2,
      isCue: 1,
      createdAt: NOW,
    },
    {
      id: 'step-a3',
      manifestationId: 'm-a',
      userId: 'user-a',
      body: '記下一句話',
      position: 3,
      isCue: 0,
      createdAt: NOW,
    },
    {
      id: 'step-b1',
      manifestationId: 'm-b',
      userId: 'user-b',
      body: '翻開筆記本',
      position: 1,
      isCue: 1,
      createdAt: NOW,
    },
  ]);
}

beforeEach(seed);

describe('manifestation repo', () => {
  it('returns a 顯化 to the person it belongs to', async () => {
    const found = await getManifestation(db, 'user-a', 'm-a');
    expect(found.wish).toBe('每天走路');
    expect(found.startedOn).toBe('2026-01-01');
  });

  it('does not let user B read user A data', async () => {
    expect(await findManifestation(db, 'user-b', 'm-a')).toBeNull();
    await expect(getManifestation(db, 'user-b', 'm-a')).rejects.toThrow(NotFoundError);
    // Someone else's 顯化 is indistinguishable from one that does not exist.
    await expect(getManifestation(db, 'user-b', 'no-such-id')).rejects.toThrow(NotFoundError);
  });

  it('lists only the asking user own 顯化', async () => {
    expect((await listManifestations(db, 'user-a')).map((m) => m.id)).toEqual(['m-a']);
    expect((await listManifestations(db, 'user-b')).map((m) => m.id)).toEqual(['m-b']);
  });

  it('does not let user B read user A process steps', async () => {
    expect((await listProcessSteps(db, 'user-a', 'm-a')).map((s) => s.id)).toEqual([
      'step-a1',
      'step-a2',
      'step-a3',
    ]);
    expect(await listProcessSteps(db, 'user-b', 'm-a')).toEqual([]);
  });
});

describe('check-in repo', () => {
  it('records a day and reads it back with its cues', async () => {
    const saved = await saveCheckin(
      db,
      'user-a',
      {
        manifestationId: 'm-a',
        dayDate: '2026-01-02',
        status: 'partial',
        note: '  只走到巷口  ',
        cueStepIds: ['step-a1'],
        clientId: 'outbox-1',
      },
      NOW,
    );

    expect(saved.note).toBe('只走到巷口');
    expect(saved.cueStepIds).toEqual(['step-a1']);

    const all = await listCheckins(db, 'user-a', 'm-a');
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ dayDate: '2026-01-02', status: 'partial', note: '只走到巷口' });
    expect(all[0]?.cueStepIds).toEqual(['step-a1']);
  });

  it('keeps one check-in per day, so a replayed outbox entry does not duplicate it', async () => {
    const first = await saveCheckin(
      db,
      'user-a',
      {
        manifestationId: 'm-a',
        dayDate: '2026-01-02',
        status: 'partial',
        cueStepIds: ['step-a1'],
        clientId: 'outbox-1',
      },
      NOW,
    );
    const replayed = await saveCheckin(
      db,
      'user-a',
      {
        manifestationId: 'm-a',
        dayDate: '2026-01-02',
        status: 'partial',
        cueStepIds: ['step-a1'],
        clientId: 'outbox-1',
      },
      NOW + 1000,
    );

    expect(replayed.id).toBe(first.id);
    expect(await listCheckins(db, 'user-a', 'm-a')).toHaveLength(1);
  });

  it('replaces the day when it is recorded again', async () => {
    await saveCheckin(
      db,
      'user-a',
      { manifestationId: 'm-a', dayDate: '2026-01-02', status: 'missed', cueStepIds: [] },
      NOW,
    );
    await saveCheckin(
      db,
      'user-a',
      {
        manifestationId: 'm-a',
        dayDate: '2026-01-02',
        status: 'done',
        note: '後來還是走了',
        photoKey: 'users/user-a/manifestations/m-a/checkins/2026-01-02.jpg',
        cueStepIds: ['step-a1', 'step-a2'],
      },
      NOW + 1000,
    );

    const day = await findCheckinForDay(db, 'user-a', 'm-a', '2026-01-02');
    expect(day).toMatchObject({ status: 'done', note: '後來還是走了' });
    expect(day?.cueStepIds.sort()).toEqual(['step-a1', 'step-a2']);
    expect(await listCheckins(db, 'user-a', 'm-a')).toHaveLength(1);
  });

  it('refuses to record against another user 顯化, and writes nothing', async () => {
    await expect(
      saveCheckin(
        db,
        'user-b',
        { manifestationId: 'm-a', dayDate: '2026-01-02', status: 'done', cueStepIds: ['step-a1'] },
        NOW,
      ),
    ).rejects.toThrow(NotFoundError);

    expect(await listCheckins(db, 'user-a', 'm-a')).toEqual([]);
  });

  it('drops cue ids that belong to someone else 顯化', async () => {
    const saved = await saveCheckin(
      db,
      'user-a',
      {
        manifestationId: 'm-a',
        dayDate: '2026-01-02',
        status: 'done',
        cueStepIds: ['step-a1', 'step-b1'],
      },
      NOW,
    );

    expect(saved.cueStepIds).toEqual(['step-a1']);
  });

  it('does not let user B read user A check-ins', async () => {
    await saveCheckin(
      db,
      'user-a',
      { manifestationId: 'm-a', dayDate: '2026-01-02', status: 'done', note: '私密筆記' },
      NOW,
    );

    expect(await listCheckins(db, 'user-b', 'm-a')).toEqual([]);
    expect(await findCheckinForDay(db, 'user-b', 'm-a', '2026-01-02')).toBeNull();
  });

  it('rejects a day that is not a calendar date', async () => {
    await expect(
      saveCheckin(
        db,
        'user-a',
        { manifestationId: 'm-a', dayDate: '2026-1-2', status: 'done' },
        NOW,
      ),
    ).rejects.toThrow(TypeError);
  });

  it('counts only the asking user completed rehearsals', async () => {
    await db.insert(rehearsals).values([
      {
        id: 'r1',
        manifestationId: 'm-a',
        userId: 'user-a',
        dayDate: '2026-01-01',
        seconds: 180,
        completed: 1,
        createdAt: NOW,
      },
      {
        id: 'r2',
        manifestationId: 'm-a',
        userId: 'user-a',
        dayDate: '2026-01-02',
        seconds: 40,
        completed: 0,
        createdAt: NOW,
      },
      {
        id: 'r3',
        manifestationId: 'm-b',
        userId: 'user-b',
        dayDate: '2026-01-01',
        seconds: 180,
        completed: 1,
        createdAt: NOW,
      },
    ]);

    expect(await listCompletedRehearsalDays(db, 'user-a', 'm-a')).toEqual(['2026-01-01']);
    expect(await listCompletedRehearsalDays(db, 'user-b', 'm-a')).toEqual([]);
  });
});

describe('session repo', () => {
  it('finds a user by the hash of their cookie token, while it is valid', async () => {
    await createSession(db, { tokenHash: 'hash-a', userId: 'user-a', expiresAt: NOW + 1000 }, NOW);

    expect(await findUserBySessionHash(db, 'hash-a', NOW)).toMatchObject({
      id: 'user-a',
      email: 'a@example.test',
      timeZone: 'Asia/Taipei',
    });
    expect(await findUserBySessionHash(db, 'hash-a', NOW + 2000)).toBeNull();
    expect(await findUserBySessionHash(db, 'unknown-hash', NOW)).toBeNull();
  });

  it('extends and deletes a session', async () => {
    await createSession(db, { tokenHash: 'hash-a', userId: 'user-a', expiresAt: NOW + 1000 }, NOW);

    await extendSession(db, 'hash-a', NOW + 10_000);
    expect(await findUserBySessionHash(db, 'hash-a', NOW + 5000)).not.toBeNull();

    await deleteSession(db, 'hash-a');
    expect(await findUserBySessionHash(db, 'hash-a', NOW)).toBeNull();
  });
});

describe('writing a 顯化', () => {
  it('creates it with its 小行動, owned by the asking user', async () => {
    const created = await createManifestation(
      db,
      'user-a',
      {
        wish: '每天讀十頁',
        outcome: '讀完架上那本書',
        obstacle: '一回家就打開影片',
        planIf: '如果我想打開影片',
        planThen: '我就先讀十頁',
        startedOn: '2026-02-01',
        steps: [{ body: '把書放在沙發上' }, { body: '讀十頁' }, { body: '記一句話', isCue: false }],
      },
      NOW,
    );

    expect(created.userId).toBe('user-a');
    const steps = await listProcessSteps(db, 'user-a', created.id);
    expect(steps.map((s) => [s.position, s.body, s.isCue])).toEqual([
      [1, '把書放在沙發上', true],
      [2, '讀十頁', true],
      [3, '記一句話', false],
    ]);

    // And it is invisible to anyone else.
    expect(await findManifestation(db, 'user-b', created.id)).toBeNull();
    expect(await listProcessSteps(db, 'user-b', created.id)).toEqual([]);
  });
});

describe('user repo', () => {
  it('creates a person once and finds them again by email', async () => {
    const first = await upsertUserByEmail(
      db,
      { email: 'New@Example.test', displayName: '小雨' },
      NOW,
    );
    expect(first.email).toBe('new@example.test');
    expect(first.timeZone).toBe('Asia/Taipei');

    const again = await upsertUserByEmail(db, { email: 'new@example.test' }, NOW);
    expect(again.id).toBe(first.id);
    expect(again.displayName).toBe('小雨');
  });

  it('refuses an empty email', async () => {
    await expect(upsertUserByEmail(db, { email: '   ' }, NOW)).rejects.toThrow(TypeError);
  });
});
