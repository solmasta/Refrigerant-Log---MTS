ALTER TABLE admin_settings ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE admin_settings ADD COLUMN locked_until TEXT;
