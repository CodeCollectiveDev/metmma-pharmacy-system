const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
process.env.JWT_SECRET='change-password-unit-test-secret-value';
let user=null;
const db={query:async(sql,params)=>{
 if(sql.includes('UPDATE users SET password_hash')){
  user={...user,password_hash:params[1],session_version:(user.session_version||0)+1};
  return{rows:[{id:user.id,username:user.username,role:user.role,session_version:user.session_version}]};
 }
 if(sql.includes('password_hash')&&sql.includes('FROM users WHERE id = $1'))return{rows:user?[user]:[]};
 if(sql.includes('FROM users WHERE id = $1'))return{rows:user?[{id:user.id,username:user.username,role:user.role,is_active:user.is_active,session_version:user.session_version}]:[]};
 return{rows:[]};
}};
require.cache[require.resolve('../api/db')]={exports:db};
const express=require('express');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
const {authenticate}=require('../middleware/roleMiddleware');
const {errorHandler}=require('../lib/errors');
const app=express();
app.use(express.json({limit:'128kb'}));
app.get('/api/whoami',authenticate,(req,res)=>res.json({id:req.user.id,role:req.user.role}));
app.use('/api/auth',require('../routes/authRoutes'));
app.use(errorHandler);
let server,base,currentPassword='CurrentPassword1',liveToken;
const sign=(sessionVersion,role='admin')=>jwt.sign({id:1,username:'boss',role,sessionVersion},process.env.JWT_SECRET,{algorithm:'HS256',expiresIn:'1h'});
async function call(path,token,body){
 const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
 return{status:response.status,data:await response.json()};
}
const change=(body,token)=>call('/api/auth/change-password',token,body);
const whoami=async token=>{const response=await fetch(base+'/api/whoami',{headers:{Authorization:`Bearer ${token}`}});return{status:response.status,data:await response.json()};};
before(async()=>{
 user={id:1,username:'boss',password_hash:await bcrypt.hash(currentPassword,10),role:'admin',is_active:true,session_version:0};
 server=app.listen(0,'127.0.0.1');await once(server,'listening');
 base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));});

test('the self-service reset is reserved for administrators',async()=>{
 user.role='cashier';
 const denied=await change({current_password:currentPassword,password:'BrandNewPassword1'},sign(0,'cashier'));
 assert.equal(denied.status,403);assert.equal(denied.data.code,'PERMISSION_DENIED');
 user.role='admin';
});

test('an incorrect current password is rejected and leaves the stored hash untouched',async()=>{
 const hash=user.password_hash;
 const result=await change({current_password:'NotThePassword1',password:'BrandNewPassword1'},sign(0));
 assert.equal(result.status,401);assert.equal(result.data.code,'CURRENT_PASSWORD_INVALID');
 assert.equal(result.data.errors[0].field,'current_password');
 assert.equal(user.password_hash,hash);assert.equal(user.session_version,0);
});

test('the new password must be strong and different from the current one',async()=>{
 const reused=await change({current_password:currentPassword,password:currentPassword},sign(0));
 assert.equal(reused.status,400);assert.equal(reused.data.code,'PASSWORD_REUSE');assert.equal(reused.data.errors[0].field,'password');
 const weak=await change({current_password:currentPassword,password:'short'},sign(0));
 assert.equal(weak.status,400);assert.equal(weak.data.code,'VALIDATION');assert.ok(weak.data.errors.some(f=>f.field==='password'));
 const missing=await change({password:'BrandNewPassword1'},sign(0));
 assert.equal(missing.status,400);assert.ok(missing.data.errors.some(f=>f.field==='current_password'));
});

test('a verified change rewrites the hash and replaces every signed session',async()=>{
 const issued=await change({current_password:currentPassword,password:'BrandNewPassword1'},sign(0));
 assert.equal(issued.status,200,JSON.stringify(issued.data));
 assert.equal(issued.data.success,true);assert.equal(issued.data.user.role,'admin');
 const decoded=jwt.verify(issued.data.token,process.env.JWT_SECRET);
 assert.equal(decoded.id,1);assert.equal(decoded.role,'admin');assert.equal(decoded.sessionVersion,1);
 assert.equal(await bcrypt.compare('BrandNewPassword1',user.password_hash),true);
 assert.equal(await bcrypt.compare(currentPassword,user.password_hash),false);
 assert.equal(user.session_version,1);
 assert.equal((await whoami(sign(0))).status,401);
 assert.equal((await whoami(sign(0))).data.code,'SESSION_EXPIRED');
 const live=await whoami(issued.data.token);
 assert.equal(live.status,200);assert.equal(live.data.id,1);
 currentPassword='BrandNewPassword1';liveToken=issued.data.token;
});

test('repeated failed attempts are rate limited',async()=>{
 let last;
 for(let attempt=0;attempt<15;attempt++){
  last=await change({current_password:'NotThePassword1',password:'BrandNewPassword1'},liveToken);
  if(last.status===429)break;
 }
 assert.equal(last.status,429,JSON.stringify(last.data));assert.equal(last.data.code,'RATE_LIMITED');
 const blocked=await change({current_password:currentPassword,password:'AnotherPassword1'},liveToken);
 assert.equal(blocked.status,429);
});
