require('dotenv').config({quiet:true});
const {readFileSync}=require('node:fs');
const {resolve}=require('node:path');
const {pool}=require('../api/db');
(async()=>{
 const direction=process.argv[2] || 'up';
 if(!['up','down'].includes(direction))throw new Error('Use migrate.js up or down.');
 const client=await pool.connect();
 try{
  await client.query("SELECT pg_advisory_lock(hashtextextended('metmma:migrations',0))");
  const files=direction==='up'?['20260917_employee_email.sql','20261002_mvp.sql']:['20261002_mvp.down.sql'];
  for(const name of files){await client.query(readFileSync(resolve(__dirname,'../../database/migrations',name),'utf8'));console.info(`Applied ${name}`);}
 }catch(err){await client.query('ROLLBACK');throw err;}finally{await client.query("SELECT pg_advisory_unlock(hashtextextended('metmma:migrations',0))");client.release();}
})().catch(err=>{console.error(err);process.exitCode=1}).finally(()=>pool.end());
