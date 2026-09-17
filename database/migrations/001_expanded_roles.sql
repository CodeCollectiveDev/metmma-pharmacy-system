-- ============================================
-- Migration 001: Expanded RBAC role model
-- Adds the full business role set required by the org:
--   super_admin, managing_director, director, pharmacist_manager,
--   pharmacist, assistant_pharmacist, store_manager, cashier, hr_officer
--
-- Run against EXISTING databases via:
--   psql $DATABASE_URL -f database/migrations/001_expanded_roles.sql
-- Fresh installs get the same model from database/init.sql.
-- ============================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'super_admin',
    'managing_director',
    'director',
    'pharmacist_manager',
    'pharmacist',
    'assistant_pharmacist',
    'store_manager',
    'cashier',
    'hr_officer'
  )
);

-- Migrate the old 'admin' role to the new 'super_admin' role.
-- Only safe for pre-production databases. Verify any remaining 'admin'
-- rows first with: SELECT * FROM users WHERE role = 'admin';
UPDATE users SET role = 'super_admin' WHERE role = 'admin';