const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

const createUser = async (username, password, role) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = 'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role';
  const values = [username, hashedPassword, role];
  const result = await pool.query(query, values);
  return result.rows[0];
};

const findUserByUsername = async (username) => {
  const query = 'SELECT id, username, password_hash, role, is_active FROM users WHERE username = $1';
  const result = await pool.query(query, [username]);
  return result.rows[0] || null;
};

module.exports = { createUser, findUserByUsername };