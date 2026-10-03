const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

test('every local command ignores inherited production database and TLS settings', () => {
  const path = resolve(__dirname, '../scripts/local.js');
  for (const command of ['server', 'migrate', 'bootstrap', 'test']) {
    let invocation;
    const processStub = {
      env: {
        DATABASE_URL: 'postgresql://production.example/live',
        MIGRATION_DATABASE_URL: 'postgresql://production.example/live',
        TEST_DATABASE_URL: 'postgresql://production.example/live',
        DB_SSL: 'true', DB_SSL_CA: 'production-ca',
        NODE_ENV: 'production', JWT_SECRET: 'production-secret',
        BOOTSTRAP_PASSWORD: 'user-supplied-local-password',
      },
      argv: ['node', path, command], execPath: process.execPath,
    };
    vm.runInNewContext(readFileSync(path, 'utf8'), {
      __dirname: resolve(__dirname, '../scripts'), process: processStub,
      require: name => name === 'node:child_process'
        ? { spawnSync: (...args) => { invocation = args; return { status: 0 }; } }
        : require(name),
    });
    const settings = invocation[2].env;
    assert.equal(new URL(settings.DATABASE_URL).hostname, '127.0.0.1');
    assert.equal(new URL(settings.TEST_DATABASE_URL).hostname, '127.0.0.1');
    assert.notEqual(new URL(settings.TEST_DATABASE_URL).port, new URL(settings.DATABASE_URL).port);
    assert.equal(settings.MIGRATION_DATABASE_URL, '');
    assert.equal(settings.DB_SSL, 'false');
    assert.equal(settings.DB_SSL_CA, '');
    assert.equal(settings.NODE_ENV, 'development');
    assert.notEqual(settings.JWT_SECRET, 'production-secret');
    assert.equal(settings.BOOTSTRAP_PASSWORD, 'user-supplied-local-password');
  }
});
