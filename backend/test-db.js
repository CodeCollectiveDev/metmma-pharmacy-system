const {pool}=require('./api/db');
(async()=>{await pool.query('SELECT 1');console.info('Database connection is ready.');})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>pool.end());
