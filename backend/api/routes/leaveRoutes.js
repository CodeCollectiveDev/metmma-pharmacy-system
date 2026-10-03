const router=require('express').Router();
const db=require('../db');
const {Joi,validate,idParam,pageFields,paging}=require('../../lib/validation');
const {AppError}=require('../../lib/errors');
const {authenticate,authorize,ROLES}=require('../../middleware/roleMiddleware');
const states=['pending','approved','rejected','cancelled','completed'];
const date=Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((v,h)=>{const d=new Date(v+'T00:00:00Z');return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10)===v?v:h.error('any.invalid');});
const createSchema=Joi.object({employee_id:Joi.number().integer().positive().required(),leave_type:Joi.string().trim().min(1).max(50).required(),reason:Joi.string().trim().max(1000).allow(''),start_date:date.required(),expected_return_date:date.required()}).custom((v,h)=>v.expected_return_date>=v.start_date?v:h.error('any.invalid')).required();
const transitions={pending:['approved','rejected','cancelled'],approved:['completed','cancelled']};
router.use(authenticate,authorize(ROLES.ADMIN,ROLES.HR_OFFICER));
router.get('/',validate(Joi.object({...pageFields,status:Joi.string().valid(...states,'current'),employee_id:Joi.number().integer().positive()}),'query'),async(req,res)=>{
 const q=req.validatedQuery,values=[],clauses=[];
 if(q.status==='current') clauses.push("l.status='approved' AND l.start_date<=CURRENT_DATE AND l.expected_return_date>=CURRENT_DATE");
 else if(q.status){values.push(q.status);clauses.push(`l.status=$${values.length}`);}
 if(q.employee_id){values.push(q.employee_id);clauses.push(`l.employee_id=$${values.length}`);}
 const where=clauses.length?'WHERE '+clauses.join(' AND '):'';
 const count=(await db.query(`SELECT COUNT(*) FROM employee_leave l ${where}`,values)).rows[0].count;
 values.push(q.limit,(q.page-1)*q.limit);
 const r=await db.query(`SELECT l.*,l.start_date::text AS start_date,l.expected_return_date::text AS expected_return_date,e.first_name,e.last_name,e.employee_id AS employee_code,(l.expected_return_date-l.start_date+1) AS total_days FROM employee_leave l JOIN employees e ON e.id=l.employee_id ${where} ORDER BY l.start_date DESC,l.id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
 res.json({success:true,data:r.rows,pagination:paging(q,count,r.rowCount)});
});
async function checkOverlap(client,d,id=0){
 const overlap=await client.query("SELECT id FROM employee_leave WHERE employee_id=$1 AND id<>$4 AND status IN ('pending','approved') AND start_date<=$3::date AND expected_return_date>=$2::date",[d.employee_id,d.start_date,d.expected_return_date,id]);
 if(overlap.rowCount)throw new AppError('LEAVE_OVERLAP',409);
}
router.post('/',validate(createSchema),async(req,res)=>{
 const d=req.body;
 const row=await db.transaction(async client=>{
  const employee=(await client.query('SELECT is_active FROM employees WHERE id=$1 FOR UPDATE',[d.employee_id])).rows[0];
  if(!employee || !employee.is_active)throw new AppError('NOT_FOUND',404);
  await checkOverlap(client,d);
  return(await client.query('INSERT INTO employee_leave(employee_id,leave_type,reason,start_date,expected_return_date,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[d.employee_id,d.leave_type,d.reason||null,d.start_date,d.expected_return_date,req.user.id])).rows[0];
 });res.status(201).json({success:true,data:row});
});
router.patch('/:id',validate(idParam,'params'),validate(Joi.object({status:Joi.string().valid('approved','rejected','cancelled','completed').required()}).required()),async(req,res)=>{
 const row=await db.transaction(async client=>{
  const current=(await client.query('SELECT *,start_date::text AS start_date,expected_return_date::text AS expected_return_date FROM employee_leave WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
  if(!current)throw new AppError('NOT_FOUND',404);
  if(!transitions[current.status]?.includes(req.body.status))throw new AppError('CONFLICT',409);
  const employee=(await client.query('SELECT is_active FROM employees WHERE id=$1 FOR UPDATE',[current.employee_id])).rows[0];
  if(req.body.status==='approved'){
   if(!employee.is_active)throw new AppError('CONFLICT',409);
   await checkOverlap(client,current,current.id);
  }
  return(await client.query('UPDATE employee_leave SET status=$2,updated_by=$3,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *',[current.id,req.body.status,req.user.id])).rows[0];
 });res.json({success:true,data:row});
});
module.exports=router;
module.exports.createSchema=createSchema;
