const router = require('express').Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { Joi, validate, idParam, pageFields, paging } = require('../../lib/validation');
const { AppError } = require('../../lib/errors');
const { authenticate, authorize, ROLES } = require('../../middleware/roleMiddleware');
const { DB_ROLES } = require('../../models/user');
const password = Joi.string().min(10).max(72).custom((v,h) => Buffer.byteLength(v) <= 72 ? v : h.error('any.invalid'));
router.use(authenticate, authorize(ROLES.ADMIN));
router.get('/', validate(Joi.object({...pageFields, search:Joi.string().trim().max(100).allow('')}), 'query'), async (req,res) => {
 const q=req.validatedQuery, values=[], where=q.search ? (values.push(`%${q.search}%`), 'WHERE u.username ILIKE $1 OR u.full_name ILIKE $1') : '';
 const count=(await db.query(`SELECT COUNT(*) FROM users u ${where}`,values)).rows[0].count;
 values.push(q.limit,(q.page-1)*q.limit);
 const result=await db.query(`SELECT u.id,u.username,u.full_name,u.email,u.role,u.is_active,e.id AS employee_id FROM users u LEFT JOIN employees e ON e.user_id=u.id ${where} ORDER BY u.full_name,u.id LIMIT $${values.length-1} OFFSET $${values.length}`,values);
 res.json({success:true,data:result.rows,pagination:paging(q,count,result.rowCount)});
});
router.patch('/:id',validate(idParam,'params'),validate(Joi.object({role:Joi.string().valid(...DB_ROLES),is_active:Joi.boolean().strict(),password,employee_id:Joi.number().integer().positive()}).min(1).required()),async(req,res)=>{
 const d=req.body, id=req.params.id;
 // Administrators cannot remove their own access; another administrator must do that.
 if(id===req.user.id && (d.is_active===false || (d.role && d.role!=='admin'))) throw new AppError('PERMISSION_DENIED',403);
 const hash=d.password ? await bcrypt.hash(d.password,12) : null;
 const row=await db.transaction(async client=>{
  await client.query("SELECT pg_advisory_xact_lock(hashtextextended('metmma:accounts',0))");
  const current=(await client.query('SELECT id,role,is_active FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(!current) throw new AppError('NOT_FOUND',404);
  if(current.role==='admin' && current.is_active && (d.is_active===false || (d.role && d.role!=='admin'))) {
   const admins=await client.query("SELECT id FROM users WHERE role='admin' AND is_active=TRUE AND id<>$1",[id]);
   if(!admins.rowCount) throw new AppError('CONFLICT',409);
  }
  if(d.employee_id) {
   const employee=(await client.query('SELECT user_id,is_active FROM employees WHERE id=$1 FOR UPDATE',[d.employee_id])).rows[0];
   if(!employee || !employee.is_active) throw new AppError('NOT_FOUND',404);
   if(employee.user_id && employee.user_id!==id) throw new AppError('CONFLICT',409);
   await client.query('UPDATE employees SET user_id=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2',[id,d.employee_id]);
  }
  const revoke=!!hash || d.role!==undefined || d.is_active!==undefined;
  return (await client.query(`UPDATE users SET role=COALESCE($2,role),is_active=COALESCE($3,is_active),password_hash=COALESCE($4,password_hash),session_version=session_version+$5,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,username,full_name,email,role,is_active`,[id,d.role??null,d.is_active??null,hash,revoke?1:0])).rows[0];
 });
 res.json({success:true,data:row});
});
module.exports=router;
