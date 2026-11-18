CREATE TABLE actuarial_user_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  overrides_json TEXT NOT NULL DEFAULT '{}',
  revision INTEGER NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at INTEGER NOT NULL
);
CREATE TABLE actuarial_calculations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  input_json TEXT NOT NULL,
  data_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  baseline_version TEXT NOT NULL,
  data_revision INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX actuarial_calculations_user ON actuarial_calculations(user_id, created_at DESC);
