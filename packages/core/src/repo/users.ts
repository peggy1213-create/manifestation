import { eq } from 'drizzle-orm';
import type { Database } from '../db/client';
import { users, type UserRow } from '../db/schema';
import { newId } from '../ids';

export interface UpsertUserInput {
  googleSub: string;
  email: string;
  name?: string | null;
  /** Epoch milliseconds. */
  now?: number;
}

/**
 * Finds the account for a Google subject, or creates it. Matching is on
 * `google_sub` only — an email can change hands, a subject cannot.
 */
export async function upsertUserByGoogleSub(
  db: Database,
  input: UpsertUserInput,
): Promise<UserRow> {
  const now = input.now ?? Date.now();
  const name = input.name?.trim() ? input.name.trim() : null;

  const [row] = await db
    .insert(users)
    .values({
      id: newId(),
      googleSub: input.googleSub,
      email: input.email,
      name,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: users.googleSub,
      set: { email: input.email, name, updatedAt: now },
    })
    .returning();

  if (!row) throw new Error('upsertUserByGoogleSub returned no row');
  return row;
}

export async function findUserById(db: Database, userId: string): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ?? null;
}

export async function findUserByGoogleSub(
  db: Database,
  googleSub: string,
): Promise<UserRow | null> {
  const [row] = await db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
  return row ?? null;
}

/** Deleting the account cascades to its sessions and 顯化. */
export async function deleteUser(db: Database, userId: string): Promise<void> {
  await db.delete(users).where(eq(users.id, userId));
}
