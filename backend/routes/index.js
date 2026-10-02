const router=require('express').Router();
const db=require('../api/db');
const {AppError}=require('../lib/errors');
const {authenticate,authorize,ROLES}=require('../middleware/roleMiddleware');
router.get('/',(req,res)=>res.json({service:'METMMA Pharmacy API'}));
router.get('/health',async(req,res)=>{try{await db.query('SELECT 1');await db.query('SELECT s.idempotency_key,f.id FROM sales s CROSS JOIN financial_transactions f LIMIT 0');res.json({status:'OK'});}catch(err){console.error(JSON.stringify({requestId:req.requestId,event:'readiness_failed',error:err.message}));throw new AppError('UNAVAILABLE',503);}});
router.get('/config',(req,res)=>res.json({currency:'MWK',taxRateBps:require('../lib/money').taxRate(),timeZone:process.env.PHARMACY_TIMEZONE || 'UTC'}));
const auth=require('./authRoutes');router.use('/auth',auth);router.use('/login',auth.loginRouter);
router.use('/products',require('../api/routes/productsRoutes'));
router.use('/sales',require('../api/routes/salesRoutes'));
router.use('/notifications',require('../api/routes/notificationsRoutes'));
router.use('/finances',require('../api/routes/financesRoutes'));
router.use('/employees',require('../api/routes/employeesRoutes'));
router.use('/attendance',require('../api/routes/attendanceRoutes'));
router.use('/reports',require('../api/routes/reportsRoutes'));
router.get('/dashboard',authenticate,authorize(ROLES.ADMIN,ROLES.STORE_MANAGER,ROLES.PHARMACIST,ROLES.HR_OFFICER),async(req,res)=>{
 const results=await Promise.all([
 db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE quantity<=reorder_level)::int AS low,COUNT(*) FILTER(WHERE expiry_date<CURRENT_DATE)::int AS expired FROM products WHERE is_active=TRUE`),
 db.query(`SELECT COALESCE(SUM(total_amount),0)::text AS total FROM sales WHERE created_at>=CURRENT_DATE AND created_at<CURRENT_DATE+1 AND status='completed'`),
 db.query(`SELECT id,name,quantity FROM products WHERE is_active=TRUE AND quantity<=reorder_level ORDER BY quantity,id LIMIT 5`)
 ]);res.json({products:results[0].rows[0],todaySales:results[1].rows[0].total,lowStock:results[2].rows});
});
module.exports=router;
