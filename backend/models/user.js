const db = require('../api/db');
const bcrypt = require('bcryptjs');
const DB_ROLES = ['admin','pharmacist','cashier','store_manager','hr_officer'];
const normalizeRole = value => ({ admin:'admin', pharmacist:'pharmacist', cashier:'cashier', store_manager:'store_manager', storemanager:'store_manager', hr_officer:'hr_officer', hrofficer:'hr_officer', hr:'hr_officer' })[String(value || '').trim().toLowerCase().replace(/[\s-]+/g,'_')] || null;
async function createUser({username,password,role,full_name,email}) {
  const normalized = normalizeRole(role);
  if (!normalized || !full_name?.trim()) throw new Error('Invalid account input');
  const hash = await bcrypt.hash(password,12);
  return (await db.query(`INSERT INTO users(username,password_hash,role,full_name,email) VALUES($1,$2,$3,$4,$5) RETURNING id,username,role,full_name,email`, [username,hash,normalized,full_name,email || null])).rows[0];
}
async function findUserByUsername(username) { return (await db.query('SELECT id,username,password_hash,role,is_active FROM users WHERE username = $1',[username])).rows[0] || null; }
module.exports = { createUser, findUserByUsername, normalizeRole, DB_ROLES };
