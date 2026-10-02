const db=require('../db');
const {paging}=require('../../lib/validation');
exports.getRecentActivity=async(req,res)=>{
 const q=req.validatedQuery,user=req.user.role==='cashier'?req.user.id:null;
 const count=(await db.query('SELECT (SELECT COUNT(*) FROM sales WHERE $1::int IS NULL OR user_id=$1)+(SELECT COUNT(*) FROM stock_movements WHERE $1::int IS NULL OR user_id=$1) AS total',[user])).rows[0].total;
 const r=await db.query(`WITH recent_sales AS (SELECT id,created_at,receipt_number,total_amount FROM sales WHERE $1::int IS NULL OR user_id=$1 ORDER BY created_at DESC,id DESC LIMIT $2),recent_stock AS (SELECT id,product_id,movement_date,quantity_change FROM stock_movements WHERE $1::int IS NULL OR user_id=$1 ORDER BY movement_date DESC,id DESC LIMIT $2),events AS (SELECT id,'sale' AS type,created_at AS timestamp,'Sale completed' AS title,'Receipt '||receipt_number||' - MWK '||total_amount AS description FROM recent_sales UNION ALL SELECT sm.id,'stock',sm.movement_date,'Stock changed',p.name||' ('||sm.quantity_change||')' FROM recent_stock sm JOIN products p ON p.id=sm.product_id) SELECT * FROM events ORDER BY timestamp DESC,id DESC LIMIT $3 OFFSET $4`,[user,q.page*q.limit,q.limit,(q.page-1)*q.limit]);
 res.json({success:true,data:r.rows,pagination:paging(q,count,r.rowCount)});
};
