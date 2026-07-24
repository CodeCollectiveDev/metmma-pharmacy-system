const { query } = require('../api/db');

const SESSION_TIMEOUT_MINUTES = 15;

const checkAndRefreshSession = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    const result = await query(
      `UPDATE sessions
       SET last_activity = CURRENT_TIMESTAMP
       WHERE user_id = $1
         AND last_activity > NOW() - INTERVAL '1 minute' * $2
       RETURNING id`,
      [userId, SESSION_TIMEOUT_MINUTES]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        error: 'Session expired due to inactivity. Please log in again.'
      });
    }

    req.sessionId = result.rows[0].id;
    next();
  } catch (err) {
    console.error('Session check/update error:', err);
    return res.status(500).json({ error: 'Session validation failed.' });
  }
};

const createSession = async (userId, token, ipAddress, userAgent) => {
  try {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await query(
      `INSERT INTO sessions (user_id, token, last_activity, expires_at, ip_address, user_agent)
       VALUES ($1, $2, CURRENT_TIMESTAMP, $3, $4, $5)`,
      [userId, token, expiresAt, ipAddress || null, userAgent || null]
    );
  } catch (err) {
    console.error('Create session error:', err);
  }
};

const invalidateSession = async (userId) => {
  try {
    await query('DELETE FROM sessions WHERE user_id = $1', [userId]);
  } catch (err) {
    console.error('Invalidate session error:', err);
  }
};

const invalidateSessionByToken = async (token) => {
  try {
    await query('DELETE FROM sessions WHERE token = $1', [token]);
  } catch (err) {
    console.error('Invalidate session by token error:', err);
  }
};

module.exports = {
  checkAndRefreshSession,
  createSession,
  invalidateSession,
  invalidateSessionByToken,
  SESSION_TIMEOUT_MINUTES
};
