require('dotenv').config({quiet:true});
// Advisory locks require a direct connection, not a transaction pooler.
if(process.env.MIGRATION_DATABASE_URL)process.env.DATABASE_URL=process.env.MIGRATION_DATABASE_URL;
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {pool}=require('../api/db');
(async()=>{
 const direction=process.argv[2] || 'up';
 if(!['up','down'].includes(direction))throw new Error('Use migrate.js up or down.');
 const client=await pool.connect();
 try{
  // API queries keep their short timeout; migrations may need longer for indexes/backfills.
  await client.query("SET statement_timeout = '5min'");
  await client.query("SELECT pg_advisory_lock(hashtextextended('metmma:migrations',0))");
  const files=direction==='up'?['20260917_employee_email.sql','20261002_mvp.sql','20261003_staff_workflows.sql','20261003_payment_amounts.sql']:['20261002_mvp.down.sql'];
  for(const name of files){await client.query({text:readFileSync(resolve(__dirname,'../../database/migrations',name),'utf8'),query_timeout:310000});console.info(`Applied ${name}`);}
 }catch(err){await client.query('ROLLBACK');throw err;}finally{await client.query("SELECT pg_advisory_unlock(hashtextextended('metmma:migrations',0))");client.release();}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>pool.end());
