const {test}=require('node:test');
const assert=require('node:assert/strict');
const jwt=require('jsonwebtoken');
let account;
require.cache[require.resolve('../api/db')]={exports:{query:async()=>({rows:account?[account]:[]})}};
process.env.JWT_SECRET='staff-workflow-unit-test-secret';
const {authenticate}=require('../middleware/roleMiddleware');
const {createSchema}=require('../api/routes/leaveRoutes');
const request={employee_id:1,leave_type:'Annual',start_date:'2026-10-01',expected_return_date:'2026-10-05'};
test('leave validation rejects impossible dates, reversed ranges and caller-controlled status',()=>{
 assert.equal(createSchema.validate(request).error,undefined);
 for(const body of [undefined,{}, {...request,start_date:'2026-02-30'}, {...request,expected_return_date:'2026-09-01'}, {...request,status:'approved'}, {...request,employee_id:0}])assert.ok(createSchema.validate(body).error);
 assert.equal(createSchema.validate({...request,expected_return_date:request.start_date}).error,undefined);
});
test('account credential version invalidates old signed sessions, including after reactivation',async()=>{
 account={id:1,username:'staff',role:'cashier',is_active:true,session_version:2};
 async function check(version){let err;const req={headers:{authorization:'Bearer '+jwt.sign({id:1,role:'cashier',...(version===undefined?{}:{sessionVersion:version})},process.env.JWT_SECRET)}};await authenticate(req,{},e=>{err=e});return{err,req};}
 assert.equal((await check(0)).err.code,'SESSION_EXPIRED');
 assert.equal((await check()).err.code,'SESSION_EXPIRED');
 assert.equal((await check(2)).req.user.id,1);
 account.is_active=false;assert.equal((await check(2)).err.code,'SESSION_EXPIRED');
 account.is_active=true;account.session_version=3;assert.equal((await check(2)).err.code,'SESSION_EXPIRED');
 assert.equal((await check(3)).err,undefined);
});
