const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
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

const DB_ROLES = [
  'super_admin',
  'managing_director',
  'director',
  'pharmacist_manager',
  'pharmacist',
  'assistant_pharmacist',
  'store_manager',
  'cashier',
  'hr_officer',
];

const normalizeRole = (role) => {
  if (role == null) return null;
  const raw = String(role).trim();
  if (!raw) return null;

  const lc = raw.toLowerCase();
  const compact = lc.replace(/[\s-]+/g, '_'); // "store manager" -> "store_manager"

  const aliases = {
    super_admin: 'super_admin',
    superadmin: 'super_admin',
    admin: 'super_admin',
    managing_director: 'managing_director',
    managingdirector: 'managing_director',
    md: 'managing_director',
    director: 'director',
    pharmacist_manager: 'pharmacist_manager',
    pharmacistmanager: 'pharmacist_manager',
    pharmacist: 'pharmacist',
    assistant_pharmacist: 'assistant_pharmacist',
    assistant: 'assistant_pharmacist',
    store_manager: 'store_manager',
    storemanager: 'store_manager',
    cashier: 'cashier',
    hr_officer: 'hr_officer',
    hrofficer: 'hr_officer',
    hr: 'hr_officer',
  };

  return aliases[compact] || null;
};

const createUser = async ({ username, password, role, full_name, email }, client = pool) => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole || !DB_ROLES.includes(normalizedRole)) {
    const err = new Error('Invalid role');
    err.code = 'INVALID_ROLE';
    throw err;
  }

  if (!full_name || !String(full_name).trim()) {
    const err = new Error('full_name is required');
    err.code = 'INVALID_FULL_NAME';
    throw err;
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  
  // Try full schema first (with email and full_name), fallback to minimal schema
  let query, values, result;
  try {
    // Full schema: username, password_hash, email, role, full_name
    query = `
      INSERT INTO users (username, password_hash, email, role, full_name)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, username, email, role, full_name, is_active, created_at
    `;
    values = [username, hashedPassword, email || null, normalizedRole, full_name];
    result = await client.query(query, values);
    return result.rows[0];
  } catch (err) {
    // If full_name or email columns don't exist, try minimal schema
    if (err.code === '42703' && (err.message.includes('email') || err.message.includes('full_name'))) {
      try {
        // Minimal schema: username, password_hash, role only
        query = `
          INSERT INTO users (username, password_hash, role)
          VALUES ($1, $2, $3)
          RETURNING id, username, role, created_at
        `;
        values = [username, hashedPassword, normalizedRole];
        result = await client.query(query, values);
        // Add missing fields for API consistency
        return { 
          ...result.rows[0], 
          email: email || null, 
          full_name: full_name || null,
          is_active: true 
        };
      } catch (err2) {
        throw err2;
      }
    }
    throw err;
  }
};

const findUserByUsername = async (username) => {
  // Try full schema first, fallback to minimal schema
  try {
    const query = 'SELECT id, username, password_hash, role, email, full_name, is_active FROM users WHERE username = $1';
    const result = await pool.query(query, [username]);
    return result.rows[0] || null;
  } catch (err) {
    if (err.code === '42703') {
      // Minimal schema: only id, username, password_hash, role
      const query = 'SELECT id, username, password_hash, role FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);
      if (result.rows[0]) {
        return { 
          ...result.rows[0], 
          email: null, 
          full_name: null,
          is_active: true 
        };
      }
      return null;
    }
    throw err;
  }
};

const findUserById = async (id) => {
  // Try full schema first, fallback to minimal schema
  try {
    const query = 'SELECT id, username, password_hash, role, email, full_name, is_active FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (err) {
    if (err.code === '42703') {
      // Minimal schema: only id, username, password_hash, role
      const query = 'SELECT id, username, password_hash, role FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);
      if (result.rows[0]) {
        return {
          ...result.rows[0],
          email: null,
          full_name: null,
          is_active: true
        };
      }
      return null;
    }
    throw err;
  }
};

const listUsers = async () => {
  const query = `
    SELECT id, username, email, role, full_name, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  const result = await pool.query(query);
  return result.rows;
};

const setUserActive = async (id, isActive) => {
  const query = `
    UPDATE users
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, username, email, role, full_name, is_active
  `;
  const result = await pool.query(query, [isActive, id]);
  return result.rows[0] || null;
};

const setUserPassword = async (id, password) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const query = `
    UPDATE users
    SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING id, username, email, role, full_name, is_active
  `;
  const result = await pool.query(query, [hashedPassword, id]);
  return result.rows[0] || null;
};

module.exports = { createUser, findUserByUsername, findUserById, listUsers, setUserActive, setUserPassword, normalizeRole, DB_ROLES, pool };
