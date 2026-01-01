/**
 * Database Connection for API Controllers
 * Created by: Patrick
 * i created this because Gilberts controllers required this and not the server.ofcz we can also 
 * use the server for this since its already using the pool.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'metmma_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'metmma_pharmacy',
  password: process.env.DB_PASSWORD || 'SecurePass123!',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};