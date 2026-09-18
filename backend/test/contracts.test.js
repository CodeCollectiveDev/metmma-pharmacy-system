const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { saleSchema, verifySaleArithmetic, validateSale } = require('../api/validators/salesValidator');
const { employeeCreateSchema, employeeUpdateSchema } = require('../api/validators/employeeValidators');
const { attendanceSchema } = require('../api/validators/attendanceValidators');

const sale = {
  items: [{ productId: 1, quantity: 2, unitPrice: 10, subtotal: 20 }],
  totalAmount: 23.30, paymentMethod: 'cash', customerName: 'Customer', userId: 1
};
const employee = {
  first_name: 'Jane', last_name: 'Smith', email: 'JANE@example.com',
  department: 'Pharmacy', role: 'pharmacist',
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
    { ...sale, totalAmount: undefined }, { ...sale, items: undefined }, { ...sale, items: [] }, { ...sale, items: {} },
    { ...sale, totalAmount: -1 }, { ...sale, totalAmount: 'wrong' },
    { ...sale, items: [{ ...sale.items[0], productId: 'products_local' }] },
    { ...sale, items: [{ ...sale.items[0], quantity: -1 }] },
    { ...sale, items: [{ ...sale.items[0], quantity: 0 }] },
    { ...sale, items: [{ ...sale.items[0], quantity: 0.5 }] },
    { ...sale, items: [{ ...sale.items[0], quantity: 'wrong' }] },
    { ...sale, items: [{ ...sale.items[0], unitPrice: -1 }] },
    { ...sale, items: [{ ...sale.items[0], subtotal: -1 }] },
    { ...sale, items: [{ ...sale.items[0], subtotal: undefined }] }
  ]) assert.ok(saleSchema.validate(invalid).error);
});

test('checkout arithmetic derives line amounts and rejects inconsistent client totals', () => {
  const verified = verifySaleArithmetic(sale);
  assert.equal(verified.error, undefined);
  assert.equal(verified.value.items[0].subtotal, 20);
  assert.equal(verified.merchandiseSubtotal, 20);
  assert.equal(verified.value.totalAmount, 23.3);

  assert.equal(verifySaleArithmetic({ ...sale, items: [{ ...sale.items[0], subtotal: 3 }] }).error.field, 'items.0.subtotal');
  assert.equal(verifySaleArithmetic({ ...sale, totalAmount: 1 }).error.field, 'totalAmount');
});

test('checkout validation returns field errors before invoking the controller', () => {
  let body;
  const res = { status(code) { assert.equal(code, 400); return this; }, json(data) { body = data; } };
  validateSale({ body: { items: [], totalAmount: -1 } }, res, () => assert.fail('Invalid sale reached controller'));
  assert.deepEqual(body.errors.map(error => error.field), ['items', 'totalAmount']);

  validateSale({ body: { ...sale, items: [{ ...sale.items[0], subtotal: 3 }] } }, res, () => assert.fail('Invalid arithmetic reached controller'));
  assert.deepEqual(body.errors.map(error => error.field), ['items.0.subtotal']);
});

test('employee creation keeps required persistence fields, with a required role (job title)', () => {
  const { value, error } = employeeCreateSchema.validate(employee, { stripUnknown: true });
  assert.equal(error, undefined);
  assert.equal(value.email, 'jane@example.com');
  assert.equal(value.role, 'pharmacist');
  assert.equal(value.department, 'Pharmacy');
  assert.equal(value.job_title, undefined, 'job_title is not part of the merged contract; role stores the job title');
  const { phone, ...withoutOptionalFields } = employee;
  assert.equal(employeeCreateSchema.validate(withoutOptionalFields).error, undefined);
  for (const field of ['first_name', 'last_name', 'email', 'department', 'role', 'salary']) {
    const result = employeeCreateSchema.validate({ ...employee, [field]: undefined });
    assert.deepEqual(result.error.details[0].path, [field]);
  }
});

test('employee validation remains compatible with existing API departments and update roles', () => {
  for (const department of ['Pharmacy', 'Administration', 'Finance', 'Human Resources', 'Operations', 'Sales', 'IT']) {
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
