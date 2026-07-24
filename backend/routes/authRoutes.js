const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByUsername, normalizeRole, DB_ROLES } = require('../models/user');
const { createSession, invalidateSession, invalidateSessionByToken } = require('../middleware/sessionMiddleware');
const { authenticate } = require('../middleware/roleMiddleware');

const router = express.Router();

// Validation schemas
const registerSchema = Joi.object({
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

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    null
  );
};

// Login handler function (reusable)
const loginHandler = async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password } = value;

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.is_active === false) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    await createSession(
      user.id,
      token,
      getClientIp(req),
      req.headers['user-agent'] || null
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const pool = require('../api/db').pool;
  const client = await pool.connect();
  
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role, full_name, email } = value;

    await client.query('BEGIN');

    const user = await createUser({ username, password, role, full_name, email });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') {
      res.status(409).json({ error: 'Username already exists' });
    } else if (err.code === 'INVALID_ROLE' || err.code === 'INVALID_FULL_NAME') {
      res.status(400).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', loginHandler);

// POST /api/auth/logout - invalidate current session
router.post('/logout', authenticate, (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    invalidateSessionByToken(token);
  }
  res.json({ message: 'Logged out successfully' });
});

// POST /api/auth/ping - keep session alive
router.post('/ping', authenticate, (req, res) => {
  res.json({ message: 'Session active' });
});

// Create a separate router for login endpoint at /api/login
const loginRouter = express.Router();
loginRouter.post('/', loginHandler);

module.exports = router;
module.exports.loginRouter = loginRouter;
