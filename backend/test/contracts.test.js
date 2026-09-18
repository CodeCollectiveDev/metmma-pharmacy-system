const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { saleSchema, validateSale } = require('../api/validators/salesValidator');
const { employeeCreateSchema, employeeUpdateSchema } = require('../api/validators/employeeValidators');
const { attendanceSchema } = require('../api/validators/attendanceValidators');

const sale = {
  items: [{ productId: 1, quantity: 2, unitPrice: 10, subtotal: 20 }],
  totalAmount: 23.30, paymentMethod: 'cash', customerName: 'Customer'
};
const employee = {
  first_name: 'Jane', last_name: 'Smith', email: 'JANE@example.com',
  department: 'Pharmacy', job_title: 'Pharmacist', role: 'pharmacist',
  hire_date: '2026-01-01', salary: 1000, phone: '+265991234567'
};

test('required request bodies cannot bypass field validation', () => {
  for (const schema of [saleSchema, employeeCreateSchema, attendanceSchema]) {
    for (const body of [undefined, null, {}, []]) assert.ok(schema.validate(body).error);
  }
});

test('checkout accepts the established contract and rejects invalid required fields', () => {
  assert.equal(saleSchema.validate(sale).error, undefined);
  for (const invalid of [
    { ...sale, totalAmount: undefined }, { ...sale, items: [] },
    { ...sale, userId: 2 },
    { ...sale, totalAmount: -1 }, { ...sale, totalAmount: 'wrong' },
    { ...sale, items: [{ ...sale.items[0], productId: 'products_local' }] },
    { ...sale, items: [{ ...sale.items[0], quantity: -1 }] },
    { ...sale, items: [{ ...sale.items[0], quantity: 0 }] },
    { ...sale, items: [{ ...sale.items[0], quantity: 0.5 }] },
    { ...sale, items: [{ ...sale.items[0], subtotal: undefined }] }
  ]) assert.ok(saleSchema.validate(invalid).error);
});

test('checkout validation returns field errors before invoking the controller', () => {
  let body;
  const res = { status(code) { assert.equal(code, 400); return this; }, json(data) { body = data; } };
  validateSale({ body: { items: [], totalAmount: -1 } }, res, () => assert.fail('Invalid sale reached controller'));
  assert.deepEqual(body.errors.map(error => error.field), ['items', 'totalAmount']);

  validateSale({ body: { ...sale, userId: 2 } }, res, () => assert.fail('Client identity reached controller'));
  assert.deepEqual(body.errors.map(error => error.field), ['userId']);
});

test('employee creation keeps required persistence fields, including an optional role', () => {
  const { value, error } = employeeCreateSchema.validate(employee, { stripUnknown: true });
  assert.equal(error, undefined);
  assert.equal(value.email, 'jane@example.com');
  assert.equal(value.role, 'pharmacist');
  assert.equal(value.department, 'Pharmacy');
  assert.equal(value.job_title, 'Pharmacist');
  const { role, phone, ...withoutOptionalFields } = employee;
  assert.equal(employeeCreateSchema.validate(withoutOptionalFields).error, undefined);
  for (const field of ['first_name', 'last_name', 'email', 'department', 'job_title', 'salary']) {
    const result = employeeCreateSchema.validate({ ...employee, [field]: undefined });
    assert.deepEqual(result.error.details[0].path, [field]);
  }
});

test('employee validation remains compatible with existing API departments and update roles', () => {
  for (const department of ['HR', 'Engineering', 'Sales', 'Marketing', 'Finance', 'Pharmacy', 'Operations', 'Human Resources', 'Administration']) {
    assert.equal(employeeCreateSchema.validate({ ...employee, department }).error, undefined);
  }
  assert.equal(employeeUpdateSchema.validate({ role: 'cashier' }).value.role, 'cashier');
});

test('attendance validation exactly matches the SQL domain and normalizes old casing', () => {
  const sql = readFileSync(require.resolve('../../database/init.sql'), 'utf8');
  const domain = sql.match(/status VARCHAR\(20\).*CHECK \(status IN \(([^)]+)\)/)[1]
    .split(',').map(value => value.trim().replaceAll("'", ''));
  for (const status of domain) {
    for (const input of [status, status[0].toUpperCase() + status.slice(1)]) {
      const result = attendanceSchema.validate({ employee_id: 1, date: '2026-01-01', status: input });
      assert.equal(result.error, undefined);
      assert.equal(result.value.status, status);
    }
  }
  for (const status of ['Excused', 'sick', '', 'unknown']) {
    assert.ok(attendanceSchema.validate({ employee_id: 1, date: '2026-01-01', status }).error);
  }
});
