import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import seedSql from '../../../../seeds/sample-manifestation.sql?raw';
import { db, makeFixture } from '../test/factories';
import { listBoardItems } from '../repo/board-items';
import { listCheckins } from '../repo/checkins';
import { countCompletedRehearsals } from '../repo/rehearsals';
import { getReviewByWeek } from '../repo/reviews';
import {
  SAMPLE_BOARD_ITEMS,
  SAMPLE_CHECKINS,
  SAMPLE_IDS,
  SAMPLE_MANIFESTATION,
  SAMPLE_REHEARSALS,
  SAMPLE_REVIEW,
  SAMPLE_START_DATE,
  seedSampleManifestation,
} from './sample-manifestation';

describe('the 10K run sample 顯化', () => {
  it('seeds a whole 顯化 for one user through the ordinary repo functions', async () => {
    const { user } = await makeFixture('seeded');
    const manifestation = await seedSampleManifestation(db(), user.id);

    expect(manifestation.wish).toBe(SAMPLE_MANIFESTATION.wish);
    expect(manifestation.steps).toHaveLength(SAMPLE_MANIFESTATION.steps.length);
    expect(manifestation.likelihood).toBe(SAMPLE_MANIFESTATION.likelihood);
    expect(manifestation.startDate).toBe(SAMPLE_START_DATE);
    expect(manifestation.status).toBe('active');

    const board = await listBoardItems(db(), user.id, manifestation.id);
    expect(board).toHaveLength(SAMPLE_BOARD_ITEMS.length);

    const process = board.filter((item) => item.zone === 'process');
    const why = board.filter((item) => item.zone === 'why');
    // Process over outcome: the 顯化板 gives most space to repeatable steps.
    expect(process.length).toBeGreaterThan(why.length);
    expect(process.map((item) => item.position)).toEqual([0, 1, 2, 3]);

    const checkins = await listCheckins(db(), user.id, manifestation.id);
    expect(checkins.map((c) => c.result)).toEqual(SAMPLE_CHECKINS.map((c) => c.result));
    expect(checkins.map((c) => c.date)).toEqual([
      '2026-11-02',
      '2026-11-04',
      '2026-11-06',
      '2026-11-08',
    ]);
    // A missed day is recorded as a neutral fact, not an absence.
    expect(checkins.some((c) => c.result === 'not_today')).toBe(true);

    expect(await countCompletedRehearsals(db(), user.id, manifestation.id)).toBe(
      SAMPLE_REHEARSALS.length,
    );
    const review = await getReviewByWeek(db(), user.id, manifestation.id, SAMPLE_START_DATE);
    expect(review?.whatWorked).toBe(SAMPLE_REVIEW.whatWorked);
  });

  it('keeps the WOOP copy evidence-based: no 目標, no universe talk', async () => {
    const banned = ['目標', '達成', '宇宙', '吸引', '頻率', '任務', '打卡', '失敗', '進度'];
    const copy = [
      SAMPLE_MANIFESTATION.wish,
      SAMPLE_MANIFESTATION.outcome,
      SAMPLE_MANIFESTATION.obstacle,
      SAMPLE_MANIFESTATION.ifCue,
      SAMPLE_MANIFESTATION.thenAction,
      ...SAMPLE_MANIFESTATION.steps,
      ...SAMPLE_BOARD_ITEMS.map((item) => item.text),
      ...SAMPLE_CHECKINS.map((item) => item.note),
      SAMPLE_REVIEW.whatWorked,
      SAMPLE_REVIEW.whatToChange,
    ].join('\n');

    for (const word of banned) expect(copy).not.toContain(word);
    // The outcome never stands alone: it is followed by the obstacle and an
    // if-then plan.
    expect(SAMPLE_MANIFESTATION.ifCue.startsWith('如果')).toBe(true);
    expect(SAMPLE_MANIFESTATION.thenAction.startsWith('我就')).toBe(true);
  });

  it('stays in step with seeds/sample-manifestation.sql', () => {
    // The SQL file is what `wrangler d1 execute` applies locally; this module is
    // what the app and the tests use. They must describe the same sample.
    expect(seedSql).toContain(SAMPLE_IDS.user);
    expect(seedSql).toContain(SAMPLE_IDS.manifestation);
    expect(seedSql).toContain(`'${SAMPLE_START_DATE}'`);
    expect(seedSql).toContain(SAMPLE_MANIFESTATION.wish);
    expect(seedSql).toContain(SAMPLE_MANIFESTATION.outcome);
    expect(seedSql).toContain(SAMPLE_MANIFESTATION.obstacle);
    expect(seedSql).toContain(SAMPLE_MANIFESTATION.ifCue);
    expect(seedSql).toContain(SAMPLE_MANIFESTATION.thenAction);
    expect(seedSql).toContain(`${SAMPLE_MANIFESTATION.likelihood},`);
    for (const step of SAMPLE_MANIFESTATION.steps) expect(seedSql).toContain(step);
    for (const item of SAMPLE_BOARD_ITEMS) expect(seedSql).toContain(item.text);
    for (const checkin of SAMPLE_CHECKINS) expect(seedSql).toContain(checkin.note);
    expect(seedSql).toContain(SAMPLE_REVIEW.whatWorked);
    expect(seedSql).toContain(SAMPLE_REVIEW.whatToChange);
  });

  it('applies the SQL seed to D1 as written', async () => {
    // Same statements `wrangler d1 execute --file=` would run.
    const statements = seedSql
      .split(';')
      .map((part) => part.replace(/--[^\n]*/g, '').trim())
      .filter((part) => part.length > 0);

    for (const statement of statements) await env.DB.prepare(statement).run();

    const row = await env.DB.prepare('SELECT wish, start_date FROM manifestations WHERE id = ?')
      .bind(SAMPLE_IDS.manifestation)
      .first<{ wish: string; start_date: string }>();
    expect(row?.wish).toBe(SAMPLE_MANIFESTATION.wish);
    expect(row?.start_date).toBe(SAMPLE_START_DATE);

    const board = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM board_items WHERE manifestation_id = ?',
    )
      .bind(SAMPLE_IDS.manifestation)
      .first<{ n: number }>();
    expect(board?.n).toBe(SAMPLE_BOARD_ITEMS.length);

    // Re-running the seed is safe.
    for (const statement of statements) await env.DB.prepare(statement).run();
    const again = await env.DB.prepare(
      'SELECT COUNT(*) AS n FROM checkins WHERE manifestation_id = ?',
    )
      .bind(SAMPLE_IDS.manifestation)
      .first<{ n: number }>();
    expect(again?.n).toBe(SAMPLE_CHECKINS.length);
  });
});
