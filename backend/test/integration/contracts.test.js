const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { randomUUID } = require('node:crypto');
const { once } = require('node:events');
const { Pool } = require('pg');
const express = require('express');
const jwt = require('jsonwebtoken');

if (!process.env.TEST_DATABASE_URL) throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL test database');
const schema = `contract_test_${randomUUID().replaceAll('-', '')}`;
const admin = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const pool = new Pool({ connectionString: process.env.TEST_DATABASE_URL, options: `-c search_path=${schema}` });
require.cache[require.resolve('../../api/db')] = { exports: { pool, query: (...args) => pool.query(...args) } };
process.env.JWT_SECRET = 'isolated-contract-test-key';
let server;
let base;
let employeeId;

const request = async (path, { method = 'GET', body, role = 'admin', authenticated = true } = {}) => {
  const token = jwt.sign({ id: 1, username: 'test', role }, process.env.JWT_SECRET);
  const response = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  return { status: response.status, data: await response.json() };
};

before(async () => {
  await admin.query(`CREATE SCHEMA ${schema}`);
  await pool.query(readFileSync(require.resolve('../../../database/init.sql'), 'utf8'));
  await pool.query(`INSERT INTO products (product_code, name, batch_number, expiry_date, quantity, unit_price, selling_price, category)
    SELECT 'TEST-' || n, 'Product ' || LPAD(n::text, 3, '0'), 'B-' || n, '2030-01-01',
           CASE WHEN n = 103 THEN 10 ELSE 100 END, 10, 10, CASE WHEN n > 50 THEN 'Later' ELSE 'First' END
    FROM generate_series(1, 103) n`);
  const app = express();
  app.use(express.json());
  app.use('/sales', require('../../api/routes/salesRoutes'));
  app.use('/products', require('../../api/routes/productsRoutes'));
  app.use('/employees', require('../../api/routes/employeesRoutes'));
  app.use('/attendance', require('../../api/routes/attendanceRoutes'));
  server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  if (server) await new Promise(resolve => server.close(resolve));
  await pool.end();
  await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
  await admin.end();
});

test('all catalogue pages, filters, metadata and low-stock products remain reachable', async () => {
  const pages = [];
  for (let page = 1; page <= 3; page++) {
    const response = await request(`/products?page=${page}`);
    assert.equal(response.status, 200);
    assert.equal(response.data.pagination.total, 103);
    assert.equal(response.data.pagination.hasMore, page < 3);
    pages.push(...response.data.data);
  }
  assert.equal(new Set(pages.map(product => product.id)).size, 103);
  assert.equal(pages.filter(product => product.quantity <= product.reorderLevel).length, 1);
  const result = await request('/products?category=Later&search=103');
  assert.equal(result.data.pagination.total, 1);
  assert.equal(result.data.data[0].id, 103);
  assert.equal((await request('/products?page=0')).status, 400);
  assert.equal((await request('/products?page=4')).data.count, 0);
});

test('frontend checkout payload persists sale fields, lines and a single stock decrement', async () => {
  const { toSalePayload } = await import('../../../frontend/src/services/api/salePayload.js');
  const payload = toSalePayload({
    totalAmount: 34.95, paymentMethod: 'card', customerName: 'Customer', userId: 1,
    items: [{ productId: 103, name: 'Product 103', quantity: 3, unitPrice: 10, subtotal: 30 }]
  });
  const response = await request('/sales/checkout', { method: 'POST', body: payload, role: 'cashier' });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  assert.equal(response.data.data.totalAmount, 34.95);
  assert.equal(response.data.data.receiptNumber, response.data.receiptNumber);
  const sale = (await pool.query('SELECT * FROM sales WHERE id = $1', [response.data.saleId])).rows[0];
  assert.equal(sale.total_amount, '34.95');
  assert.equal(sale.payment_method, 'card');
  assert.equal(sale.customer_name, 'Customer');
  assert.equal(sale.user_id, 1);
  const line = (await pool.query('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id])).rows[0];
  assert.equal(line.subtotal, '30.00');
  assert.equal(line.quantity, 3);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE id = 103')).rows[0].quantity, 7);
  assert.equal((await pool.query('SELECT * FROM stock_movements WHERE product_id = 103')).rowCount, 1);
  const history = await request('/sales/history');
  assert.equal(history.data.data[0].items[0].product_id, 103);

  const retry = await request('/sales/checkout', { method: 'POST', body: {
    ...payload,
    totalAmount: 104.85,
    items: [{ productId: 1, quantity: 1, unitPrice: 10, subtotal: 10 }, { ...payload.items[0], quantity: 8, subtotal: 80 }]
  } });
  assert.equal(retry.status, 400);
  assert.match(retry.data.message, /Insufficient stock/);
  assert.equal((await pool.query('SELECT * FROM sales')).rowCount, 1, 'failed checkout rolled back');
  assert.equal((await pool.query('SELECT quantity FROM products WHERE id = 1')).rows[0].quantity, 100);
  assert.equal((await pool.query('SELECT * FROM stock_movements WHERE product_id = 1')).rowCount, 0);
});

test('inconsistent checkout arithmetic is rejected before sale or stock mutation', async () => {
  const saleCount = (await pool.query('SELECT COUNT(*) FROM sales')).rows[0].count;
  const stock = (await pool.query('SELECT quantity FROM products WHERE id = 2')).rows[0].quantity;
  const cases = [
    { totalAmount: 100, items: [{ productId: 2, quantity: 2, unitPrice: 50, subtotal: 3 }] },
    { totalAmount: 1, items: [{ productId: 2, quantity: 2, unitPrice: 10, subtotal: 20 }] }
  ];

  for (const body of cases) {
    const response = await request('/sales/checkout', { method: 'POST', body });
    assert.equal(response.status, 400);
    assert.equal(response.data.message, 'Validation failed');
  }

  assert.equal((await pool.query('SELECT COUNT(*) FROM sales')).rows[0].count, saleCount);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE id = 2')).rows[0].quantity, stock);
});

test('invalid checkout and unauthorized writes are rejected without inserting records', async () => {
  const invalidBodies = [
    {},
    { totalAmount: 0, items: [] },
    { totalAmount: 10, items: {} },
    { totalAmount: 10, items: [{ productId: 1, quantity: 0, unitPrice: 10, subtotal: 0 }] },
    { totalAmount: 10, items: [{ productId: 1, quantity: -1, unitPrice: 10, subtotal: 10 }] },
    { totalAmount: 10, items: [{ productId: 1, quantity: 1.5, unitPrice: 10, subtotal: 15 }] },
    { totalAmount: 10, items: [{ productId: 1, quantity: 'wrong', unitPrice: 10, subtotal: 10 }] },
    { totalAmount: 10, items: [{ productId: 1, quantity: 1, unitPrice: -10, subtotal: 10 }] },
    { totalAmount: 10, items: [{ productId: 1, quantity: 1, unitPrice: 10, subtotal: -10 }] },
    { totalAmount: -10, items: [{ productId: 1, quantity: 1, unitPrice: 10, subtotal: 10 }] }
  ];

  for (const body of invalidBodies) {
    assert.equal((await request('/sales/checkout', { method: 'POST', body })).status, 400);
  }

  const body = invalidBodies[4];
  assert.equal((await request('/sales/checkout', { method: 'POST', body, authenticated: false })).status, 401);
  assert.equal((await request('/sales/checkout', { method: 'POST', body, role: 'hr_officer' })).status, 403);
  assert.equal(Number((await pool.query('SELECT COUNT(*) FROM sales')).rows[0].count), 1);
  assert.equal((await pool.query('SELECT quantity FROM products WHERE id = 1')).rows[0].quantity, 100);
});

test('employee creation persists all submitted fields, generates its identifier and can be read/updated', async () => {
  const body = { first_name: 'Jane', last_name: 'Smith', email: 'JANE@example.com', phone: '+265991234567',
    department: 'Pharmacy', job_title: 'Pharmacist', role: 'pharmacist', hire_date: '2026-01-01', salary: 1000 };
  const response = await request('/employees', { method: 'POST', body });
  assert.equal(response.status, 201, JSON.stringify(response.data));
  const employee = response.data.data;
  employeeId = employee.id;
  assert.match(employee.employee_id, /^EMP-[0-9a-f-]{36}$/);
  assert.equal(employee.email, 'jane@example.com');
  assert.equal(employee.department, 'Pharmacy');
  assert.equal(employee.position, 'Pharmacist');
  assert.equal(employee.role, 'pharmacist');
  assert.equal(employee.phone_number, '+265991234567');
  assert.equal(employee.is_active, true);
  assert.equal((await request(`/employees/${employeeId}`)).data.employee_id, employee.employee_id);
  assert.ok((await request('/employees')).data.some(row => row.id === employeeId));
  // The existing full update path remains supported; partial-update repair is #59.
  assert.equal((await request(`/employees/${employeeId}`, { method: 'PUT', body: { ...body, salary: 1200 } })).status, 200);
  assert.equal((await request(`/employees/${employeeId}`)).data.salary, '1200.00');
  const second = await request('/employees', { method: 'POST', body });
  assert.notEqual(second.data.data.employee_id, employee.employee_id);
  const invalid = await request('/employees', { method: 'POST', body: { first_name: 'Jane', last_name: 'Smith' } });
  assert.equal(invalid.status, 400);
  for (const field of ['email', 'department', 'job_title', 'salary']) {
    assert.ok(invalid.data.details.some(detail => detail.path[0] === field));
  }
  assert.equal((await request('/employees', { method: 'POST', body, role: 'hr_officer' })).status, 403);
});

test('every supported attendance status persists; Excused fails before PostgreSQL', async () => {
  const statuses = ['present', 'absent', 'late', 'leave', 'holiday', 'Present', 'Absent', 'Late'];
  for (const [index, status] of statuses.entries()) {
    const response = await request('/attendance', { method: 'POST', body: { employee_id: employeeId, date: `2026-02-${String(index + 1).padStart(2, '0')}`, status } });
    assert.equal(response.status, 201, JSON.stringify(response.data));
  }
  const response = await request('/attendance', { method: 'POST', body: { employee_id: employeeId, date: '2026-02-20', status: 'Excused' } });
  assert.equal(response.status, 400);
  const records = (await request(`/attendance/employee/${employeeId}`)).data;
  assert.equal(records.length, statuses.length);
  assert.deepEqual(new Set(records.map(row => row.status)), new Set(statuses.slice(0, 5)));
});

test('email migration preserves legacy rows and can run repeatedly', async () => {
  const client = await pool.connect();
  const legacySchema = `${schema}_legacy`;
  try {
    await client.query(`CREATE SCHEMA ${legacySchema}`);
    await client.query(`SET search_path = ${legacySchema}`);
    await client.query(`CREATE TABLE employees (id SERIAL PRIMARY KEY, employee_id VARCHAR(50) UNIQUE NOT NULL, hire_date DATE NOT NULL)`);
    await client.query("INSERT INTO employees (employee_id, hire_date) VALUES ('LEGACY-1', '2020-01-01')");
    const migration = readFileSync(require.resolve('../../../database/migrations/20260917_employee_email.sql'), 'utf8');
    await client.query(migration);
    await client.query(migration);
    const legacy = (await client.query('SELECT * FROM employees')).rows[0];
    assert.equal(legacy.employee_id, 'LEGACY-1');
    assert.equal(legacy.email, null);
    await client.query("UPDATE employees SET email = 'legacy@example.com'");
    assert.equal((await client.query('SELECT email FROM employees')).rows[0].email, 'legacy@example.com');
  } finally {
    await client.query('ROLLBACK');
    await client.query(`SET search_path = ${schema}`);
    await client.query(`DROP SCHEMA IF EXISTS ${legacySchema} CASCADE`);
    client.release();
  }
});
