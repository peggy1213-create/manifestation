import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users } from '../db/schema';
import { newId } from '../ids';
import { DEFAULT_TIME_ZONE } from '../time';
import type { SessionUser } from './sessions';

export interface UpsertUserInput {
  email: string;
  displayName?: string | null;
  pictureUrl?: string | null;
  timeZone?: string;
}

/**
 * Finds or creates the person behind a verified email. The sign-in flow calls
 * this after a Google ID token has been checked; nothing here trusts the email
 * on its own.
 */
export async function upsertUserByEmail(
  db: Database,
  input: UpsertUserInput,
  now: number = Date.now(),
): Promise<SessionUser> {
  const email = input.email.trim().toLowerCase();
  if (email.length === 0) throw new TypeError('email is required');

  const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const row = existing[0];

  if (row) {
    const displayName = input.displayName ?? row.displayName;
    const pictureUrl = input.pictureUrl ?? row.pictureUrl;
    if (displayName !== row.displayName || pictureUrl !== row.pictureUrl) {
      await db.update(users).set({ displayName, pictureUrl }).where(eq(users.id, row.id));
    }
    return {
      id: row.id,
      email: row.email,
      displayName,
      pictureUrl,
      timeZone: row.timeZone || DEFAULT_TIME_ZONE,
    };
  }

  const created = {
    id: newId(),
    email,
    displayName: input.displayName ?? null,
    pictureUrl: input.pictureUrl ?? null,
    timeZone: input.timeZone ?? DEFAULT_TIME_ZONE,
    createdAt: now,
  };

  await db.insert(users).values(created);

  return {
    id: created.id,
    email: created.email,
    displayName: created.displayName,
    pictureUrl: created.pictureUrl,
    timeZone: created.timeZone,
  };
}
