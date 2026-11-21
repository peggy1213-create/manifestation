-- P04 needs somewhere to put a 顯化 so the guest move has a destination.
-- The WOOP fields are the four the 顯化 editor writes; later phases add the
-- 顯化板 and 足跡 tables that reference this one.

CREATE TABLE manifestations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  wish TEXT NOT NULL,
  outcome TEXT NOT NULL,
  obstacle TEXT NOT NULL,
  plan TEXT NOT NULL,
  -- 'app' for a 顯化 written while signed in, 'guest' for one moved in from
  -- guest mode (localStorage).
  source TEXT NOT NULL DEFAULT 'app',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX manifestations_user_idx ON manifestations (user_id, created_at);
