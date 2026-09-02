CREATE TABLE IF NOT EXISTS admin_task_attachments (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  doc_type TEXT NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_data TEXT NOT NULL,
  uploaded_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_task ON admin_task_attachments(task_id);
