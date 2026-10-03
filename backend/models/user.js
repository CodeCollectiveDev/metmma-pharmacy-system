const db = require('../api/db');
const bcrypt = require('bcryptjs');
const DB_ROLES = ['admin','pharmacist','cashier','store_manager','hr_officer'];
const normalizeRole = value => ({ admin:'admin', super_admin:'admin', pharmacist:'pharmacist', cashier:'cashier', store_manager:'store_manager', storemanager:'store_manager', hr_officer:'hr_officer', hrofficer:'hr_officer', hr:'hr_officer' })[String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_')] || null;
async function createUser({username,password,role,full_name,email,employee_id}) {
  const normalized = normalizeRole(role);
  if (!normalized || !full_name?.trim()) throw new Error('Invalid account input');
  const hash = await bcrypt.hash(password,12);
  return db.transaction(async client => {
    if (employee_id) {
      const employee = (await client.query('SELECT user_id,is_active FROM employees WHERE id=$1 FOR UPDATE',[employee_id])).rows[0];
      if (!employee || !employee.is_active) throw new (require('../lib/errors').AppError)('NOT_FOUND',404);
      if (employee.user_id) throw new (require('../lib/errors').AppError)('CONFLICT',409);
    }
    const user = (await client.query(`INSERT INTO users(username,password_hash,role,full_name,email) VALUES($1,$2,$3,$4,$5) RETURNING id,username,role,full_name,email`, [username,hash,normalized,full_name,email || null])).rows[0];
    if (employee_id) await client.query('UPDATE employees SET user_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[user.id,employee_id]);
    else {
      const [first,...last] = full_name.trim().split(/\s+/);
      await client.query('INSERT INTO employees(user_id,employee_id,first_name,last_name,email,role,hire_date) VALUES($1,$2,$3,$4,$5,$6,CURRENT_DATE)',[user.id,`EMP-${require('node:crypto').randomUUID()}`,first,last.join(' '),email || null,normalized]);
    }
    return user;
  });
}
async function findUserByUsername(username) { return (await db.query('SELECT id,username,password_hash,role,is_active,session_version FROM users WHERE username = $1',[username])).rows[0] || null; }
module.exports = { createUser, findUserByUsername, normalizeRole, DB_ROLES };
