-- ============================================
-- Migration 003: Server-side session management
-- Adds the `sessions` table so JWTs can be revoked, logout is enforced
-- server-side, refresh rotation is possible (token_version) and active
-- sessions are auditable (who, from where, last active).
--
-- Run against EXISTING databases via:
--   psql $DATABASE_URL -f database/migrations/003_session_management.sql
-- Fresh installs get the same definition from database/init.sql.
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    sid UUID UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_agent TEXT,
    ip_address VARCHAR(45),
    token_version INTEGER NOT NULL DEFAULT 1,
    issued_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ NOT NULL,
    last_active_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE sessions IS 'Server-side session store: enables token revocation, logout, refresh rotation and login audit';
COMMENT ON COLUMN sessions.token_version IS 'Incremented on each token refresh; tokens minted with an older version are rejected';
COMMENT ON COLUMN sessions.revoked_at IS 'Set on logout / account deactivation / force-logout; non-null means the session is dead';

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_sid ON sessions(sid);
CREATE INDEX IF NOT EXISTS idx_sessions_revoked ON sessions(revoked_at);