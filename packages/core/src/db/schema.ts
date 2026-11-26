/**
 * Drizzle table definitions mirroring migrations/0001_init.sql. The SQL file is
 * the source of truth for the D1 schema; this file is how queries stay typed.
 */

import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  displayName: text('display_name'),
  pictureUrl: text('picture_url'),
  timeZone: text('time_zone').notNull().default('Asia/Taipei'),
  createdAt: integer('created_at').notNull(),
});

export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('sessions_user_idx').on(table.userId)],
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
    planIf: text('plan_if').notNull(),
    planThen: text('plan_then').notNull(),
    startedOn: text('started_on').notNull(),
    timeZone: text('time_zone').notNull().default('Asia/Taipei'),
    archivedAt: integer('archived_at'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('manifestations_user_idx').on(table.userId, table.archivedAt)],
);

export const processSteps = sqliteTable(
  'process_steps',
  {
    id: text('id').primaryKey(),
    manifestationId: text('manifestation_id')
      .notNull()
      .references(() => manifestations.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    body: text('body').notNull(),
    position: integer('position').notNull(),
    isCue: integer('is_cue').notNull().default(1),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('process_steps_manifestation_idx').on(table.manifestationId, table.position)],
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
    dayDate: text('day_date').notNull(),
    status: text('status', { enum: ['done', 'partial', 'missed'] }).notNull(),
    note: text('note'),
    photoKey: text('photo_key'),
    clientId: text('client_id'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('checkins_day_idx').on(table.manifestationId, table.dayDate),
    index('checkins_user_idx').on(table.userId, table.dayDate),
  ],
);

export const checkinCues = sqliteTable(
  'checkin_cues',
  {
    checkinId: text('checkin_id')
      .notNull()
      .references(() => checkins.id, { onDelete: 'cascade' }),
    stepId: text('step_id')
      .notNull()
      .references(() => processSteps.id, { onDelete: 'cascade' }),
  },
  (table) => [primaryKey({ columns: [table.checkinId, table.stepId] })],
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
    dayDate: text('day_date').notNull(),
    seconds: integer('seconds').notNull().default(0),
    completed: integer('completed').notNull().default(0),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [index('rehearsals_manifestation_idx').on(table.manifestationId, table.dayDate)],
);

export const schema = {
  users,
  sessions,
  manifestations,
  processSteps,
  checkins,
  checkinCues,
  rehearsals,
};
