const jwt = require('jsonwebtoken');

/**
 * Middleware to verify JWT token and authenticate user
 * Attaches decoded user info to req.user
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid token.' });
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

