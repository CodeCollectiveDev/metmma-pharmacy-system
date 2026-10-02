-- Run before deploying the employee creation API. Existing employees may not
-- have an email; the API requires one for new records. No backfill is invented.
BEGIN;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS email VARCHAR(255);
COMMIT;
