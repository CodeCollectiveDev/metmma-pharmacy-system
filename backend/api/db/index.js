const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.DATABASE_URL !== undefined;
const pool = new Pool({
  connectionString: isProduction ? process.env.DATABASE_URL : undefined,
  user: isProduction ? undefined : (process.env.DB_USER || 'metmma_user'),
  host: isProduction ? undefined : (process.env.DB_HOST || 'localhost'),
  database: isProduction ? undefined : (process.env.DB_NAME || 'metmma_pharmacy'),
  password: isProduction ? undefined : (process.env.DB_PASSWORD || 'SecurePass123!'),
  port: isProduction ? undefined : (process.env.DB_PORT || 5432),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected successfully');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
