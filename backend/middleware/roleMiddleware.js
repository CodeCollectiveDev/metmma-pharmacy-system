const jwt = require('jsonwebtoken');
const { JWT_SECRET, TOKEN_ISSUER, TOKEN_AUDIENCE } = require('../config/jwt');
const { findSessionBySid, touchLastActive } = require('../models/session');

/**
 * Middleware to verify the JWT access token AND that its server-side session
 * is still valid (not revoked / not expired / correct token version).
 * Attaches resolved user info to req.user.
 */
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET, {
      issuer: TOKEN_ISSUER,
      audience: TOKEN_AUDIENCE,
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
  }

  if (!decoded.sid || !decoded.sub) {
    return res.status(401).json({ error: 'Invalid token.' });
  }

  try {
    const session = await findSessionBySid(decoded.sid);
    if (!session || session.revoked_at) {
      return res.status(401).json({ error: 'Session has been revoked. Please login again.' });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    if (decoded.ver !== undefined && decoded.ver !== session.token_version) {
      return res.status(401).json({ error: 'Session was refreshed. Please login again.' });
    }

    // Throttled last-active update (no more than one write per minute per session)
    const idleMs = Date.now() - new Date(session.last_active_at).getTime();
    if (idleMs > 60 * 1000) {
      touchLastActive(decoded.sid).catch(() => {});
    }

    req.user = {
      id: Number(decoded.sub),
      username: decoded.username,
      role: decoded.role,
      sid: decoded.sid,
    };
    next();
  } catch (err) {
    console.error('Session lookup error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Middleware factory to check if user has required role(s)
 * @param  {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 * 
 * Usage:
 *   router.post('/employees', authenticate, authorize('Admin', 'HR'), createEmployee);
 *   router.get('/reports', authenticate, authorize('Admin'), getReports);
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // User must be authenticated first
    if (!req.user) {
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    // Check if user's role is in the allowed roles
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Forbidden. You do not have permission to perform this action.',
        required: allowedRoles,
        your_role: req.user.role
      });
    }

    next();
  };
};

/**
 * Combined middleware: authenticate + authorize in one call
 * @param  {...string} allowedRoles - Roles that are allowed
 * @returns {Array} Array of middleware functions
 * 
 * Usage:
 *   router.post('/employees', requireRole('Admin', 'HR'), createEmployee);
 */
const requireRole = (...allowedRoles) => {
  return [authenticate, authorize(...allowedRoles)];
};

// Role constants for consistency
const ROLES = {
  LEGACY_ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MANAGING_DIRECTOR: 'managing_director',
  DIRECTOR: 'director',
  PHARMACIST_MANAGER: 'pharmacist_manager',
  PHARMACIST: 'pharmacist',
  ASSISTANT_PHARMACIST: 'assistant_pharmacist',
  STORE_MANAGER: 'store_manager',
  CASHIER: 'cashier',
  HR_OFFICER: 'hr_officer',
};

module.exports = {
  authenticate,
  authorize,
  requireRole,
  ROLES
};

