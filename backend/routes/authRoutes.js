const express = require('express');
const Joi = require('joi');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { createUser, findUserByUsername, normalizeRole, DB_ROLES } = require('../models/user');

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

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role 
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      { expiresIn: '24h' }
    );

    // Return token and user info
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
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role, full_name, email } = value;

    // Create user
    const user = await createUser({ username, password, role, full_name, email });

    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Username already exists' });
    } else if (err.code === 'INVALID_ROLE' || err.code === 'INVALID_FULL_NAME') {
      res.status(400).json({ error: err.message });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// POST /api/auth/login
router.post('/login', loginHandler);

// Create a separate router for login endpoint at /api/login
const loginRouter = express.Router();
loginRouter.post('/', loginHandler);

module.exports = router;
module.exports.loginRouter = loginRouter;