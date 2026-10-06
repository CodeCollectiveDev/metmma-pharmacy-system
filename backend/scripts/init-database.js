// Strict first-install operation; --if-empty lets deployments skip an existing DB.
require('dotenv').config({ quiet: true });
if (process.env.MIGRATION_DATABASE_URL) process.env.DATABASE_URL = process.env.MIGRATION_DATABASE_URL;
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const databasePath = require('./database-path');
const { pool } = require('../api/db');
(async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT pg_advisory_xact_lock(hashtextextended('metmma:migrations',0))");
    const { rows } = await client.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'");
    if (rows[0].count) {
      if (!process.argv.includes('--if-empty')) throw new Error('Initialization requires an empty public schema. Existing database preserved.');
      await client.query('COMMIT');
      console.info('Existing database detected; skipping initialization and preserving data.');
      return;
    }
    await client.query(readFileSync(resolve(databasePath, 'init.sql'), 'utf8'));
    // init.sql is also the development fixture. Production starts without demo users.
    await client.query('DELETE FROM users');
    await client.query('COMMIT');
    console.info('Empty database initialized without sample accounts. Run migrations, then bootstrap an administrator.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
