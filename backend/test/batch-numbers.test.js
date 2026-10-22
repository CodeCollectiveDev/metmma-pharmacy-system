const { test } = require('node:test');
const assert = require('node:assert/strict');

let calls = [];
const stored = [];
const client = { query: async (sql, values = []) => {
  calls.push({ sql, values });
  if (sql.startsWith('SELECT $1::date>=CURRENT_DATE')) {
    const today = new Date().toISOString().slice(0, 10);
    return { rows: [{ valid: String(values[0]) >= today }], rowCount: 1 };
  }
  if (sql.startsWith('SELECT id FROM categories')) return { rows: [{ id: 2 }], rowCount: 1 };
  if (sql.startsWith('SELECT COUNT(*)')) return { rows: [{ count: '0' }], rowCount: 1 };
  if (sql.startsWith('SELECT id,name,product_code,batch_number')) {
    return stored.length ? { rows: [stored[0]], rowCount: 1 } : { rows: [], rowCount: 0 };
  }
  if (sql.startsWith('INSERT INTO products')) {
    const row = {
      id: 7, product_code: values[0], name: values[1], generic_name: values[2], batch_number: values[3],
      expiry_date: values[4], quantity: values[5], unit_price: values[6], selling_price: values[7],
      cost_price: values[8], supplier: values[9], category: values[10], reorder_level: values[11],
      location: values[12], barcode: values[13], is_active: true, expired: false
    };
    return { rows: [row], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
} };
const db = { query: client.query, transaction: async work => work(client) };
require.cache[require.resolve('../api/db')] = { exports: db };
const { createProduct } = require('../api/controllers/productsController');
const { createProductSchema } = require('../api/validators/productValidator');

const response = () => {
  const res = { _status: 200, _body: undefined, status(code) { res._status = code; return res; }, json(value) { res._body = value; } };
  return res;
};
const payload = overrides => ({ productCode: 'P-1', name: 'Paracetamol', batchNumber: 'abc-01', expiryDate: '2030-01-01', quantity: 1, unitPrice: 10, sellingPrice: 12, category: 'Antibiotics', reorderLevel: 1, ...overrides });

test('the validator uppercases a batch number before it is used', () => {
  const { value } = createProductSchema.validate(payload({}), { abortEarly: false });
  assert.equal(value.batchNumber, 'ABC-01');
});

test('batch number lookups stay case-insensitive after normalisation', async () => {
  calls = [];
  const response = await (async () => {
    const { getAllProducts } = require('../api/controllers/productsController');
    const req = { validatedQuery: { page: 1, limit: 50, search: 'abc-01' } };
    const res = { json() {} };
    await getAllProducts(req, res);
    return calls;
  })();
  const search = response.find(call => call.sql.includes('lower(batch_number)'));
  assert.ok(search);
  assert.ok(search.sql.includes('lower(batch_number) LIKE'));
  assert.equal(search.values[0], '%abc-01%');
});

test('the normalised batch number is what gets stored on create', async () => {
  calls = [];
  stored.length = 0;
  const body = createProductSchema.validate(payload({ batchNumber: 'abc-01' }), { abortEarly: false }).value;
  const res = response();
  await createProduct({ body, user: { id: 1 } }, res);
  const insert = calls.find(call => call.sql.startsWith('INSERT INTO products'));
  assert.equal(insert.values[3], 'ABC-01');
  assert.equal(res._body.data.batchNumber, 'ABC-01');
  assert.equal(res._body.duplicateBatch, undefined);
});

test('create returns a non-blocking duplicateBatch advisory when name and batch already exist', async () => {
  calls = [];
  stored.length = 0;
  stored.push({ id: 3, name: 'Paracetamol', product_code: 'P-OLD', batch_number: 'ABC-01', expiry_date: '2030-01-01', quantity: 4 });
  const body = createProductSchema.validate(payload({ batchNumber: 'abc-01', name: 'Paracetamol' }), { abortEarly: false }).value;
  const res = response();
  await createProduct({ body, user: { id: 1 } }, res);
  assert.equal(res._status, 201);
  assert.equal(res._body.success, true);
  assert.deepEqual(res._body.duplicateBatch, { id: 3, name: 'Paracetamol', productCode: 'P-OLD', batchNumber: 'ABC-01', expiryDate: '2030-01-01', quantity: 4 });
});
