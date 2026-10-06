const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { resolve, join } = require('node:path');
const vm = require('node:vm');

const scripts = resolve(__dirname, '../scripts');
const sql = resolve(__dirname, '../../database');

function layout(t, packaged) {
  const root = mkdtempSync(join(tmpdir(), 'metmma-database-test-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const backend = join(root, 'backend');
  cpSync(scripts, join(backend, 'scripts'), { recursive: true });
  const database = packaged ? join(backend, 'database') : join(root, 'database');
  cpSync(sql, database, { recursive: true });
  return { root, backend, database };
}

// Exercise the actual scripts and SQL files, substituting only the DB transport.
async function runScript(backend, name, { count = 0, args = [], failOn } = {}) {
  const queries = [];
  const errors = [];
  let released = false;
  let ended = false;
  const client = {
    async query(query) {
      const text = typeof query === 'string' ? query : query.text;
      queries.push(text);
      if (failOn?.(text)) throw new Error('Simulated database failure');
      return { rows: [{ count }] };
    },
    release() { released = true; },
  };
  const processStub = { env: {}, argv: ['node', name, ...args] };
  await vm.runInNewContext(readFileSync(join(backend, 'scripts', name), 'utf8'), {
    __dirname: join(backend, 'scripts'),
    process: processStub,
    console: { info() {}, error(error) { errors.push(String(error)); } },
    require(module) {
      if (module === 'dotenv') return { config() {} };
      if (module === '../api/db') return { pool: {
        async connect() { return client; },
        async end() { ended = true; },
      } };
      if (module === './database-path') return require(join(backend, 'scripts/database-path'));
      return require(module);
    },
  });
  assert.equal(released, true);
  assert.equal(ended, true);
  return { queries, errors, status: processStub.exitCode || 0 };
}

for (const packaged of [false, true]) {
  test(`initialize and migrate using the ${packaged ? 'PM2 release' : 'repository/Docker'} layout`, async t => {
    const { backend } = layout(t, packaged);
    const init = await runScript(backend, 'init-database.js', { args: ['--if-empty'] });
    assert.equal(init.status, 0, init.errors.join('\n'));
    assert.ok(init.queries.some(query => query.includes('CREATE TABLE IF NOT EXISTS employees')));
    assert.equal(init.queries.at(-1), 'COMMIT');

    const migrations = await runScript(backend, 'migrate.js', { args: ['up'] });
    assert.equal(migrations.status, 0, migrations.errors.join('\n'));
    assert.equal(migrations.queries.filter(query => query.includes('BEGIN;')).length, 4);
    assert.ok(migrations.queries.some(query => query.includes('CREATE TABLE IF NOT EXISTS employee_leave')));
  });
}

test('bundled SQL takes precedence over an unrelated database folder beside the release', t => {
  const { root, backend, database } = layout(t, true);
  mkdirSync(join(root, 'database'));
  writeFileSync(join(root, 'database/init.sql'), 'stale SQL');
  assert.equal(require(join(backend, 'scripts/database-path')), database);
});

test('missing SQL fails with an actionable error', t => {
  const { backend, database } = layout(t, true);
  rmSync(database, { recursive: true });
  assert.throws(() => require(join(backend, 'scripts/database-path')), /Database SQL files are missing/);
});

test('--if-empty skips an existing database without deleting users or changing tables', async t => {
  const { backend } = layout(t, true);
  const result = await runScript(backend, 'init-database.js', { count: 10, args: ['--if-empty'] });
  assert.equal(result.status, 0);
  assert.equal(result.queries.length, 4); // BEGIN, lock, table count, COMMIT
  assert.equal(result.queries.at(-1), 'COMMIT');
  assert.ok(result.queries.every(query => !/DELETE|CREATE|ALTER/.test(query)));
});

test('explicit initialization still rejects an existing database', async t => {
  const { backend } = layout(t, true);
  const result = await runScript(backend, 'init-database.js', { count: 10 });
  assert.equal(result.status, 1);
  assert.match(result.errors[0], /empty public schema/);
  assert.equal(result.queries.at(-1), 'ROLLBACK');
});

test('--if-empty does not suppress SQL or database inspection failures', async t => {
  const { backend } = layout(t, true);
  for (const fragment of ['CREATE TABLE', 'SELECT count(*)']) {
    const result = await runScript(backend, 'init-database.js', {
      args: ['--if-empty'], failOn: query => query.includes(fragment),
    });
    assert.equal(result.status, 1);
    assert.match(result.errors[0], /Simulated database failure/);
    assert.equal(result.queries.at(-1), 'ROLLBACK');
    assert.ok(!result.queries.includes('COMMIT'));
  }
});
