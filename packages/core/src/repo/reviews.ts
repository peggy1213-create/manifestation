import { and, desc, eq } from 'drizzle-orm';
import type { Db } from '../db/client';
import { reviews, type Review } from '../db/schema';
import { newId } from './ids';
import { assertOwnedManifestation } from './manifestations';

export interface SaveReviewInput {
  manifestationId: string;
  /** Monday of the reviewed week, 'YYYY-MM-DD'. */
  weekStart: string;
  whatWorked?: string | null;
  whatToChange?: string | null;
}

/** One weekly review per 顯化 per week; writing it again edits it. */
export async function saveReview(db: Db, userId: string, input: SaveReviewInput): Promise<Review> {
  await assertOwnedManifestation(db, userId, input.manifestationId);

  const values = {
    whatWorked: input.whatWorked ?? null,
    whatToChange: input.whatToChange ?? null,
  };

  const [row] = await db
    .insert(reviews)
    .values({
      id: newId(),
      manifestationId: input.manifestationId,
      userId,
      weekStart: input.weekStart,
      ...values,
    })
    .onConflictDoUpdate({
      target: [reviews.manifestationId, reviews.weekStart],
      set: values,
      setWhere: eq(reviews.userId, userId),
    })
    .returning();
  return row as Review;
}

export async function getReviewByWeek(
  db: Db,
  userId: string,
  manifestationId: string,
  weekStart: string,
): Promise<Review | null> {
  const [row] = await db
    .select()
    .from(reviews)
    .where(
      and(
        eq(reviews.userId, userId),
        eq(reviews.manifestationId, manifestationId),
        eq(reviews.weekStart, weekStart),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function listReviews(
  db: Db,
  userId: string,
  manifestationId: string,
): Promise<Review[]> {
  return db
    .select()
    .from(reviews)
    .where(and(eq(reviews.userId, userId), eq(reviews.manifestationId, manifestationId)))
    .orderBy(desc(reviews.weekStart));
}

export async function deleteReview(db: Db, userId: string, reviewId: string): Promise<boolean> {
  const deleted = await db
    .delete(reviews)
    .where(and(eq(reviews.id, reviewId), eq(reviews.userId, userId)))
    .returning({ id: reviews.id });
  return deleted.length > 0;
}
