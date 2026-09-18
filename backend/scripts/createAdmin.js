/**
 * First-run bootstrap: create or reset the super admin account.
 *
 * The public /register endpoint no longer accepts roles, so a real
 * administrator must be provisioned through this script (or via
 * POST /api/auth/users as an existing super_admin/managing_director).
 *
 * Usage:
 *   ADMIN_USERNAME=admin ADMIN_PASSWORD='<strong>' ADMIN_EMAIL='admin@metmma.pharmacy' node scripts/createAdmin.js
 *   # or positional:
 *   node scripts/createAdmin.js admin '<strong-password>' admin@metmma.pharmacy
 *
 * This script creates a bcrypt-hashed `super_admin` user. If the username
 * already exists it is promoted to super_admin and its password reset.
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const isProduction = process.env.DATABASE_URL !== undefined;
const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  user: isProduction ? undefined : (process.env.DB_USER || 'metmma_user'),
  host: isProduction ? undefined : (process.env.DB_HOST || 'localhost'),
  database: isProduction ? undefined : (process.env.DB_NAME || 'metmma_pharmacy'),
  password: isProduction ? undefined : (process.env.DB_PASSWORD || 'SecurePass123!'),
  port: isProduction ? undefined : (process.env.DB_PORT || 5432),
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

const [,, posUsername, posPassword, posEmail] = process.argv;

const username = posUsername || process.env.ADMIN_USERNAME || 'admin';
const password = posPassword || process.env.ADMIN_PASSWORD;
const email = posEmail || process.env.ADMIN_EMAIL || 'admin@metmma.pharmacy';

if (!password || password.length < 8) {
  console.error('ERROR: A strong ADMIN_PASSWORD (>= 8 chars) is required.');
  console.error('  ADMIN_USERNAME=admin ADMIN_PASSWORD="<strong>" node scripts/createAdmin.js');
  process.exit(1);
}

const run = async () => {
  const client = await pool.connect();
  try {
    const hash = await bcrypt.hash(password, 12);

    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existing.rows.length === 0) {
      await client.query(
        `INSERT INTO users (username, password_hash, email, role, full_name, is_active)
         VALUES ($1, $2, $3, 'super_admin', 'System Administrator', TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [username, hash, email]
      );
    } else {
      await client.query(
        `UPDATE users
         SET password_hash = $1, email = $2, role = 'super_admin', is_active = TRUE,
             updated_at = CURRENT_TIMESTAMP
         WHERE username = $3`,
        [hash, email, username]
      );
    }

    await client.query('COMMIT');
    console.log(`✔ Super admin '${username}' provisioned (role: super_admin).`);
    console.log(`  Username: ${username}`);
    console.log(`  Email:    ${email}`);
    console.log('  Password: ******** (hashed with bcrypt)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('ERROR: Failed to provision super admin:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
};

run();