// Shared test setup: two users (A and B) with their own 顯化, so every suite can
// check that B never reaches A's data.
import { env } from 'cloudflare:test';
import { createDb, type Db } from '../db/client';
import { createBoardItem } from '../repo/board-items';
import { recordCheckin } from '../repo/checkins';
import { createManifestation } from '../repo/manifestations';
import { buildMediaKey, putOwnMedia } from '../repo/media';
import { startRehearsal } from '../repo/rehearsals';
import { saveReview } from '../repo/reviews';
import { createSession, generateSessionToken } from '../repo/sessions';
import { createUser } from '../repo/users';
import type { BoardItem, Checkin, Manifestation, Rehearsal, Review, User } from '../db/schema';

export function db(): Db {
  return createDb(env.DB);
}

export function bucket(): R2Bucket {
  return env.BOARD;
}

export const DAY_ONE = '2026-11-02';

export interface Fixture {
  user: User;
  token: string;
  manifestation: Manifestation;
  checkin: Checkin;
  rehearsal: Rehearsal;
  review: Review;
  boardItem: BoardItem;
  photoKey: string;
}

let counter = 0;

/** A whole person's worth of data: user, session, 顯化, 足跡, board, photo. */
export async function makeFixture(label: string): Promise<Fixture> {
  const database = db();
  counter += 1;
  const user = await createUser(database, {
    googleSub: `google-sub-${label}-${counter}`,
    email: `${label}${counter}@example.test`,
    displayName: label,
  });

  const token = generateSessionToken();
  await createSession(database, { userId: user.id, token, userAgent: 'vitest' });

  const manifestation = await createManifestation(database, user.id, {
    wish: `${label} 的顯化：完成第一場 10 公里路跑`,
    outcome: '我在終點前還能笑著加速最後 200 公尺。',
    obstacle: '下班回到家就想先躺平。',
    ifCue: '如果下班回到家想先躺平',
    thenAction: '我就先換上跑鞋，到樓下走 5 分鐘。',
    steps: ['週一三五 19:30 慢跑 30 分鐘'],
    likelihood: 7,
    startDate: DAY_ONE,
  });

  const fileId = crypto.randomUUID();
  const photoKey = buildMediaKey(user.id, manifestation.id, fileId);
  const photoBytes = new TextEncoder().encode(`${label}-photo`);
  await putOwnMedia(bucket(), user.id, manifestation.id, photoBytes, fileId);

  const checkin = await recordCheckin(database, user.id, {
    manifestationId: manifestation.id,
    date: DAY_ONE,
    result: 'did',
    note: `${label} 跑了 30 分鐘。`,
    photoKey,
    cuesDone: ['換上跑鞋就算開始'],
  });

  const rehearsal = await startRehearsal(database, user.id, manifestation.id);

  const review = await saveReview(database, user.id, {
    manifestationId: manifestation.id,
    weekStart: DAY_ONE,
    whatWorked: '跑鞋放門口。',
    whatToChange: '加班那天改成散步。',
  });

  const boardItem = await createBoardItem(database, user.id, {
    manifestationId: manifestation.id,
    zone: 'process',
    kind: 'words',
    text: '換上跑鞋就算開始',
    colour: 'graph-blue',
    whenWhere: '回到家放下包包的時候',
  });

  return { user, token, manifestation, checkin, rehearsal, review, boardItem, photoKey };
}
