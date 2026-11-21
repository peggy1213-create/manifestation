import { and, eq, gt, lt } from 'drizzle-orm';
import type { Db } from '../db/client';
import { sessions, users, type Session, type User } from '../db/schema';

/** Cookie that carries the opaque session token. HttpOnly, Secure, SameSite=Lax. */
export const SESSION_COOKIE_NAME = 'cp_session';

/** 30-day rolling expiry. */
export const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Extend the session when it is older than this (keeps writes rare). */
const SESSION_REFRESH_AFTER_SECONDS = 24 * 60 * 60;

/** 32 random bytes, base64url. Only the hash of this ever reaches D1. */
export function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

/** SHA-256 of the token, lowercase hex. This is the sessions primary key. */
export async function hashSessionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export interface CreateSessionInput {
  userId: string;
  /** Raw token; it is hashed here and never stored. */
  token: string;
  userAgent?: string | null;
}

export async function createSession(
  db: Db,
  input: CreateSessionInput,
  now = new Date(),
): Promise<Session> {
  const [session] = await db
    .insert(sessions)
    .values({
      idHash: await hashSessionToken(input.token),
      userId: input.userId,
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_SECONDS * 1000),
      userAgent: input.userAgent ?? null,
    })
    .returning();
  return session as Session;
}

export interface ResolvedSession {
  session: Session;
  user: User;
}

/**
 * Looks up the signed-in user for a raw cookie token. Returns null for an
 * unknown or expired token; expired rows are left for the cleanup cron.
 */
export async function resolveSession(
  db: Db,
  token: string,
  now = new Date(),
): Promise<ResolvedSession | null> {
  if (!token) return null;
  const idHash = await hashSessionToken(token);
  const [row] = await db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.idHash, idHash), gt(sessions.expiresAt, now)))
    .limit(1);
  return row ?? null;
}

/**
 * Rolls the 30-day window forward, at most once a day. Returns the new expiry
 * if it was extended, or null if the session was left alone.
 */
export async function refreshSession(
  db: Db,
  session: Session,
  now = new Date(),
): Promise<Date | null> {
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
  const remainingMs = session.expiresAt.getTime() - now.getTime();
  if (remainingMs > (SESSION_TTL_SECONDS - SESSION_REFRESH_AFTER_SECONDS) * 1000) return null;

  const updated = await db
    .update(sessions)
    .set({ expiresAt })
    .where(eq(sessions.idHash, session.idHash))
    .returning({ idHash: sessions.idHash });
  return updated.length > 0 ? expiresAt : null;
}

/** Sign out: drops the one session behind this token. */
export async function deleteSessionByToken(db: Db, token: string): Promise<boolean> {
  const idHash = await hashSessionToken(token);
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.idHash, idHash))
    .returning({ idHash: sessions.idHash });
  return deleted.length > 0;
}

/** Sign out everywhere. */
export async function deleteSessionsForUser(db: Db, userId: string): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(eq(sessions.userId, userId))
    .returning({ idHash: sessions.idHash });
  return deleted.length;
}

/** Cron housekeeping: drop sessions that expired before `now`. */
export async function deleteExpiredSessions(db: Db, now = new Date()): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ idHash: sessions.idHash });
  return deleted.length;
}

/** The user's own sessions, for a "signed in on these devices" list. */
export async function listSessionsForUser(db: Db, userId: string): Promise<Session[]> {
  return db.select().from(sessions).where(eq(sessions.userId, userId));
}
