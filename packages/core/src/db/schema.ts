// Drizzle schema for Cloudflare D1. Mirrors migrations/0001_initial_schema.sql —
// the SQL file is what D1 actually runs, this file is how TypeScript sees it.
// Keep the two in step: the repo tests run against the migrated database, so a
// drift between them fails the suite.

import { relations } from 'drizzle-orm';
import { index, integer, sqliteTable, text, unique } from 'drizzle-orm/sqlite-core';

export const MANIFESTATION_STATUSES = ['active', 'paused', 'released', 'realised'] as const;
export type ManifestationStatus = (typeof MANIFESTATION_STATUSES)[number];

export const CHECKIN_RESULTS = ['did', 'partly', 'not_today'] as const;
export type CheckinResult = (typeof CHECKIN_RESULTS)[number];

export const BOARD_ZONES = ['why', 'process'] as const;
export type BoardZone = (typeof BOARD_ZONES)[number];

export const BOARD_KINDS = ['image', 'words'] as const;
export type BoardKind = (typeof BOARD_KINDS)[number];

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  googleSub: text('google_sub').notNull().unique(),
  appleSub: text('apple_sub').unique(),
  email: text('email').notNull(),
  displayName: text('display_name').notNull(),
  /** Local reminder time as 'HH:MM'; null until the user asks for one. */
  reminderTime: text('reminder_time'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 (hex) of the session token. The token itself is never stored. */
    idHash: text('id_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    userAgent: text('user_agent'),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ],
);

export const manifestations = sqliteTable(
  'manifestations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    wish: text('wish').notNull(),
    outcome: text('outcome').notNull(),
    obstacle: text('obstacle').notNull(),
    ifCue: text('if_cue').notNull(),
    thenAction: text('then_action').notNull(),
    /** Repeatable 小行動, process over outcome. */
    steps: text('steps', { mode: 'json' }).$type<string[]>().notNull().default([]),
    likelihood: integer('likelihood').notNull(),
    status: text('status', { enum: MANIFESTATION_STATUSES }).notNull().default('active'),
    /** 'YYYY-MM-DD', day one of the 66-day path. */
    startDate: text('start_date').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_manifestations_user_id').on(table.userId),
    index('idx_manifestations_user_id_status').on(table.userId, table.status),
  ],
);

export const checkins = sqliteTable(
  'checkins',
  {
    id: text('id').primaryKey(),
    manifestationId: text('manifestation_id')
      .notNull()
      .references(() => manifestations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** 'YYYY-MM-DD' in the user's own local day. */
    date: text('date').notNull(),
    result: text('result', { enum: CHECKIN_RESULTS }).notNull(),
    note: text('note'),
    /** R2 key, always users/{userId}/{manifestationId}/{uuid}.jpg */
    photoKey: text('photo_key'),
    cuesDone: text('cues_done', { mode: 'json' }).$type<string[]>().notNull().default([]),
  },
  (table) => [
    unique('uq_checkins_manifestation_id_date').on(table.manifestationId, table.date),
    index('idx_checkins_user_id').on(table.userId),
    index('idx_checkins_manifestation_id_date').on(table.manifestationId, table.date),
  ],
);

export const rehearsals = sqliteTable(
  'rehearsals',
  {
    id: text('id').primaryKey(),
    manifestationId: text('manifestation_id')
      .notNull()
      .references(() => manifestations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    startedAt: integer('started_at', { mode: 'timestamp' }).notNull(),
    completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  },
  (table) => [
    index('idx_rehearsals_user_id').on(table.userId),
    index('idx_rehearsals_manifestation_id_started_at').on(table.manifestationId, table.startedAt),
  ],
);

export const reviews = sqliteTable(
  'reviews',
  {
    id: text('id').primaryKey(),
    manifestationId: text('manifestation_id')
      .notNull()
      .references(() => manifestations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Monday of the reviewed week, 'YYYY-MM-DD'. */
    weekStart: text('week_start').notNull(),
    whatWorked: text('what_worked'),
    whatToChange: text('what_to_change'),
  },
  (table) => [
    unique('uq_reviews_manifestation_id_week_start').on(table.manifestationId, table.weekStart),
    index('idx_reviews_user_id').on(table.userId),
  ],
);

export const boardItems = sqliteTable(
  'board_items',
  {
    id: text('id').primaryKey(),
    manifestationId: text('manifestation_id')
      .notNull()
      .references(() => manifestations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    zone: text('zone', { enum: BOARD_ZONES }).notNull(),
    kind: text('kind', { enum: BOARD_KINDS }).notNull(),
    /** R2 key for kind 'image'. */
    imageKey: text('image_key'),
    /** Words for kind 'words'. */
    text: text('text'),
    /** Design token name: 'highlighter' | 'graph-blue' | 'coral' | 'ink'. */
    colour: text('colour'),
    whenWhere: text('when_where'),
    position: integer('position').notNull().default(0),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  },
  (table) => [
    index('idx_board_items_user_id').on(table.userId),
    index('idx_board_items_manifestation_id_zone_position').on(
      table.manifestationId,
      table.zone,
      table.position,
    ),
  ],
);

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  manifestations: many(manifestations),
}));

export const manifestationsRelations = relations(manifestations, ({ one, many }) => ({
  user: one(users, { fields: [manifestations.userId], references: [users.id] }),
  checkins: many(checkins),
  rehearsals: many(rehearsals),
  reviews: many(reviews),
  boardItems: many(boardItems),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Manifestation = typeof manifestations.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Rehearsal = typeof rehearsals.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type BoardItem = typeof boardItems.$inferSelect;
