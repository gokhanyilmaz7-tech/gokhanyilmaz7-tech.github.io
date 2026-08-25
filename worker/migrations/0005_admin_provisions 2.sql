CREATE TABLE IF NOT EXISTS admin_provisions (
  section_id TEXT NOT NULL,
  page INTEGER NOT NULL,
  block INTEGER NOT NULL,
  html TEXT NOT NULL DEFAULT '',
  deleted INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (section_id, page, block)
);
