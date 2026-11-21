// 記下今天: one footprint per 顯化 per day, editable, and kind about missed days.
import { beforeEach, describe, expect, it } from 'vitest';
import { db, makeFixture, type Fixture } from '../test/factories';
import { getCheckinByDate, listCheckins, recordCheckin } from './checkins';

let alice: Fixture;

beforeEach(async () => {
  alice = await makeFixture('alice');
});

describe('recordCheckin', () => {
  it('writes the same day again instead of adding a second row', async () => {
    const edited = await recordCheckin(db(), alice.user.id, {
      manifestationId: alice.manifestation.id,
      date: alice.checkin.date,
      result: 'partly',
      note: '只走到樓下，但有出門。',
      cuesDone: ['換上跑鞋就算開始'],
    });

    expect(edited.id).toBe(alice.checkin.id);
    expect(edited.result).toBe('partly');
    expect(await listCheckins(db(), alice.user.id, alice.manifestation.id)).toHaveLength(1);
  });

  it('records 今天沒做到 as an ordinary row, with no penalty field', async () => {
    const notToday = await recordCheckin(db(), alice.user.id, {
      manifestationId: alice.manifestation.id,
      date: '2026-11-06',
      result: 'not_today',
      note: '加班到九點。',
    });

    expect(notToday.result).toBe('not_today');
    expect(notToday.cuesDone).toEqual([]);
    expect(Object.keys(notToday).sort()).toEqual([
      'cuesDone',
      'date',
      'id',
      'manifestationId',
      'note',
      'photoKey',
      'result',
      'userId',
    ]);
  });

  it('keeps cues_done as a JSON array round-trip', async () => {
    const cues = ['換上跑鞋就算開始', '先熱身 5 分鐘'];
    await recordCheckin(db(), alice.user.id, {
      manifestationId: alice.manifestation.id,
      date: '2026-11-04',
      result: 'did',
      cuesDone: cues,
    });

    const stored = await getCheckinByDate(
      db(),
      alice.user.id,
      alice.manifestation.id,
      '2026-11-04',
    );
    expect(stored?.cuesDone).toEqual(cues);
  });

  it('lists a date range, oldest first, with missed days simply absent', async () => {
    await recordCheckin(db(), alice.user.id, {
      manifestationId: alice.manifestation.id,
      date: '2026-11-04',
      result: 'partly',
    });
    await recordCheckin(db(), alice.user.id, {
      manifestationId: alice.manifestation.id,
      date: '2026-11-08',
      result: 'did',
    });

    const week = await listCheckins(db(), alice.user.id, alice.manifestation.id, {
      from: '2026-11-02',
      to: '2026-11-06',
    });
    expect(week.map((c) => c.date)).toEqual(['2026-11-02', '2026-11-04']);
  });
});
