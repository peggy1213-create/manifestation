import { and, eq, gt, lt } from 'drizzle-orm';
import type { Database } from '../db/client';
import { sessions, users, type SessionRow, type UserRow } from '../db/schema';
import { newId } from '../ids';

/** 30 days, matching the cookie. Renewal pushes it out again. */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface CreateSessionInput {
  userId: string;
  /** SHA-256 of the cookie token, lowercase hex — hashed by the caller. */
  tokenHash: string;
  now?: number;
  ttlMs?: number;
}

export interface ActiveSession {
  session: SessionRow;
  user: UserRow;
}

export async function createSession(db: Database, input: CreateSessionInput): Promise<SessionRow> {
  const now = input.now ?? Date.now();
  const [row] = await db
    .insert(sessions)
    .values({
      id: newId(),
      tokenHash: input.tokenHash,
      userId: input.userId,
      createdAt: now,
      lastUsedAt: now,
      expiresAt: now + (input.ttlMs ?? SESSION_TTL_MS),
    })
    .returning();

  if (!row) throw new Error('createSession returned no row');
  return row;
}

/**
 * The session behind a cookie, with its account — or `null` when the hash is
 * unknown or the row has expired. Expiry is checked in SQL, never in the caller.
 */
export async function findActiveSession(
  db: Database,
  tokenHash: string,
  now: number = Date.now(),
): Promise<ActiveSession | null> {
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .limit(1);

  return row ?? null;
}

/** Rolling renewal: pushes `expires_at` 30 days out from now. */
export async function renewSession(
  db: Database,
  sessionId: string,
  options: { now?: number; ttlMs?: number } = {},
): Promise<void> {
  const now = options.now ?? Date.now();
  await db
    .update(sessions)
    .set({ lastUsedAt: now, expiresAt: now + (options.ttlMs ?? SESSION_TTL_MS) })
    .where(eq(sessions.id, sessionId));
}

/** Sign-out: the row goes, so the cookie is dead even if a copy survives. */
export async function deleteSessionByTokenHash(db: Database, tokenHash: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, tokenHash));
}

export async function deleteSessionsForUser(db: Database, userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** For the cleanup Cron Trigger. */
export async function deleteExpiredSessions(db: Database, now: number = Date.now()): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, now));
}
