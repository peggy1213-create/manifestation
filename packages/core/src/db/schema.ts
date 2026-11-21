import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * D1 schema, mirroring `migrations/`. Timestamps are epoch milliseconds (UTC)
 * stored as integers — no date strings, no local time.
 */

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    /** Google's stable subject id. The only identifier we match accounts on. */
    googleSub: text('google_sub').notNull().unique(),
    email: text('email').notNull(),
    name: text('name'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('users_email_idx').on(table.email)],
);

export const sessions = sqliteTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    /** SHA-256 of the cookie token, lowercase hex. Never the token itself. */
    tokenHash: text('token_hash').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export const manifestations = sqliteTable(
  'manifestations',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** WOOP: 願望, 實現後的樣子, 內在阻礙, if-then 小行動. */
    wish: text('wish').notNull(),
    outcome: text('outcome').notNull(),
    obstacle: text('obstacle').notNull(),
    plan: text('plan').notNull(),
    source: text('source', { enum: ['app', 'guest'] })
      .notNull()
      .default('app'),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('manifestations_user_idx').on(table.userId, table.createdAt)],
);

export type UserRow = typeof users.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type ManifestationRow = typeof manifestations.$inferSelect;
