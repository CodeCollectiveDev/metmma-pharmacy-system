const { test } = require('node:test');
const assert = require('node:assert/strict');

function productRow(overrides = {}) {
  return {
    id: 1, product_code: 'P-1', name: 'Amoxicillin', generic_name: 'Amoxicillin', batch_number: 'B-1',
    expiry_date: '2030-01-01', quantity: 10, unit_price: '20.00', selling_price: '25.00', cost_price: '10.00',
    last_invoice_reference: 'INV-OLD', supplier: 'Acme', category: 'Antibiotics', reorder_level: 5,
    location: 'Shelf A', barcode: '123', is_active: true, expired: false, ...overrides
  };
}

function harness(initial = productRow()) {
  const calls = { stock: [], finance: [], updates: [] };
  let product = { ...initial };
  let previousMovement = null;
  const client = {
    async query(sql, values = []) {
      if (sql.startsWith('SELECT pg_advisory_xact_lock')) return { rows: [], rowCount: 0 };
      if (sql.startsWith('SELECT request_hash FROM stock_movements')) {
        return { rows: previousMovement ? [{ request_hash: previousMovement }] : [], rowCount: previousMovement ? 1 : 0 };
      }
      if (sql.startsWith('SELECT id,quantity,supplier,is_active')) {
        return { rows: [{ id: product.id, quantity: product.quantity, supplier: product.supplier, is_active: product.is_active, valid: true }], rowCount: 1 };
      }
      if (sql.startsWith('UPDATE products SET')) {
        calls.updates.push(values);
        product = {
          ...product,
          quantity: product.quantity + Number(values[0]),
          cost_price: values[1] === null ? product.cost_price : values[1],
          last_invoice_reference: values[2] === null ? product.last_invoice_reference : values[2]
        };
        return { rows: [product], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO stock_movements')) {
        calls.stock.push(values);
        previousMovement = values[7];
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('INSERT INTO financial_transactions')) {
        calls.finance.push(values);
        return { rows: [], rowCount: 1 };
      }
      if (sql.startsWith('SELECT id,product_code')) return { rows: [product], rowCount: 1 };
      throw new Error(`Unexpected query: ${sql}`);
    }
  };
  const db = { transaction: work => work(client), query: client.query, pool: { query: client.query } };
  require.cache[require.resolve('../api/db')] = { exports: db };
  delete require.cache[require.resolve('../api/controllers/productsController')];
  return { calls, client };
}

function response() {
  return { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function restock(body, user = { id: 1, role: 'admin' }) {
  const { restockProduct } = require('../api/controllers/productsController');
  const res = response();
  await restockProduct({ params: { id: '1' }, body: { quantity: 5, reason: 'Supplier delivery', ...body }, user }, res);
  return res;
}

test('a delivery with a purchase price updates cost_price and writes one stock purchase expense', async () => {
  const { calls } = harness();
  const res = await restock({ idempotencyKey: '11111111-1111-4111-8111-111111111111', costPrice: '12.34', supplierInvoice: 'INV-2048' });

  assert.equal(calls.stock.length, 1);
  assert.equal(calls.finance.length, 1);
  assert.equal(calls.updates[0][1], '12.34');
  assert.equal(calls.updates[0][2], 'INV-2048');
  assert.equal(calls.finance[0][0], '61.70');
  assert.equal(calls.finance[0][1], 'Invoice INV-2048 · Supplier delivery');
  assert.equal(calls.finance[0][2], 'Acme');
  assert.equal(res.body.data.costPrice, '12.34');
  assert.equal(res.body.data.lastInvoiceReference, 'INV-2048');
  assert.equal(res.body.data.quantity, 15);
});

test('a retried delivery does not add stock or create a second transaction', async () => {
  const { calls } = harness();
  const body = { idempotencyKey: '22222222-2222-4222-8222-222222222222', costPrice: '5.50', supplierInvoice: 'INV-9' };
  await restock(body);
  const stockCount = calls.stock.length, financeCount = calls.finance.length, updateCount = calls.updates.length;
  const retry = await restock(body);

  assert.equal(calls.stock.length, stockCount);
  assert.equal(calls.finance.length, financeCount);
  assert.equal(calls.updates.length, updateCount);
  assert.equal(retry.body.data.quantity, 15);
});

test('a delivery without a purchase price keeps working and writes no expense', async () => {
  const { calls } = harness();
  const res = await restock({ idempotencyKey: '33333333-3333-4333-8333-333333333333' });

  assert.equal(calls.stock.length, 1);
  assert.equal(calls.finance.length, 0);
  assert.equal(calls.updates[0][1], null);
  assert.equal(calls.updates[0][2], null);
  assert.equal(res.body.data.costPrice, '10.00');
});
