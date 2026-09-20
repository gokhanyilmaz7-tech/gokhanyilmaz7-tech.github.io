ALTER TABLE users ADD COLUMN approval_status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE users ADD COLUMN rejection_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN reviewed_at INTEGER;
ALTER TABLE users ADD COLUMN reviewed_by TEXT;
ALTER TABLE users ADD COLUMN blacklisted_at INTEGER;
ALTER TABLE users ADD COLUMN notification_status TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN notification_error TEXT NOT NULL DEFAULT '';
ALTER TABLE users ADD COLUMN notified_at INTEGER;

UPDATE users
SET approval_status = CASE WHEN is_approved = 1 THEN 'approved' ELSE 'pending' END
WHERE approval_status = 'approved';

CREATE INDEX IF NOT EXISTS users_approval_status_idx ON users(approval_status);
CREATE INDEX IF NOT EXISTS users_blacklisted_at_idx ON users(blacklisted_at);
