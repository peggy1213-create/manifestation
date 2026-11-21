// Seed data: one sample 顯化 — the 10K run from the prototype.
// Shared by the local D1 seed (seeds/sample-manifestation.sql) and by tests.
// Process over outcome: the 顯化板 has one 'why' card and four 'process' cards.

import type { Db } from '../db/client';
import type { BoardKind, BoardZone, CheckinResult, Manifestation } from '../db/schema';
import { createBoardItem } from '../repo/board-items';
import { recordCheckin } from '../repo/checkins';
import { createManifestation } from '../repo/manifestations';
import { startRehearsal, completeRehearsal } from '../repo/rehearsals';
import { saveReview } from '../repo/reviews';

/** Fixed ids so the SQL seed and this module describe the same sample. */
export const SAMPLE_IDS = {
  user: '3d279fbe-7e50-40c8-ad5b-049e996258d8',
  manifestation: '1aa20484-0212-4c45-91b9-a6566a14ff85',
} as const;

export const SAMPLE_START_DATE = '2026-11-02';

export const SAMPLE_MANIFESTATION = {
  wish: '今年完成第一場 10 公里路跑',
  outcome: '我在 10 公里的終點前還能笑著加速最後 200 公尺，呼吸是穩的，腳步也還有力。',
  obstacle: '下班回到家就累了，很想先躺在沙發上滑手機，然後天就黑了。',
  ifCue: '如果下班回到家想先躺平',
  thenAction: '我就先換上跑鞋，到樓下走 5 分鐘，再決定今天要跑多久。',
  steps: [
    '週一三五 19:30 樓下慢跑 30 分鐘',
    '出門前先做 5 分鐘熱身',
    '週日早上跑長距離，每兩週多加 1 公里',
    '跑完記下今天的一句話',
  ],
  likelihood: 7,
} as const;

export interface SampleBoardItem {
  zone: BoardZone;
  kind: BoardKind;
  text: string;
  colour: string;
  whenWhere: string | null;
}

export const SAMPLE_BOARD_ITEMS: readonly SampleBoardItem[] = [
  {
    zone: 'why',
    kind: 'words',
    text: '穩穩地跑完，不是跑贏誰',
    colour: 'highlighter',
    whenWhere: null,
  },
  {
    zone: 'process',
    kind: 'words',
    text: '換上跑鞋就算開始',
    colour: 'graph-blue',
    whenWhere: '回到家放下包包的時候',
  },
  {
    zone: 'process',
    kind: 'words',
    text: '慢跑 30 分鐘',
    colour: 'graph-blue',
    whenWhere: '週一三五 19:30 樓下',
  },
  {
    zone: 'process',
    kind: 'words',
    text: '先熱身 5 分鐘',
    colour: 'ink',
    whenWhere: '每次出門前',
  },
  {
    zone: 'process',
    kind: 'words',
    text: '跑完記下今天的一句話',
    colour: 'coral',
    whenWhere: '洗澡前',
  },
] as const;

export interface SampleCheckin {
  /** Days after start_date. */
  dayOffset: number;
  result: CheckinResult;
  note: string;
  cuesDone: readonly string[];
}

/** A kind week: two done, one partly, one 今天沒做到 — all neutral facts. */
export const SAMPLE_CHECKINS: readonly SampleCheckin[] = [
  {
    dayOffset: 0,
    result: 'did',
    note: '跑了 32 分鐘，最後一段還能加速。',
    cuesDone: ['換上跑鞋就算開始', '先熱身 5 分鐘'],
  },
  {
    dayOffset: 2,
    result: 'partly',
    note: '只走到樓下走了 10 分鐘，但有出門。',
    cuesDone: ['換上跑鞋就算開始'],
  },
  { dayOffset: 4, result: 'not_today', note: '加班到九點，今天沒做到。', cuesDone: [] },
  {
    dayOffset: 6,
    result: 'did',
    note: '早上跑了 6 公里，比上週多 1 公里。',
    cuesDone: ['換上跑鞋就算開始', '先熱身 5 分鐘', '跑完記下今天的一句話'],
  },
] as const;

/** Rehearsal is a practice, not a one-off: two 3-minute sessions in week one. */
export const SAMPLE_REHEARSALS: readonly { dayOffset: number; hourUtc: number }[] = [
  { dayOffset: 0, hourUtc: 13 },
  { dayOffset: 6, hourUtc: 1 },
] as const;

export const SAMPLE_REVIEW = {
  /** Days after start_date; the Monday of week one. */
  dayOffset: 0,
  whatWorked: '把跑鞋放在門口，回家看到就會換。',
  whatToChange: '加班的日子改成下樓走 10 分鐘，不用跑。',
} as const;

function addDays(date: string, days: number): string {
  const day = new Date(`${date}T00:00:00Z`);
  day.setUTCDate(day.getUTCDate() + days);
  return day.toISOString().slice(0, 10);
}

export interface SeedSampleOptions {
  startDate?: string;
  now?: Date;
}

/**
 * Writes the sample 顯化 for one user through the ordinary repo functions, so
 * the seed can never create a row the app itself could not create.
 */
export async function seedSampleManifestation(
  db: Db,
  userId: string,
  options: SeedSampleOptions = {},
): Promise<Manifestation> {
  const startDate = options.startDate ?? SAMPLE_START_DATE;
  const now = options.now ?? new Date();

  const manifestation = await createManifestation(
    db,
    userId,
    { ...SAMPLE_MANIFESTATION, steps: [...SAMPLE_MANIFESTATION.steps], startDate },
    now,
  );

  for (const item of SAMPLE_BOARD_ITEMS) {
    await createBoardItem(db, userId, { manifestationId: manifestation.id, ...item }, now);
  }

  for (const checkin of SAMPLE_CHECKINS) {
    await recordCheckin(db, userId, {
      manifestationId: manifestation.id,
      date: addDays(startDate, checkin.dayOffset),
      result: checkin.result,
      note: checkin.note,
      cuesDone: [...checkin.cuesDone],
    });
  }

  for (const session of SAMPLE_REHEARSALS) {
    const startedAt = new Date(`${addDays(startDate, session.dayOffset)}T00:00:00Z`);
    startedAt.setUTCHours(session.hourUtc, 10);
    const rehearsal = await startRehearsal(db, userId, manifestation.id, startedAt);
    await completeRehearsal(db, userId, rehearsal.id);
  }

  await saveReview(db, userId, {
    manifestationId: manifestation.id,
    weekStart: addDays(startDate, SAMPLE_REVIEW.dayOffset),
    whatWorked: SAMPLE_REVIEW.whatWorked,
    whatToChange: SAMPLE_REVIEW.whatToChange,
  });

  return manifestation;
}
