const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.DATABASE_URL !== undefined;
const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  user: isProduction ? undefined : process.env.DB_USER,
  host: isProduction ? undefined : process.env.DB_HOST,
  database: isProduction ? undefined : process.env.DB_NAME,
  password: isProduction ? undefined : process.env.DB_PASSWORD,
  port: isProduction ? undefined : process.env.DB_PORT,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

const createSession = async ({ sid, userId, userAgent, ipAddress, expiresAt }) => {
  const result = await pool.query(
    `INSERT INTO sessions (sid, user_id, user_agent, ip_address, expires_at, last_active_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
     RETURNING id, sid, user_id, user_agent, ip_address, token_version,
               issued_at, expires_at, last_active_at, revoked_at`,
    [sid, userId, userAgent || null, ipAddress || null, expiresAt]
  );
  return result.rows[0];
};

const findSessionBySid = async (sid) => {
  const result = await pool.query('SELECT * FROM sessions WHERE sid = $1', [sid]);
  return result.rows[0] || null;
};

const revokeSession = async (sid) => {
  const result = await pool.query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
     WHERE sid = $1
     RETURNING id`,
    [sid]
  );
  return result.rows[0] || null;
};

const revokeSessionsForUser = async (userId) => {
  const result = await pool.query(
    `UPDATE sessions
     SET revoked_at = COALESCE(revoked_at, CURRENT_TIMESTAMP)
     WHERE user_id = $1 AND revoked_at IS NULL
     RETURNING id`,
    [userId]
  );
  return result.rowCount;
};

// Called on refresh: rotate the token version (kills all previously issued
// access/refresh tokens for this session) and extend the session TTL.
const bumpTokenVersion = async (sid, expiresAt) => {
  const result = await pool.query(
    `UPDATE sessions
     SET token_version = token_version + 1,
         expires_at = $2,
         last_active_at = CURRENT_TIMESTAMP
     WHERE sid = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
     RETURNING token_version, expires_at`,
    [sid, expiresAt]
  );
  return result.rows[0] || null;
};

const touchLastActive = async (sid) => {
  const result = await pool.query(
    `UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE sid = $1`,
    [sid]
  );
  return result.rowCount;
};

const listActiveSessions = async () => {
  const result = await pool.query(
    `SELECT s.sid, s.user_id, u.username, u.role, u.full_name,
            s.user_agent, s.ip_address,
            s.issued_at, s.expires_at, s.last_active_at, s.revoked_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.revoked_at IS NULL AND s.expires_at > CURRENT_TIMESTAMP
     ORDER BY s.last_active_at DESC`
  );
  return result.rows;
};

const listSessionsForUser = async (userId) => {
  const result = await pool.query(
    `SELECT s.sid, s.user_id, u.username, u.role,
            s.user_agent, s.ip_address,
            s.issued_at, s.expires_at, s.last_active_at, s.revoked_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.user_id = $1
     ORDER BY s.last_active_at DESC`,
    [userId]
  );
  return result.rows;
};

module.exports = {
  createSession,
  findSessionBySid,
  revokeSession,
  revokeSessionsForUser,
  bumpTokenVersion,
  touchLastActive,
  listActiveSessions,
  listSessionsForUser,
};