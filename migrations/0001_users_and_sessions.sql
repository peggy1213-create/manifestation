-- P04 auth: accounts created by Google sign-in, and the session rows behind the
-- session cookie. Only the SHA-256 hash of a session token is ever stored.
-- Timestamps are epoch milliseconds (integer), UTC.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX users_email_idx ON users (email);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  -- SHA-256 of the cookie token, lowercase hex. The token itself is never stored.
  token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX sessions_user_id_idx ON sessions (user_id);
CREATE INDEX sessions_expires_at_idx ON sessions (expires_at);
