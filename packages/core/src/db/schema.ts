// Drizzle schema for Cloudflare D1. Mirrors migrations/ — change both together.

import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Guests are real rows, so a later Google sign-in can keep what they wrote. */
    isGuest: integer('is_guest').notNull().default(1),
    email: text('email'),
    name: text('name'),
    createdAt: integer('created_at').notNull(),
  },
  (table) => [
    uniqueIndex('users_email_unique')
      .on(table.email)
      .where(sql`${table.email} is not null`),
  ],
);

export const sessions = sqliteTable(
  'sessions',
  {
    /** SHA-256 of the cookie token. The token itself is never stored. */
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [index('sessions_user_id').on(table.userId)],
);

export const manifestations = sqliteTable(
  'manifestations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    wish: text('wish').notNull().default(''),
    outcome: text('outcome').notNull().default(''),
    outcomeSee: text('outcome_see').notNull().default(''),
    outcomeHear: text('outcome_hear').notNull().default(''),
    outcomeFeel: text('outcome_feel').notNull().default(''),
    obstacle: text('obstacle').notNull().default(''),
    planIf: text('plan_if').notNull().default(''),
    planThen: text('plan_then').notNull().default(''),
    /** JSON array of ProcessStep. */
    steps: text('steps').notNull().default('[]'),
    likelihood: integer('likelihood'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
    startedAt: integer('started_at'),
    releasedAt: integer('released_at'),
    releaseNote: text('release_note'),
  },
  (table) => [index('manifestations_user_updated').on(table.userId, table.status, table.updatedAt)],
);
