CREATE TABLE IF NOT EXISTS program_data (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tasks_json TEXT NOT NULL DEFAULT '[]',
  schedule_json TEXT NOT NULL DEFAULT '{}',
  updated_at INTEGER NOT NULL
);
