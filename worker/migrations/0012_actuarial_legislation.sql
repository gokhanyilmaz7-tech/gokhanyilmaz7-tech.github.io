CREATE TABLE actuarial_user_legislation (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  rows_json TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision > 0),
  updated_at INTEGER NOT NULL
);
