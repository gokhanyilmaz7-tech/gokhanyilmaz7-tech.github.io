CREATE TABLE IF NOT EXISTS report_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  section_id TEXT NOT NULL,
  section_title TEXT NOT NULL,
  location TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL DEFAULT '',
  html TEXT NOT NULL DEFAULT '',
  saved_at INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS report_items_user_idx ON report_items(user_id);
