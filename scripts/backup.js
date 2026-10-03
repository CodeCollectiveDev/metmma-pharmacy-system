#!/usr/bin/env node
const {execFile}=require('node:child_process');
const {mkdirSync,statSync,renameSync}=require('node:fs');
const {join}=require('node:path');
require('../backend/node_modules/dotenv').config({path:join(__dirname,'../backend/.env'),quiet:true});
const directory=join(__dirname,'../backups');mkdirSync(directory,{recursive:true,mode:0o700});
const filename=join(directory,`pharmacy-${new Date().toISOString().replaceAll(':','-')}.dump`);
const pending=filename+'.partial';
const connection=process.env.DATABASE_URL || undefined;
// Use argv, never shell interpolation. Credentials go only to pg_dump's environment.
const env={...process.env,PGSSLMODE:process.env.DB_SSL==='true'?'verify-full':'disable',PGPASSWORD:process.env.DB_PASSWORD || '',...(connection?{PGDATABASE:connection}:{PGHOST:process.env.DB_HOST,PGPORT:process.env.DB_PORT,PGDATABASE:process.env.DB_NAME,PGUSER:process.env.DB_USER})};
execFile('pg_dump',['--format=custom','--file',pending],{env,timeout:120000},error=>{
 if(error){console.error('Backup failed. Check the database connection and pg_dump installation.');process.exitCode=1;return;}
 if(!statSync(pending).size){console.error('Backup is empty.');process.exitCode=1;return;}
 renameSync(pending,filename);console.info(`Backup saved to ${filename}. Keep it until the release is verified.`);
});
