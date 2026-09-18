-- ============================================
-- Migration 005: Employee <-> User linkage
-- Enforces the rule "a user is always an employee": user provisioning
-- auto-creates (or links) an employee record. The employees.user_id column
-- already exists in database/init.sql for fresh installs; this migration
-- guarantees the column is also present on existing databases before the
-- provisioning API is deployed.
--
-- Run against EXISTING databases via:
--   psql $DATABASE_URL -f database/migrations/005_employee_user_link.sql
-- Fresh installs get the same definition from database/init.sql.
-- ============================================

BEGIN;
ALTER TABLE employees ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id);
COMMIT;