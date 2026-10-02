const { Pool } = require('pg');
require('dotenv').config({ quiet: true });
// pg parses legacy timestamps without a zone using Node's time zone. Keep it aligned with the DB session.
process.env.TZ = process.env.PHARMACY_TIMEZONE || 'UTC';
const ssl = process.env.DB_SSL === 'true' ? { rejectUnauthorized: true, ...(process.env.DB_SSL_CA ? { ca: process.env.DB_SSL_CA } : {}) } : undefined;
const pool = new Pool({
  ...(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : { host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 5432), database: process.env.DB_NAME || 'metmma_pharmacy', user: process.env.DB_USER, password: process.env.DB_PASSWORD }),
  max: 20, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000,
  statement_timeout: 5000, query_timeout: 6000,
  options: `-c timezone=${process.env.PHARMACY_TIMEZONE || 'UTC'}`, ssl
});
pool.on('error', err => console.error(JSON.stringify({ event: 'database_connection_error', message: err.message, stack: err.stack })));
async function transaction(work) {
  const client = await pool.connect();
  try { await client.query('BEGIN'); await client.query("SET LOCAL lock_timeout = '3s'"); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (err) { try { await client.query('ROLLBACK'); } catch (rollbackError) { console.error(rollbackError); } throw err; }
  finally { client.release(); }
}
module.exports = { pool, query: (...args) => pool.query(...args), transaction };
