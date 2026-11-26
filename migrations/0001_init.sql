-- Clear Path (顯化) initial schema.
-- Every row is owned by a user; guests are real user rows with is_guest = 1 so a
-- later Google sign-in can keep their 顯化 (P04 upgrades the row in place).

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  is_guest INTEGER NOT NULL DEFAULT 1,
  email TEXT,
  name TEXT,
  created_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX users_email_unique ON users (email) WHERE email IS NOT NULL;

-- Only the SHA-256 hash of a session token is ever stored.
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_user_id ON sessions (user_id);

CREATE TABLE manifestations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft',
  wish TEXT NOT NULL DEFAULT '',
  outcome TEXT NOT NULL DEFAULT '',
  outcome_see TEXT NOT NULL DEFAULT '',
  outcome_hear TEXT NOT NULL DEFAULT '',
  outcome_feel TEXT NOT NULL DEFAULT '',
  obstacle TEXT NOT NULL DEFAULT '',
  plan_if TEXT NOT NULL DEFAULT '',
  plan_then TEXT NOT NULL DEFAULT '',
  steps TEXT NOT NULL DEFAULT '[]',
  likelihood INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  released_at INTEGER,
  release_note TEXT
);

CREATE INDEX manifestations_user_updated ON manifestations (user_id, status, updated_at DESC);
