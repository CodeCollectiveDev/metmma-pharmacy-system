const express = require('express');
const Joi = require('joi');
const { createUser } = require('../models/user');

const router = express.Router();

// Validation schema
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('Admin', 'Pharmacist', 'Cashier').required()
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    // Validate input
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { username, password, role } = value;

    // Create user
    const user = await createUser(username, password, role);

    res.status(201).json({ message: 'User created successfully', user });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(409).json({ error: 'Username already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

module.exports = router;