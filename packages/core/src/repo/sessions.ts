import { and, eq, gt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions, users } from '../db/schema';
import { DEFAULT_TIME_ZONE } from '../time';

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  pictureUrl: string | null;
  timeZone: string;
}

/**
 * Looks a session up by the SHA-256 hash of the cookie token. The raw token is
 * never stored, so a leaked database cannot be replayed as a login.
 */
export async function findUserBySessionHash(
  db: Database,
  tokenHash: string,
  now: number = Date.now(),
): Promise<SessionUser | null> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      pictureUrl: users.pictureUrl,
      timeZone: users.timeZone,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  return row ? { ...row, timeZone: row.timeZone || DEFAULT_TIME_ZONE } : null;
}

export interface SessionRecord {
  tokenHash: string;
  expiresAt: number;
  user: SessionUser;
}

/**
 * The same lookup as above, plus the stored expiry, so a mutating request can
 * push the 30-day rolling window out again.
 */
export async function findSessionByHash(
  db: Database,
  tokenHash: string,
  now: number = Date.now(),
): Promise<SessionRecord | null> {
  const rows = await db
    .select({
      expiresAt: sessions.expiresAt,
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      pictureUrl: users.pictureUrl,
      timeZone: users.timeZone,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const { expiresAt, ...user } = row;
  return {
    tokenHash,
    expiresAt,
    user: { ...user, timeZone: user.timeZone || DEFAULT_TIME_ZONE },
  };
}

export async function createSession(
  db: Database,
  input: { tokenHash: string; userId: string; expiresAt: number },
  now: number = Date.now(),
): Promise<void> {
  await db.insert(sessions).values({
    tokenHash: input.tokenHash,
    userId: input.userId,
    createdAt: now,
    expiresAt: input.expiresAt,
  });
}

/** Pushes the rolling 30-day expiry out. Called from mutating requests only. */
export async function extendSession(
  db: Database,
  tokenHash: string,
  expiresAt: number,
): Promise<void> {
  await db.update(sessions).set({ expiresAt }).where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteSession(db: Database, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}
