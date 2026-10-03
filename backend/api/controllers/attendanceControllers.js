const db=require('../db');
const {paging,dateFilter}=require('../../lib/validation');
async function list(req,res,employeeId){
 const q=req.validatedQuery,values=[],where=dateFilter(q,values,'a.date');
 if(employeeId){values.push(employeeId);where.push(`a.employee_id=$${values.length}`);}
 if(q.search){values.push(`%${q.search}%`);where.push(`(e.first_name ILIKE $${values.length} OR e.last_name ILIKE $${values.length} OR e.employee_id ILIKE $${values.length})`);}
 if(q.status){values.push(q.status);where.push(`a.status=$${values.length}`);}
 const filter=where.length?'WHERE '+where.join(' AND '):'';
 const count=(await db.query(`SELECT COUNT(*) FROM attendance a JOIN employees e ON e.id=a.employee_id ${filter}`,values)).rows[0].count;
 values.push(q.limit,(q.page-1)*q.limit);
 const r=await db.query(`SELECT a.id,a.employee_id,a.date::text AS date,a.status,a.check_in_time,a.check_out_time,a.hours_worked,a.notes,e.first_name,e.last_name,e.employee_id AS employee_code FROM attendance a JOIN employees e ON e.id=a.employee_id ${filter} ORDER BY a.date DESC,a.id DESC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
 res.json({success:true,data:r.rows,pagination:paging(q,count,r.rowCount)});
}
exports.getAttendance=(req,res)=>list(req,res,req.validatedQuery.employee_id);
exports.getAttendanceByEmployee=(req,res)=>list(req,res,req.params.employee_id);
exports.addAttendance=async(req,res)=>{
 const d=req.body;
 const r=await db.query(`INSERT INTO attendance(employee_id,date,status,check_in_time,notes) VALUES($1,$2,$3,$4,$5) ON CONFLICT(employee_id,date) DO UPDATE SET status=EXCLUDED.status,check_in_time=COALESCE(EXCLUDED.check_in_time,attendance.check_in_time),notes=COALESCE(EXCLUDED.notes,attendance.notes) RETURNING id,employee_id,date::text AS date,status`,[d.employee_id,d.date,d.status,d.check_in||null,d.notes??null]);
 res.status(201).json({success:true,message:'Attendance saved.',data:r.rows[0]});
};
exports.getDailyAttendance=async(req,res)=>{
 const q=req.validatedQuery;
 dateFilter(q,[],'date');
 const values=[q.start],where=['e.is_active=TRUE'];
 if(q.search){values.push(`%${q.search}%`);where.push(`(e.first_name ILIKE $${values.length} OR e.last_name ILIKE $${values.length} OR e.employee_id ILIKE $${values.length})`);}
 const filter='WHERE '+where.join(' AND ');
 const from=`FROM employees e LEFT JOIN attendance a ON a.employee_id=e.id AND a.date=$1::date ${filter}`;
 const count=(await db.query(`SELECT COUNT(*) ${from}`,values)).rows[0].count;
 values.push(q.limit,(q.page-1)*q.limit);
 const r=await db.query(`SELECT e.id AS employee_id,e.first_name,e.last_name,e.employee_id AS employee_code,a.id,a.status,a.date::text AS date ${from} ORDER BY e.first_name,e.last_name,e.id LIMIT $${values.length-1} OFFSET $${values.length}`,values);
 res.json({success:true,data:r.rows,pagination:paging(q,count,r.rowCount)});
};
