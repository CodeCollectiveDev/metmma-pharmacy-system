-- ============================================
-- Migration 002: Employee ID auto-generation
-- employees.employee_id is UNIQUE NOT NULL with no default, so inserts
-- that omit it crash with a 500. Give it a sequence-backed default so the
-- server always generates the ID (e.g. EMP-000001).
--
-- Run against EXISTING databases via:
--   psql $DATABASE_URL -f database/migrations/002_employee_id_default.sql
-- Fresh installs get the same definition from database/init.sql.
-- ============================================

CREATE SEQUENCE IF NOT EXISTS employee_id_seq START 1;

ALTER TABLE employees ALTER COLUMN employee_id
  SET DEFAULT ('EMP-' || lpad(nextval('employee_id_seq')::text, 6, '0'));