const { test } = require('node:test');
const assert = require('node:assert/strict');

const calls = [];
let total = 51;
let rows = [{ id: 51, name: 'Later product', quantity: 2, reorder_level: 10 }];
const pool = { query: async (sql, values) => {
  calls.push({ sql, values: [...values] });
  return { rows: sql.startsWith('SELECT COUNT(*)') ? [{ count: String(total) }] : rows };
} };
require.cache[require.resolve('../api/db')] = { exports: { pool } };
const { getAllProducts } = require('../api/controllers/productsController');

const request = async (query) => {
  calls.length = 0;
  let response;
  let status = 200;
  await getAllProducts({ query }, {
    status(code) { status = code; return this; },
    json(body) { response = body; }
  });
  return { status, response };
};

test('catalogue returns coherent filtered page metadata and stable ordering', async () => {
  const { status, response } = await request({ page: '2', category: 'Sales', search: 'Later' });
  assert.equal(status, 200);
  assert.deepEqual(response.pagination, { page: 2, limit: 50, total: 51, totalPages: 2, hasMore: false });
  assert.equal(response.count, 1);
  assert.equal(response.data[0].id, 51);
  assert.match(calls[1].sql, /ORDER BY name ASC, id ASC/);
  assert.deepEqual(calls[0].values, ['%Sales%', '%Later%']);
  assert.deepEqual(calls[1].values, ['%Sales%', '%Later%', 50, 50]);
});

test('empty and past-end pages have no more results', async () => {
  rows = [];
  total = 0;
  assert.deepEqual((await request({})).response.pagination, { page: 1, limit: 50, total: 0, totalPages: 0, hasMore: false });
  total = 51;
  assert.equal((await request({ page: '3' })).response.pagination.hasMore, false);
});

test('invalid pagination is rejected before SQL execution', async () => {
  for (const query of [{ page: '0' }, { page: '-1' }, { page: '1.5' }, { limit: '0' }, { limit: 'abc' }]) {
    assert.equal((await request(query)).status, 400);
    assert.equal(calls.length, 0);
  }
});
