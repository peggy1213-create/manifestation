import { and, asc, eq, inArray, max } from 'drizzle-orm';
import type { Db } from '../db/client';
import { boardItems, type BoardItem, type BoardKind, type BoardZone } from '../db/schema';
import { newId } from './ids';
import { assertOwnedManifestation } from './manifestations';
import { ownsMediaKey, parseMediaKey } from './media';

export interface CreateBoardItemInput {
  manifestationId: string;
  /** 'why' holds the outcome imagery, 'process' the repeatable steps. */
  zone: BoardZone;
  kind: BoardKind;
  /** R2 key, required for kind 'image'. */
  imageKey?: string | null;
  /** Words, required for kind 'words'. */
  text?: string | null;
  /** Design token name: 'highlighter' | 'graph-blue' | 'coral' | 'ink'. */
  colour?: string | null;
  /** When and where this small action happens, e.g. '週一三五 19:30 樓下'. */
  whenWhere?: string | null;
  /** Leave unset to append to the end of the zone. */
  position?: number;
}

export async function createBoardItem(
  db: Db,
  userId: string,
  input: CreateBoardItemInput,
  now = new Date(),
): Promise<BoardItem> {
  await assertOwnedManifestation(db, userId, input.manifestationId);

  if (input.kind === 'image') {
    const key = input.imageKey ?? null;
    const parsed = key === null ? null : parseMediaKey(key);
    if (
      key === null ||
      !ownsMediaKey(userId, key) ||
      parsed?.manifestationId !== input.manifestationId
    ) {
      throw new Error('An image board item needs an imageKey under this user and manifestation');
    }
  } else if (!input.text) {
    throw new Error('A words board item needs text');
  }

  const position =
    input.position ?? (await nextPosition(db, userId, input.manifestationId, input.zone));

  const [row] = await db
    .insert(boardItems)
    .values({
      id: newId(),
      manifestationId: input.manifestationId,
      userId,
      zone: input.zone,
      kind: input.kind,
      imageKey: input.imageKey ?? null,
      text: input.text ?? null,
      colour: input.colour ?? null,
      whenWhere: input.whenWhere ?? null,
      position,
      createdAt: now,
    })
    .returning();
  return row as BoardItem;
}

async function nextPosition(
  db: Db,
  userId: string,
  manifestationId: string,
  zone: BoardZone,
): Promise<number> {
  const [row] = await db
    .select({ value: max(boardItems.position) })
    .from(boardItems)
    .where(
      and(
        eq(boardItems.userId, userId),
        eq(boardItems.manifestationId, manifestationId),
        eq(boardItems.zone, zone),
      ),
    );
  return (row?.value ?? -1) + 1;
}

export async function listBoardItems(
  db: Db,
  userId: string,
  manifestationId: string,
  options: { zone?: BoardZone } = {},
): Promise<BoardItem[]> {
  const filters = [eq(boardItems.userId, userId), eq(boardItems.manifestationId, manifestationId)];
  if (options.zone) filters.push(eq(boardItems.zone, options.zone));

  return db
    .select()
    .from(boardItems)
    .where(and(...filters))
    .orderBy(asc(boardItems.zone), asc(boardItems.position));
}

export async function getBoardItem(
  db: Db,
  userId: string,
  boardItemId: string,
): Promise<BoardItem | null> {
  const [row] = await db
    .select()
    .from(boardItems)
    .where(and(eq(boardItems.id, boardItemId), eq(boardItems.userId, userId)))
    .limit(1);
  return row ?? null;
}

export type UpdateBoardItemInput = Partial<
  Pick<CreateBoardItemInput, 'zone' | 'text' | 'colour' | 'whenWhere' | 'position'>
>;

export async function updateBoardItem(
  db: Db,
  userId: string,
  boardItemId: string,
  patch: UpdateBoardItemInput,
): Promise<BoardItem | null> {
  const values: Record<string, unknown> = {};
  if (patch.zone !== undefined) values.zone = patch.zone;
  if (patch.text !== undefined) values.text = patch.text;
  if (patch.colour !== undefined) values.colour = patch.colour;
  if (patch.whenWhere !== undefined) values.whenWhere = patch.whenWhere;
  if (patch.position !== undefined) values.position = patch.position;
  if (Object.keys(values).length === 0) return getBoardItem(db, userId, boardItemId);

  const [row] = await db
    .update(boardItems)
    .set(values)
    .where(and(eq(boardItems.id, boardItemId), eq(boardItems.userId, userId)))
    .returning();
  return row ?? null;
}

/**
 * Writes a new order for one zone. Only the user's own items move; ids that are
 * not theirs are ignored. Returns the zone in its new order.
 */
export async function reorderBoardItems(
  db: Db,
  userId: string,
  manifestationId: string,
  zone: BoardZone,
  orderedIds: readonly string[],
): Promise<BoardItem[]> {
  await assertOwnedManifestation(db, userId, manifestationId);

  const statements = orderedIds.map((id, position) =>
    db
      .update(boardItems)
      .set({ position })
      .where(
        and(
          eq(boardItems.id, id),
          eq(boardItems.userId, userId),
          eq(boardItems.manifestationId, manifestationId),
          eq(boardItems.zone, zone),
        ),
      ),
  );
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);

  return listBoardItems(db, userId, manifestationId, { zone });
}

export async function deleteBoardItem(
  db: Db,
  userId: string,
  boardItemId: string,
): Promise<BoardItem | null> {
  const [row] = await db
    .delete(boardItems)
    .where(and(eq(boardItems.id, boardItemId), eq(boardItems.userId, userId)))
    .returning();
  return row ?? null;
}

/** Deletes several of the user's own items in one batch. */
export async function deleteBoardItems(
  db: Db,
  userId: string,
  boardItemIds: readonly string[],
): Promise<number> {
  if (boardItemIds.length === 0) return 0;
  const deleted = await db
    .delete(boardItems)
    .where(and(inArray(boardItems.id, [...boardItemIds]), eq(boardItems.userId, userId)))
    .returning({ id: boardItems.id });
  return deleted.length;
}
