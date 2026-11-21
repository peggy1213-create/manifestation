import { eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { users, type User } from '../db/schema';
import { newId } from './ids';

export interface CreateUserInput {
  googleSub: string;
  email: string;
  displayName: string;
  appleSub?: string | null;
  reminderTime?: string | null;
}

/** Creates the user row behind a verified Google (or Apple) identity. */
export async function createUser(db: Db, input: CreateUserInput, now = new Date()): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({
      id: newId(),
      googleSub: input.googleSub,
      appleSub: input.appleSub ?? null,
      email: input.email,
      displayName: input.displayName,
      reminderTime: input.reminderTime ?? null,
      createdAt: now,
    })
    .returning();
  // INSERT ... RETURNING always gives back the inserted row.
  return user as User;
}

export async function getUserById(db: Db, userId: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user ?? null;
}

export async function getUserByGoogleSub(db: Db, googleSub: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.googleSub, googleSub)).limit(1);
  return user ?? null;
}

export async function getUserByAppleSub(db: Db, appleSub: string): Promise<User | null> {
  const [user] = await db.select().from(users).where(eq(users.appleSub, appleSub)).limit(1);
  return user ?? null;
}

/** Links Sign in with Apple to an existing account (iOS, later phase). */
export async function linkAppleSub(db: Db, userId: string, appleSub: string): Promise<User | null> {
  const [user] = await db.update(users).set({ appleSub }).where(eq(users.id, userId)).returning();
  return user ?? null;
}

export interface UpdateProfileInput {
  displayName?: string;
  /** 'HH:MM' local time, or null to turn the reminder off. */
  reminderTime?: string | null;
}

export async function updateProfile(
  db: Db,
  userId: string,
  patch: UpdateProfileInput,
): Promise<User | null> {
  const values: Partial<Pick<User, 'displayName' | 'reminderTime'>> = {};
  if (patch.displayName !== undefined) values.displayName = patch.displayName;
  if (patch.reminderTime !== undefined) values.reminderTime = patch.reminderTime;
  if (Object.keys(values).length === 0) return getUserById(db, userId);

  const [user] = await db.update(users).set(values).where(eq(users.id, userId)).returning();
  return user ?? null;
}

/** Deletes the account. Every other table cascades from here. */
export async function deleteUser(db: Db, userId: string): Promise<boolean> {
  const deleted = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });
  return deleted.length > 0;
}
