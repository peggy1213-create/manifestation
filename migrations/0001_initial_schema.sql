-- Clear Path (顯化) initial schema.
-- Applied with: wrangler d1 migrations apply clearpath --local | --remote
--
-- Conventions
--   * ids are uuid v4 strings (crypto.randomUUID()), stored as TEXT.
--   * instants are INTEGER unix epoch seconds (UTC).
--   * calendar days are TEXT 'YYYY-MM-DD' in the user's own local day (Asia/Taipei
--     for now); a footprint belongs to a day, not to an instant.
--   * JSON array columns are TEXT holding a JSON array, never NULL.
--   * every row that belongs to a person carries user_id, so that every query in
--     packages/core/src/repo can scope by it. D1 has no row-level security.

CREATE TABLE users (
  id            TEXT PRIMARY KEY NOT NULL,
  google_sub    TEXT NOT NULL UNIQUE,
  apple_sub     TEXT UNIQUE,
  email         TEXT NOT NULL,
  display_name  TEXT NOT NULL,
  -- local reminder time as 'HH:MM', NULL until the user asks for a reminder.
  reminder_time TEXT,
  created_at    INTEGER NOT NULL
);

CREATE TABLE sessions (
  -- SHA-256 (hex) of the session token. The token itself is never stored.
  id_hash    TEXT PRIMARY KEY NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  user_agent TEXT
);

CREATE INDEX idx_sessions_user_id ON sessions (user_id);
CREATE INDEX idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE manifestations (
  id          TEXT PRIMARY KEY NOT NULL,
  user_id     TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- WOOP. outcome is always written together with obstacle + if-then, so all
  -- four are required: no outcome visualisation without its plan.
  wish        TEXT NOT NULL,
  outcome     TEXT NOT NULL,
  obstacle    TEXT NOT NULL,
  if_cue      TEXT NOT NULL,
  then_action TEXT NOT NULL,
  -- JSON array of repeatable small actions (小行動), process over outcome.
  steps       TEXT NOT NULL DEFAULT '[]',
  likelihood  INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 10),
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'paused', 'released', 'realised')),
  start_date  TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);

CREATE INDEX idx_manifestations_user_id ON manifestations (user_id);
CREATE INDEX idx_manifestations_user_id_status ON manifestations (user_id, status);

CREATE TABLE checkins (
  id                TEXT PRIMARY KEY NOT NULL,
  manifestation_id  TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id           TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  date              TEXT NOT NULL,
  -- 今天沒做到 is a neutral fact, never a failure.
  result            TEXT NOT NULL CHECK (result IN ('did', 'partly', 'not_today')),
  note              TEXT,
  -- R2 object key, always users/{user_id}/{manifestation_id}/{uuid}.jpg
  photo_key         TEXT,
  cues_done         TEXT NOT NULL DEFAULT '[]',
  UNIQUE (manifestation_id, date)
);

CREATE INDEX idx_checkins_user_id ON checkins (user_id);
CREATE INDEX idx_checkins_manifestation_id_date ON checkins (manifestation_id, date);

CREATE TABLE rehearsals (
  id               TEXT PRIMARY KEY NOT NULL,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  started_at       INTEGER NOT NULL,
  completed        INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0, 1))
);

CREATE INDEX idx_rehearsals_user_id ON rehearsals (user_id);
CREATE INDEX idx_rehearsals_manifestation_id_started_at
  ON rehearsals (manifestation_id, started_at);

CREATE TABLE reviews (
  id               TEXT PRIMARY KEY NOT NULL,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- Monday of the reviewed week, 'YYYY-MM-DD'.
  week_start       TEXT NOT NULL,
  what_worked      TEXT,
  what_to_change   TEXT,
  UNIQUE (manifestation_id, week_start)
);

CREATE INDEX idx_reviews_user_id ON reviews (user_id);

CREATE TABLE board_items (
  id               TEXT PRIMARY KEY NOT NULL,
  manifestation_id TEXT NOT NULL REFERENCES manifestations (id) ON DELETE CASCADE,
  user_id          TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  -- 'why' holds the outcome imagery, 'process' holds the repeatable steps and
  -- gets most of the 顯化板.
  zone             TEXT NOT NULL CHECK (zone IN ('why', 'process')),
  kind             TEXT NOT NULL CHECK (kind IN ('image', 'words')),
  image_key        TEXT,
  text             TEXT,
  -- design token name, e.g. 'highlighter', 'graph-blue', 'coral', 'ink'
  colour           TEXT,
  when_where       TEXT,
  position         INTEGER NOT NULL DEFAULT 0,
  created_at       INTEGER NOT NULL,
  CHECK ((kind = 'image' AND image_key IS NOT NULL) OR (kind = 'words' AND text IS NOT NULL))
);

CREATE INDEX idx_board_items_user_id ON board_items (user_id);
CREATE INDEX idx_board_items_manifestation_id_zone_position
  ON board_items (manifestation_id, zone, position);
