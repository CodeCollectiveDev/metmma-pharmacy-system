const { test } = require('node:test');
const assert = require('node:assert/strict');

let queries = [];
const client = { query: async (sql, values = []) => {
  queries.push({ sql, values });
  if (sql.startsWith('SELECT id,quantity FROM products')) return { rows: [{ id: 1, quantity: 5 }], rowCount: 1 };
  if (sql.startsWith('SELECT $1::date>=CURRENT_DATE')) {
    const today = new Date().toISOString().slice(0, 10);
    return { rows: [{ valid: String(values[0]) >= today }], rowCount: 1 };
  }
  if (sql.startsWith('SELECT id FROM categories')) return { rows: [{ id: 2 }], rowCount: 1 };
  if (sql.startsWith('UPDATE products SET')) {
    return { rows: [{
      id: 1, product_code: 'P-1', name: 'Corrected name', generic_name: 'Generic', batch_number: 'B-2',
      expiry_date: '2030-01-01', quantity: 5, unit_price: '12.00', selling_price: '12.00', cost_price: '8.00',
      supplier: 'Acme', category: 'Antibiotics', reorder_level: 4, location: 'Shelf A', barcode: '123',
      is_active: true, expired: false
    }], rowCount: 1 };
  }
  throw new Error(`Unexpected query: ${sql}`);
} };
const db = { pool: { query: client.query }, query: client.query, transaction: work => work(client) };
require.cache[require.resolve('../api/db')] = { exports: db };
const { updateProduct } = require('../api/controllers/productsController');

function response() {
  return { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

test('rejects moving an expiry date into the past without updating the product', async () => {
  queries = [];
  await assert.rejects(
    () => updateProduct({ params: { id: '1' }, body: { expiryDate: '2020-01-01' }, user: { id: 1 } }, response()),
    error => error.code === 'VALIDATION' && error.status === 400 && error.fields[0] === 'expiryDate'
  );
  assert.ok(!queries.some(query => query.sql.startsWith('UPDATE products SET')));
});

test('updates product details without changing stock', async () => {
  queries = [];
  const res = response();
  await updateProduct({
    params: { id: '1' },
    body: {
      name: 'Corrected name', genericName: 'Generic', batchNumber: 'B-2', expiryDate: '2030-01-01',
      sellingPrice: 12, costPrice: 8, supplier: 'Acme', category: 'Antibiotics',
      reorderLevel: 4, location: 'Shelf A', barcode: '123'
    },
    user: { id: 1 }
  }, res);

  const update = queries.find(query => query.sql.startsWith('UPDATE products SET'));
  assert.ok(update);
  assert.doesNotMatch(update.sql, /quantity=/);
  assert.ok(!queries.some(query => query.sql.includes('stock_movements')));
  assert.equal(res.body.data.name, 'Corrected name');
});
