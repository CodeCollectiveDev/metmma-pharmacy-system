const db=require('../db');
const {paging}=require('../../lib/validation');
// Every notice comes from confirmed product fields. Keys change only when a product changes.
const alerts=`WITH alerts AS (
 SELECT md5('low:'||id||':'||updated_at::text) AS key,id AS product_id,updated_at AS time,'Low stock: '||name AS title,name||' has '||quantity||' units left. Its low stock threshold is '||reorder_level||'.' AS message FROM products WHERE is_active=TRUE AND quantity<=reorder_level
 UNION ALL
 SELECT md5('expiry:'||id||':'||updated_at::text),id,updated_at,CASE WHEN expiry_date<CURRENT_DATE THEN 'Expired: ' ELSE 'Expiry soon: ' END||name,name||' (batch '||batch_number||') expires on '||expiry_date::text||'.' FROM products WHERE is_active=TRUE AND quantity>0 AND expiry_date<=CURRENT_DATE+90
)`;
async function getNotifications(req,res){
 const q=req.validatedQuery;
 const counts=(await db.query(`${alerts} SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE r.alert_key IS NULL)::int AS unread FROM alerts a LEFT JOIN notification_reads r ON r.alert_key=a.key AND r.user_id=$1`,[req.user.id])).rows[0];
 const result=await db.query(`${alerts} SELECT a.key AS id,a.product_id AS "productId",a.time,a.title,a.message,r.alert_key IS NOT NULL AS read FROM alerts a LEFT JOIN notification_reads r ON r.alert_key=a.key AND r.user_id=$1 ORDER BY a.time DESC,a.key LIMIT $2 OFFSET $3`,[req.user.id,q.limit,(q.page-1)*q.limit]);
 res.json({success:true,data:result.rows,unreadCount:counts.unread,pagination:paging(q,counts.total,result.rowCount)});
}
async function readNotification(req,res){await db.query(`${alerts} INSERT INTO notification_reads(user_id,alert_key) SELECT $1,key FROM alerts WHERE key=$2 ON CONFLICT DO NOTHING`,[req.user.id,req.params.id]);res.json({success:true});}
async function readAllNotifications(req,res){await db.query(`${alerts} INSERT INTO notification_reads(user_id,alert_key) SELECT $1,key FROM alerts ON CONFLICT DO NOTHING`,[req.user.id]);res.json({success:true});}
module.exports={getNotifications,readNotification,readAllNotifications};
