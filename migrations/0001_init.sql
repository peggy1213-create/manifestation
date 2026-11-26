-- Clear Path (顯化) initial schema.
-- D1 (SQLite). Applied with `wrangler d1 migrations apply clearpath --local | --remote`.
-- There is no row-level security in D1: every table that holds user content carries
-- user_id, and every query goes through a packages/core/repo function that scopes by it.

CREATE TABLE users (
  id            TEXT PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE,
  display_name  TEXT,
  picture_url   TEXT,
  time_zone     TEXT NOT NULL DEFAULT 'Asia/Taipei',
  created_at    INTEGER NOT NULL
) STRICT;

-- Only the SHA-256 hash of the session cookie token is stored, never the token.
CREATE TABLE sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL
) STRICT;

CREATE INDEX sessions_user_idx ON sessions (user_id);

-- One 顯化, written with WOOP: 願望 / 成果 / 阻礙 / 如果-我就 計畫.
CREATE TABLE manifestations (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  wish        TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  obstacle    TEXT NOT NULL,
  plan_if     TEXT NOT NULL,
  plan_then   TEXT NOT NULL,
  started_on  TEXT NOT NULL,
  time_zone   TEXT NOT NULL DEFAULT 'Asia/Taipei',
  archived_at INTEGER,
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
) STRICT;

CREATE INDEX manifestations_user_idx ON manifestations (user_id, archived_at);

-- 小行動: the repeatable process steps. The ones flagged as cues become 今日行動.
CREATE TABLE process_steps (
  id               TEXT PRIMARY KEY,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body             TEXT NOT NULL,
  position         INTEGER NOT NULL,
  is_cue           INTEGER NOT NULL DEFAULT 1,
  created_at       INTEGER NOT NULL
) STRICT;

CREATE INDEX process_steps_manifestation_idx ON process_steps (manifestation_id, position);

-- 記下今天: one row per day of the 66-day path. status is 'done' | 'partial' | 'missed'.
CREATE TABLE checkins (
  id               TEXT PRIMARY KEY,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_date         TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('done', 'partial', 'missed')),
  note             TEXT,
  photo_key        TEXT,
  client_id        TEXT,
  created_at       INTEGER NOT NULL,
  updated_at       INTEGER NOT NULL
) STRICT;

-- One check-in per day per 顯化; the offline outbox relies on this to stay idempotent.
CREATE UNIQUE INDEX checkins_day_idx ON checkins (manifestation_id, day_date);
CREATE INDEX checkins_user_idx ON checkins (user_id, day_date);

-- Which 今日行動 cues were ticked in a check-in.
CREATE TABLE checkin_cues (
  checkin_id TEXT NOT NULL REFERENCES checkins (id) ON DELETE CASCADE,
  step_id    TEXT NOT NULL REFERENCES process_steps (id) ON DELETE CASCADE,
  PRIMARY KEY (checkin_id, step_id)
) STRICT;

-- 3-minute guided rehearsals (the 預演 session). Counted in the cycle stats.
CREATE TABLE rehearsals (
  id               TEXT PRIMARY KEY,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day_date         TEXT NOT NULL,
  seconds          INTEGER NOT NULL DEFAULT 0,
  completed        INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL
) STRICT;

CREATE INDEX rehearsals_manifestation_idx ON rehearsals (manifestation_id, day_date);
