const { test } = require('node:test');
const assert = require('node:assert/strict');

let calls = [];
let handler = async () => ({ rows: [], rowCount: 0 });
const client = { query: async (sql, values = []) => { calls.push({ sql, values }); return handler(sql, values); } };
const db = { query: client.query, transaction: async work => work(client) };
require.cache[require.resolve('../api/db')] = { exports: db };
const categories = require('../api/controllers/categoriesController');
const products = require('../api/controllers/productsController');

const response = () => {
  const res = { _status: 200, _body: undefined, status(code) { res._status = code; return res; }, json(value) { res._body = value; } };
  return res;
};

test('active categories are listed in configured order', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 1, name: 'Vitamins', sortOrder: 30, isActive: true }], rowCount: 1 });
  const res = response();
  await categories.getCategories({ validatedQuery: { all: false }, user: { role: 'cashier' } }, res);
  assert.match(calls[0].sql, /WHERE is_active=TRUE/);
  assert.match(calls[0].sql, /ORDER BY sort_order ASC,name ASC,id ASC/);
  assert.deepEqual(res._body.data, [{ id: 1, name: 'Vitamins', sortOrder: 30, isActive: true }]);
});

test('only an administrator can list deactivated categories', async () => {
  await assert.rejects(
    categories.getCategories({ validatedQuery: { all: true }, user: { role: 'pharmacist' } }, response()),
    error => error.code === 'PERMISSION_DENIED' && error.status === 403
  );
});

test('creating a category stores its name and order', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 8, name: 'Baby care', sortOrder: 80, isActive: true }], rowCount: 1 });
  const res = response();
  await categories.createCategory({ body: { name: 'Baby care', sortOrder: 80 } }, res);
  assert.equal(res._status, 201);
  assert.match(calls[0].sql, /INSERT INTO categories/);
  assert.deepEqual(calls[0].values, ['Baby care', 80]);
  assert.deepEqual(res._body.data, { id: 8, name: 'Baby care', sortOrder: 80, isActive: true });
});

test('renaming and deactivating a category are partial updates', async () => {
  calls = [];
  handler = async () => ({ rows: [{ id: 2, name: 'Pain relief', sortOrder: 20, isActive: false }], rowCount: 1 });
  const res = response();
  await categories.updateCategory({ params: { id: 2 }, body: { name: 'Pain relief', isActive: false } }, res);
  assert.match(calls[0].sql, /UPDATE categories SET name=COALESCE/);
  assert.deepEqual(calls[0].values, [2, 'Pain relief', null, false]);
  assert.equal(res._body.data.isActive, false);
});

test('missing categories return not found', async () => {
  handler = async () => ({ rows: [], rowCount: 0 });
  await assert.rejects(
    categories.updateCategory({ params: { id: 99 }, body: { isActive: false } }, response()),
    error => error.code === 'NOT_FOUND' && error.status === 404
  );
});

test('product creation rejects an unknown or deactivated category before inserting', async () => {
  calls = [];
  handler = async sql => sql.startsWith('SELECT $1::date')
    ? { rows: [{ valid: true }], rowCount: 1 }
    : { rows: [], rowCount: 0 };
  await assert.rejects(
    products.createProduct({ body: { productCode: 'P-1', name: 'Paracetamol', batchNumber: 'B1', expiryDate: '2030-01-01', quantity: 1, unitPrice: 10, sellingPrice: 12, category: 'Retired', reorderLevel: 1 }, user: { id: 1 } }, response()),
    error => error.code === 'VALIDATION' && error.fields.includes('category')
  );
  assert.ok(calls.some(call => call.sql.includes('FROM categories WHERE name=$1 AND is_active=TRUE')));
  assert.ok(!calls.some(call => call.sql.includes('INSERT INTO products')));
});

test('product updates reject a deactivated category before saving', async () => {
  calls = [];
  handler = async sql => {
    if (sql.startsWith('SELECT id,quantity FROM products')) return { rows: [{ id: 2, quantity: 5 }], rowCount: 1 };
    if (sql.startsWith('SELECT id,name,product_code,batch_number')) return { rows: [], rowCount: 0 };
    if (sql.includes('FROM categories WHERE name=$1 AND is_active=TRUE')) return { rows: [], rowCount: 0 };
    return { rows: [], rowCount: 0 };
  };
  await assert.rejects(
    products.updateProduct({ params: { id: 2 }, body: { category: 'Retired' }, user: { id: 1 } }, response()),
    error => error.code === 'VALIDATION' && error.fields.includes('category')
  );
  assert.ok(!calls.some(call => call.sql.includes('UPDATE products SET')));
});
