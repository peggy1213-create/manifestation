// Proves the Drizzle schema and migrations/0001_initial_schema.sql agree, and
// that the database itself refuses rows the product rules do not allow.
import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, makeFixture, type Fixture } from '../test/factories';
import { listBoardItems } from '../repo/board-items';
import { listCheckins } from '../repo/checkins';
import { createManifestation, getManifestation } from '../repo/manifestations';
import { listRehearsals } from '../repo/rehearsals';
import { listReviews } from '../repo/reviews';
import { listSessionsForUser } from '../repo/sessions';
import { deleteUser } from '../repo/users';
import { DAY_ONE } from '../test/factories';

let alice: Fixture;

beforeEach(async () => {
  alice = await makeFixture('alice');
});

async function tableNames(): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' ORDER BY name",
  ).all<{ name: string }>();
  return results.map((row) => row.name);
}

async function indexNames(): Promise<string[]> {
  const { results } = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
  ).all<{ name: string }>();
  return results.map((row) => row.name);
}

describe('migrations', () => {
  it('creates every table of the data model', async () => {
    const names = await tableNames();
    for (const table of [
      'board_items',
      'checkins',
      'manifestations',
      'rehearsals',
      'reviews',
      'sessions',
      'users',
    ]) {
      expect(names).toContain(table);
    }
  });

  it('indexes user_id and (manifestation_id, date)', async () => {
    const names = await indexNames();
    for (const index of [
      'idx_sessions_user_id',
      'idx_manifestations_user_id',
      'idx_checkins_user_id',
      'idx_checkins_manifestation_id_date',
      'idx_rehearsals_user_id',
      'idx_reviews_user_id',
      'idx_board_items_user_id',
    ]) {
      expect(names).toContain(index);
    }
  });
});

describe('constraints', () => {
  it('keeps likelihood inside 1–10', async () => {
    await expect(
      createManifestation(db(), alice.user.id, {
        wish: '不合法的可能性',
        outcome: 'x',
        obstacle: 'x',
        ifCue: 'x',
        thenAction: 'x',
        likelihood: 11,
        startDate: DAY_ONE,
      }),
    ).rejects.toThrow();
  });

  it('only allows the four statuses', async () => {
    await expect(
      env.DB.prepare('UPDATE manifestations SET status = ? WHERE id = ?')
        .bind('abandoned', alice.manifestation.id)
        .run(),
    ).rejects.toThrow();
    expect((await getManifestation(db(), alice.user.id, alice.manifestation.id))?.status).toBe(
      'active',
    );
  });

  it('only allows did / partly / not_today as a result', async () => {
    await expect(
      env.DB.prepare('UPDATE checkins SET result = ? WHERE id = ?')
        .bind('failed', alice.checkin.id)
        .run(),
    ).rejects.toThrow();
  });

  it('allows one 足跡 per 顯化 per day', async () => {
    await expect(
      env.DB.prepare(
        'INSERT INTO checkins (id, manifestation_id, user_id, date, result, cues_done) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(
          crypto.randomUUID(),
          alice.manifestation.id,
          alice.user.id,
          alice.checkin.date,
          'did',
          '[]',
        )
        .run(),
    ).rejects.toThrow();
  });

  it('requires an image key for image cards and text for words cards', async () => {
    await expect(
      env.DB.prepare(
        'INSERT INTO board_items (id, manifestation_id, user_id, zone, kind, position, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(crypto.randomUUID(), alice.manifestation.id, alice.user.id, 'why', 'image', 0, 0)
        .run(),
    ).rejects.toThrow();
  });

  it('refuses a row that points at a manifestation that is not there', async () => {
    await expect(
      env.DB.prepare(
        'INSERT INTO checkins (id, manifestation_id, user_id, date, result, cues_done) VALUES (?, ?, ?, ?, ?, ?)',
      )
        .bind(crypto.randomUUID(), crypto.randomUUID(), alice.user.id, '2026-12-01', 'did', '[]')
        .run(),
    ).rejects.toThrow();
  });
});

describe('ON DELETE CASCADE', () => {
  it('takes the whole 顯化 with it, and nothing of anyone else', async () => {
    const bob = await makeFixture('bob');

    await env.DB.prepare('DELETE FROM manifestations WHERE id = ?')
      .bind(alice.manifestation.id)
      .run();

    expect(await listCheckins(db(), alice.user.id, alice.manifestation.id)).toEqual([]);
    expect(await listRehearsals(db(), alice.user.id, alice.manifestation.id)).toEqual([]);
    expect(await listReviews(db(), alice.user.id, alice.manifestation.id)).toEqual([]);
    expect(await listBoardItems(db(), alice.user.id, alice.manifestation.id)).toEqual([]);

    expect(await listCheckins(db(), bob.user.id, bob.manifestation.id)).toHaveLength(1);
    expect(await listBoardItems(db(), bob.user.id, bob.manifestation.id)).toHaveLength(1);
  });

  it('deleting the account clears everything that belonged to it', async () => {
    const bob = await makeFixture('bob');

    expect(await deleteUser(db(), alice.user.id)).toBe(true);

    expect(await getManifestation(db(), alice.user.id, alice.manifestation.id)).toBeNull();
    expect(await listSessionsForUser(db(), alice.user.id)).toEqual([]);
    expect(await listCheckins(db(), alice.user.id, alice.manifestation.id)).toEqual([]);

    const { results } = await env.DB.prepare('SELECT COUNT(*) AS n FROM checkins WHERE user_id = ?')
      .bind(alice.user.id)
      .all<{ n: number }>();
    expect(results[0]?.n).toBe(0);

    // Bob is untouched.
    expect(await listCheckins(db(), bob.user.id, bob.manifestation.id)).toHaveLength(1);
    expect(await listSessionsForUser(db(), bob.user.id)).toHaveLength(1);
  });
});
