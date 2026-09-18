const express = require('express');
const { randomUUID } = require('node:crypto');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByUsername, findUserById, listUsers, setUserActive, setUserPassword, normalizeRole, DB_ROLES, pool } = require('../models/user');
const { authenticate, authorize, ROLES } = require('../middleware/roleMiddleware');
const {
  createSession,
  findSessionBySid,
  revokeSession,
  revokeSessionsForUser,
  bumpTokenVersion,
  listActiveSessions,
  listSessionsForUser,
} = require('../models/session');
const {
  JWT_SECRET,
  ACCESS_TOKEN_TTL,
  REFRESH_TOKEN_TTL,
  ACCESS_TOKEN_TTL_MS,
  REFRESH_TOKEN_TTL_MS,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
} = require('../config/jwt');

const router = express.Router();

// Validation schemas
const createUserSchema = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  full_name: Joi.string().trim().min(1).max(100).required(),
  email: Joi.string().trim().email().max(100).optional().empty(''),
  role: Joi.string()
    .trim()
    .required()
    .custom((value, helpers) => {
      const normalized = normalizeRole(value);
      if (!normalized || !DB_ROLES.includes(normalized)) {
        return helpers.error('any.invalid');
      }
      return normalized;
    }, 'role normalization')
});

const loginSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().required()
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
});

const setActiveSchema = Joi.object({
  is_active: Joi.boolean().required()
});

const setPasswordSchema = Joi.object({
  password: Joi.string().min(8).required()
});

const signAccessToken = ({ id, username, role }, sid, ver) =>
  jwt.sign(
    { sub: String(id), username, role, sid, ver },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  );

const signRefreshToken = ({ id }, sid, ver) =>
  jwt.sign(
    { sub: String(id), sid, ver, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_TTL, issuer: TOKEN_ISSUER, audience: TOKEN_AUDIENCE }
  );

const publicUser = (user) => ({
  id: user.id,
  username: user.username,
  role: user.role,
});

// Verify a refresh token, returning its claims or throwing a labeled error.
const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, JWT_SECRET, {
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });
  if (!decoded.sid || !decoded.sub || decoded.type !== 'refresh') {
    throw new Error('INVALID');
  }
  return decoded;
};

// Login handler function (reusable)
const loginHandler = async (req, res) => {
  try {
    // Validate input
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = value;

    // Find user by username
    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check if user is active (default to true if column doesn't exist because we are using a default value)
    if (user.is_active === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create a server-side session record so tokens can be revoked / audited.
    const sid = randomUUID();
    await createSession({
      sid,
      userId: user.id,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || req.socket?.remoteAddress || null,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    });

    const token = signAccessToken(user, sid, 1);
    const refreshToken = signRefreshToken(user, sid, 1);

    // Return tokens and user info
    res.json({
      token,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MS,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/refresh
// Exchange a valid, non-revoked refresh token for a fresh access+refresh pair.
// Rotation: the session's token_version is bumped, invalidating all tokens
// previously issued to this session (see authenticate / verifyRefreshToken).
router.post('/refresh', async (req, res) => {
  try {
    const { error, value } = refreshSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(value.refreshToken);
    } catch (err) {
      return res.status(401).json({ error: 'Invalid or expired refresh token.' });
    }

    const session = await findSessionBySid(decoded.sid);
    if (!session || session.revoked_at) {
      return res.status(401).json({ error: 'Session has been revoked. Please login again.' });
    }
    if (new Date(session.expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    if (decoded.ver !== session.token_version) {
      return res.status(401).json({ error: 'Refresh token has already been used. Please login again.' });
    }

    // Resolve the user from the DB so a changed role/status takes effect immediately.
    const latest = await findUserById(decoded.sub);
    if (!latest) {
      return res.status(401).json({ error: 'Account no longer exists.' });
    }
    if (latest.is_active === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const nextVer = await bumpTokenVersion(decoded.sid, new Date(Date.now() + REFRESH_TOKEN_TTL_MS));
    if (!nextVer) {
      return res.status(401).json({ error: 'Session is no longer active. Please login again.' });
    }

    const token = signAccessToken(latest, decoded.sid, nextVer.token_version);
    const refreshToken = signRefreshToken(latest, decoded.sid, nextVer.token_version);

    res.json({
      token,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_MS,
      user: publicUser(latest),
    });
  } catch (err) {
    console.error('Refresh error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/logout
// Revoke the calling session server-side so the tokens stop working immediately.
router.post('/logout', authenticate, async (req, res) => {
  try {
    await revokeSession(req.user.sid);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/sessions/me
// List the current user's own sessions (audit / "log out other devices" view).
router.get('/sessions/me', authenticate, async (req, res) => {
  try {
    const sessions = await listSessionsForUser(req.user.id);
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('List own sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/sessions/revoke-all
// Force logout from every device for the current user.
router.post('/sessions/revoke-all', authenticate, async (req, res) => {
  try {
    await revokeSessionsForUser(req.user.id);
    res.json({ message: 'All sessions have been revoked' });
  } catch (err) {
    console.error('Revoke all sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/sessions (admin)
// Session audit: who is logged in, from where, last active, expiry.
router.get('/sessions', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR), async (req, res) => {
  try {
    const sessions = await listActiveSessions();
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('List sessions error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/users
// Protected: only a super_admin or managing_director can provision new accounts.
// Public self-registration was removed for security (see issues/issue1.md).
router.post('/users', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR), async (req, res) => {
  let client;
  let transactionStarted = false;

  try {
    // Validate input
    const { error, value } = createUserSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role, full_name, email } = value;
    client = await pool.connect();
    await client.query('BEGIN');
    transactionStarted = true;

    // Create user in users table
    const user = await createUser({ username, password, role, full_name, email }, client);
    await client.query('COMMIT');
    transactionStarted = false;

    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    if (client && transactionStarted) {
      await client.query('ROLLBACK');
    }

    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Username already exists' });
    } else if (err.code === 'INVALID_ROLE' || err.code === 'INVALID_FULL_NAME') {
      res.status(400).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client?.release();
  }
});

// GET /api/auth/users
// Protected: list all accounts for provisioning/audit.
router.get('/users', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR), async (req, res) => {
  try {
    const users = await listUsers();
    res.json({ success: true, data: users });
  } catch (err) {
    console.error('List users error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/users/:id/active
// Protected: enable/disable an account (offboarding).
// Disabling an account immediately revokes all of its sessions.
router.patch('/users/:id/active', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR), async (req, res) => {
  try {
    const { error, value } = setActiveSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await setUserActive(req.params.id, value.is_active);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!value.is_active) {
      await revokeSessionsForUser(user.id);
    }

    res.json({ message: 'User status updated', user });
  } catch (err) {
    console.error('Set active error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/auth/users/:id/password
// Protected: reset another user's password (offboarding/forgot password).
router.patch('/users/:id/password', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.MANAGING_DIRECTOR), async (req, res) => {
  try {
    const { error, value } = setPasswordSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const user = await setUserPassword(req.params.id, value.password);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User password updated', user });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/auth/login
router.post('/login', loginHandler);

// Create a separate router for login endpoint at /api/login
const loginRouter = express.Router();
loginRouter.post('/', loginHandler);

module.exports = router;
module.exports.loginRouter = loginRouter;