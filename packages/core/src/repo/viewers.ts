// Who is writing? A viewer is either a guest or a signed-in member. Both are rows in users,
// so a guest who signs in later (P04) keeps every 顯化 they already wrote.

import { and, eq, gt, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { sessions, users } from '../db/schema';

export interface Viewer {
  userId: string;
  isGuest: boolean;
}

export interface CreateSessionInput {
  /** SHA-256 hash of the session token. The token itself never reaches this layer. */
  tokenHash: string;
  userId?: string;
  now?: number;
  ttlMs: number;
}

/** Create a guest user and a session for it, in that order. */
export async function createGuestSession(db: Db, input: CreateSessionInput): Promise<Viewer> {
  const now = input.now ?? Date.now();
  const userId = input.userId ?? crypto.randomUUID();

  await db.insert(users).values({ id: userId, isGuest: 1, createdAt: now });
  await db.insert(sessions).values({
    tokenHash: input.tokenHash,
    userId,
    createdAt: now,
    expiresAt: now + input.ttlMs,
  });

  return { userId, isGuest: true };
}

/** Attach a new session to an existing user — used when a member signs in. */
export async function createSessionForUser(
  db: Db,
  userId: string,
  input: Omit<CreateSessionInput, 'userId'>,
): Promise<void> {
  const now = input.now ?? Date.now();
  await db.insert(sessions).values({
    tokenHash: input.tokenHash,
    userId,
    createdAt: now,
    expiresAt: now + input.ttlMs,
  });
}

/** Resolve a session token hash to its viewer. Expired sessions resolve to null. */
export async function findViewerBySession(
  db: Db,
  tokenHash: string,
  now: number = Date.now(),
): Promise<Viewer | null> {
  const [row] = await db
    .select({ userId: users.id, isGuest: users.isGuest, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  return row ? { userId: row.userId, isGuest: row.isGuest === 1 } : null;
}

/** Rolling expiry: push the session out another ttl. */
export async function touchSession(
  db: Db,
  tokenHash: string,
  input: { now?: number; ttlMs: number },
): Promise<void> {
  const now = input.now ?? Date.now();
  await db
    .update(sessions)
    .set({ expiresAt: now + input.ttlMs })
    .where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteSession(db: Db, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

/** Housekeeping for the nightly Cron Trigger. */
export async function deleteExpiredSessions(db: Db, now: number = Date.now()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
