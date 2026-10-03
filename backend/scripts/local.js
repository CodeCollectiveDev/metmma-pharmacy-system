// Local commands deliberately override inherited production/.env DB settings.
const { spawnSync } = require('node:child_process');
const { readdirSync } = require('node:fs');
const { resolve } = require('node:path');

const backend = resolve(__dirname, '..');
const env = {
  ...process.env,
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://metmma_user:metmma_local_only@127.0.0.1:55432/metmma_pharmacy',
  MIGRATION_DATABASE_URL: '',
  TEST_DATABASE_URL: 'postgresql://metmma_test:metmma_test_only@127.0.0.1:55433/metmma_test',
  DB_SSL: 'false', DB_SSL_CA: '',
  PORT: '3000', TRUST_PROXY: '0',
  JWT_SECRET: 'local-development-only-secret-never-use-in-production',
  ALLOWED_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173',
  PHARMACY_TIMEZONE: 'UTC', TAX_RATE_BPS: '1650',
};
const commands = {
  server: ['--watch', 'server.js'],
  migrate: ['scripts/migrate.js', 'up'],
  bootstrap: ['scripts/bootstrap-admin.js'],
  test: ['--test', ...readdirSync(resolve(backend, 'test/integration')).filter(n => n.endsWith('.test.js')).map(n => `test/integration/${n}`)],
};
const args = commands[process.argv[2]];
if (!args) throw new Error('Use local.js server, migrate, bootstrap or test.');
const result = spawnSync(process.execPath, args, { cwd: backend, env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
