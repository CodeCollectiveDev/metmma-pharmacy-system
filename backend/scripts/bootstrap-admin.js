require('dotenv').config({quiet:true});
const {pool} = require('../api/db');
const bcrypt = require('bcryptjs');
(async()=>{
  const username = process.env.BOOTSTRAP_USERNAME, password = process.env.BOOTSTRAP_PASSWORD;
  if (!username || username.length < 3 || !password || password.length < 10 || Buffer.byteLength(password) > 72) throw new Error('Supply BOOTSTRAP_USERNAME and BOOTSTRAP_PASSWORD (10–72 bytes).');
  const hash = await bcrypt.hash(password,12);
  // Existing valid passwords are never replaced. Only init.sql's unusable sample hashes are eligible.
  const result = await pool.query(`INSERT INTO users(username,password_hash,role,full_name) VALUES($1,$2,'admin','Pharmacy administrator') ON CONFLICT(username) DO UPDATE SET password_hash=EXCLUDED.password_hash,updated_at=CURRENT_TIMESTAMP WHERE users.password_hash LIKE 'temp_hash_%' AND users.role='admin' RETURNING id`,[username,hash]);
  console.info(result.rowCount ? 'Administrator account is ready.' : 'Existing account preserved; no password was changed.');
})().catch(err=>{console.error(err.message);process.exitCode=1}).finally(()=>pool.end());
