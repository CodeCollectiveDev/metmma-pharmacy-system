const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {once}=require('node:events');
const {Pool}=require('pg');
const jwt=require('jsonwebtoken');
const bcrypt=require('bcryptjs');
if(!process.env.TEST_DATABASE_URL)throw new Error('Use an isolated TEST_DATABASE_URL.');
const schema=`mvp_test_${randomUUID().replaceAll('-','')}`;
const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema} -c timezone=UTC`,statement_timeout:5000});
const transaction=async work=>{const c=await pool.connect();try{await c.query('BEGIN');await c.query("SET LOCAL lock_timeout='3s'");const r=await work(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}};
require.cache[require.resolve('../../api/db')]={exports:{pool,query:(...args)=>pool.query(...args),transaction}};
process.env.JWT_SECRET='test-only-secret-longer-than-32-characters';
process.env.TAX_RATE_BPS='1650';
let server,base;
const today=new Date().toISOString().slice(0,10);
const monthStart=today.slice(0,8)+'01';
const nextMonth=new Date(Date.UTC(Number(today.slice(0,4)),Number(today.slice(5,7)),1)).toISOString().slice(0,10);
const ids={admin:1,pharmacist:2,cashier:3,store_manager:4,hr_officer:5};
async function request(path,{method='GET',body,role='admin',authenticated=true,expired=false}={}){
 const token=jwt.sign({id:ids[role],role},process.env.JWT_SECRET,{expiresIn:expired?-1:3600});
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(authenticated?{Authorization:`Bearer ${token}`}:{})},body:body===undefined?undefined:JSON.stringify(body)});
 return{status:response.status,data:await response.json(),requestId:response.headers.get('X-Request-ID')};
}
async function product(quantity=10,price='10.00',extras={}){
 const code=`T-${randomUUID().slice(0,8).toUpperCase()}`;
 return(await pool.query(`INSERT INTO products(product_code,name,batch_number,expiry_date,quantity,unit_price,selling_price,supplier,category,reorder_level,is_active) VALUES($1,$1,'BATCH','2030-01-01',$2,$3,$3,'Supplier','Other',$4,$5) RETURNING *`,[code,quantity,price,extras.reorderLevel ?? 0,extras.active ?? true])).rows[0];
}
function sale(p,quantity=1,overrides={}){return{idempotencyKey:randomUUID(),items:[{productId:p.id,quantity,unitPrice:p.selling_price,subtotal:(Number(p.selling_price)*quantity).toFixed(2)}],totalAmount:(Math.round(Number(p.selling_price)*quantity*100*1.165)/100).toFixed(2),paymentMethod:'cash',...overrides};}
async function count(table,where='',params=[]){return Number((await pool.query(`SELECT COUNT(*) FROM ${table} ${where}`,params)).rows[0].count);}
before(async()=>{await admin.query(`CREATE SCHEMA ${schema}`);await pool.query(readFileSync(require.resolve('../../../database/init.sql'),'utf8'));await pool.query(readFileSync(require.resolve('../../../database/migrations/20261002_mvp.sql'),'utf8'));
  await pool.query(readFileSync(require.resolve('../../../database/migrations/20261003_staff_workflows.sql'),'utf8'));
  await pool.query(`INSERT INTO users (username, password_hash, role, full_name, email) VALUES
    ('test-admin', 'test-hash', 'admin', 'Test Admin', 'test-admin@example.com'),
    ('test-pharmacist', 'test-hash', 'pharmacist', 'Test Pharmacist', 'test-pharmacist@example.com'),
    ('test-cashier', 'test-hash', 'cashier', 'Test Cashier', 'test-cashier@example.com'),
    ('manager1', 'test-hash', 'store_manager', 'Test Manager', 'test-manager@example.com'),
    ('test-hr', 'test-hash', 'hr_officer', 'Test HR', 'test-hr@example.com')`);
  await pool.query(readFileSync(require.resolve('../../../database/migrations/20261003_payment_amounts.sql'),'utf8'));await pool.query('UPDATE users SET password_hash=$1',[await bcrypt.hash('TestPassword42',10)]);server=require('../../app').listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}/api`;});
after(async()=>{if(server)await new Promise(r=>server.close(r));await pool.end();await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();});

test('atomic checkout records exact stock, lines, authenticated actor and one linked income',async()=>{
 const p=await product(10);const result=await request('/sales/checkout',{method:'POST',body:sale(p,2,{userId:5}),role:'cashier'});
 assert.equal(result.status,201,JSON.stringify(result.data));const id=result.data.saleId;
 assert.equal(result.data.data.totalAmount,'23.30');assert.equal(result.data.data.tax,'3.30');
 assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,8);
 const income=(await pool.query("SELECT * FROM financial_transactions WHERE sale_id=$1 AND type='income'",[id])).rows[0];
 assert.equal(income.amount,'23.30');assert.equal(income.created_by,3);
 assert.equal((await pool.query('SELECT user_id FROM stock_movements WHERE product_id=$1',[p.id])).rows[0].user_id,3);
 assert.equal(await count('sale_items','WHERE sale_id=$1',[id]),1);
});

test('income write failure rolls back sale, lines, stock and movements and returns sanitized correlation ID',async()=>{
 const p=await product(5);const before=await count('sales');
 await pool.query(`CREATE FUNCTION fail_income() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.type='income' THEN RAISE EXCEPTION 'secret SQL test detail'; END IF; RETURN NEW; END $$; CREATE TRIGGER fail_income BEFORE INSERT ON financial_transactions FOR EACH ROW EXECUTE FUNCTION fail_income();`);
 let result;try{result=await request('/sales/checkout',{method:'POST',body:sale(p)});}finally{await pool.query('DROP TRIGGER fail_income ON financial_transactions; DROP FUNCTION fail_income();');}
 assert.equal(result.status,500);assert.equal(result.data.code,'UNEXPECTED');assert.equal(result.data.requestId,result.requestId);
 assert.doesNotMatch(JSON.stringify(result.data),/secret|SQL|stack|INSERT|Exception/);assert.equal(await count('sales'),before);assert.equal(await count('stock_movements','WHERE product_id=$1',[p.id]),0);assert.equal(await count('sale_items','WHERE product_id=$1',[p.id]),0);assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,5);
});

test('ten concurrent retries use one sale, one income and one stock deduction',async()=>{
 const p=await product(5),body=sale(p);
 const responses=await Promise.all(Array.from({length:10},()=>request('/sales/checkout',{method:'POST',body})));
 assert.ok(responses.every(r=>[200,201].includes(r.status)));assert.equal(new Set(responses.map(r=>r.data.saleId)).size,1);assert.equal(await count('sales','WHERE idempotency_key=$1',[body.idempotencyKey]),1);assert.equal(await count('financial_transactions','WHERE sale_id=$1',[responses[0].data.saleId]),1);assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,4);
 const changed=await request('/sales/checkout',{method:'POST',body:{...body,customerName:'different'}});assert.equal(changed.status,409);assert.equal(changed.data.code,'CHECKOUT_KEY_CONFLICT');
});

test('competing sales cannot oversell the last three units',async()=>{
 const p=await product(3);const responses=await Promise.all(Array.from({length:8},()=>request('/sales/checkout',{method:'POST',body:sale(p)})));
 assert.equal(responses.filter(r=>r.status===201).length,3);assert.equal(responses.filter(r=>r.data.code==='INSUFFICIENT_STOCK').length,5);assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,0);assert.equal(await count('sale_items','WHERE product_id=$1',[p.id]),3);
});

test('opposite cart orders acquire locks consistently without deadlock',async()=>{
 const a=await product(5),b=await product(5),items=[...sale(a).items,...sale(b).items];
 const responses=await Promise.all([items,[...items].reverse()].map(lines=>request('/sales/checkout',{method:'POST',body:{idempotencyKey:randomUUID(),items:lines,totalAmount:'23.30',paymentMethod:'card'}})));
 assert.deepEqual(responses.map(r=>r.status),[201,201]);
});

test('server rejects altered prices/totals, duplicate lines, expired/inactive products, and insufficient stock',async()=>{
 const p=await product(2),body=sale(p);
 for(const input of [{...body,totalAmount:'1.00'},{...body,items:[{...body.items[0],unitPrice:'1.00',subtotal:'1.00'}]}])assert.equal((await request('/sales/checkout',{method:'POST',body:input})).data.code,'PRICE_CHANGED');
 assert.equal((await request('/sales/checkout',{method:'POST',body:{...body,items:[...body.items,...body.items]}})).status,400);
 assert.equal((await request('/sales/checkout',{method:'POST',body:sale(p,3)})).data.code,'INSUFFICIENT_STOCK');
 const expired=await product();await pool.query("UPDATE products SET expiry_date='2000-01-01' WHERE id=$1",[expired.id]);const inactive=await product(10,'10.00',{active:false});
 for(const item of [expired,inactive])assert.equal((await request('/sales/checkout',{method:'POST',body:sale(item)})).data.code,'PRODUCT_UNAVAILABLE');
 assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,2);
});

test('decimal sale of 0.10 plus 0.20 records 0.30 subtotal, 0.05 tax and 0.35 total',async()=>{
 const a=await product(5,'0.10'),b=await product(5,'0.20');const r=await request('/sales/checkout',{method:'POST',body:{idempotencyKey:randomUUID(),items:[...sale(a).items,...sale(b).items],totalAmount:'0.35',paymentMethod:'cash'}});assert.equal(r.status,201);assert.equal(r.data.data.subtotal,'0.30');assert.equal(r.data.data.tax,'0.05');assert.equal(r.data.data.totalAmount,'0.35');
});

test('one reversal returns stock and records exactly one money reversal, even on concurrent retries',async()=>{
 const p=await product(4);const saved=await request('/sales/checkout',{method:'POST',body:sale(p)});const id=saved.data.saleId;
 const results=await Promise.all(Array.from({length:4},()=>request(`/sales/${id}/reverse`,{method:'POST',body:{kind:'refund',reason:'Customer return'}})));assert.ok(results.every(r=>r.status===200));assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,4);assert.equal(await count('financial_transactions',"WHERE sale_id=$1 AND type='refund'",[id]),1);assert.equal((await pool.query('SELECT SUM(amount)::text AS total FROM financial_transactions WHERE sale_id=$1',[id])).rows[0].total,'0.00');
 assert.equal((await request(`/sales/${id}/reverse`,{method:'POST',body:{kind:'void',reason:'Not allowed'},role:'cashier'})).status,403);
});

test('expense create/retry/edit/delete keeps an audit trail and rejects stale updates',async()=>{
 const body={idempotencyKey:randomUUID(),date:today,amount:'100.25',category:'Rent',paymentMethod:'cash',note:'October rent',supplier:''};
 const created=await request('/finances/expenses',{method:'POST',body,role:'store_manager'});assert.equal(created.status,201);const id=created.data.data.id;assert.equal(created.data.data.amount,'-100.25');
 const retry=await request('/finances/expenses',{method:'POST',body,role:'store_manager'});assert.equal(retry.data.data.id,id);
 const {idempotencyKey,...edit}=body;const updated=await request(`/finances/expenses/${id}`,{method:'PUT',body:{...edit,amount:'125.50',version:1},role:'store_manager'});assert.equal(updated.status,200);assert.equal(updated.data.data.version,2);
 assert.equal((await request(`/finances/expenses/${id}`,{method:'PUT',body:{...edit,version:1}})).status,409);
 assert.equal((await request(`/finances/expenses/${id}`,{method:'DELETE',body:{version:2},role:'store_manager'})).status,200);
 assert.equal((await request(`/finances/expenses/${id}`,{method:'DELETE',body:{version:2},role:'store_manager'})).status,200);
 const changes=await request(`/finances/expenses/${id}/audit`);assert.deepEqual(changes.data.data.map(e=>e.action),['deleted','edited','created']);assert.equal(changes.data.data[1].before.amount,'-100.25');assert.equal(changes.data.data[1].after.amount,'-125.50');assert.equal(changes.data.data[2].username,'manager1');
 assert.ok(!(await request('/finances/transactions?type=expense')).data.data.some(row=>row.id===id));
});

test('income reconciles to all POS sales and summary net reconciles exactly after expenses and refunds',async()=>{
 await request('/finances/expenses',{method:'POST',body:{idempotencyKey:randomUUID(),date:today,amount:'10.01',category:'Utilities',paymentMethod:'card'}});
 const expected=(await pool.query(`SELECT COALESCE(SUM(total_amount),0)::text AS total FROM sales WHERE created_at>=$1 AND created_at<$2`,[monthStart,nextMonth])).rows[0].total;
 const income=(await pool.query(`SELECT COALESCE(SUM(amount),0)::text AS total FROM financial_transactions WHERE type='income' AND transaction_date>=$1 AND transaction_date<$2`,[monthStart,nextMonth])).rows[0].total;assert.equal(income,expected);
 const summary=await request(`/finances/summary?start=${monthStart}&end=${today}`);assert.equal(summary.status,200);assert.equal(summary.data.grossIncome,expected);
 const net=(await pool.query(`SELECT SUM(amount)::text AS total FROM financial_transactions WHERE deleted_at IS NULL AND transaction_date>=$1 AND transaction_date<$2`,[monthStart,nextMonth])).rows[0].total;assert.equal(summary.data.net,net);assert.equal(summary.data.expenses,'10.01');
});

test('financial permissions, sessions, health, invalid data and SQL injection have safe responses',async()=>{
 const expense={idempotencyKey:randomUUID(),date:today,amount:'1.00',category:'Other',paymentMethod:'cash'};
 for(const role of ['cashier','pharmacist','hr_officer'])assert.equal((await request('/finances/expenses',{method:'POST',body:expense,role})).status,403);
 assert.equal((await request('/finances/summary',{role:'cashier'})).status,403);
 assert.equal((await request('/products',{expired:true})).data.code,'SESSION_EXPIRED');assert.equal((await request('/health')).status,200);
 assert.equal((await request('/auth/register',{method:'POST',authenticated:false,body:{}})).status,401);
 const injection=await request('/products/expiring?days=90%27%3BSELECT%20pg_sleep(5)--');assert.equal(injection.status,400);assert.equal(injection.data.code,'VALIDATION');assert.doesNotMatch(JSON.stringify(injection.data),/pg_sleep|SQL|syntax/);
 assert.equal((await request('/finances/expenses',{method:'POST',body:{...expense,date:'2026-02-30'}})).status,400);
 assert.equal((await request('/finances/expenses',{method:'POST',body:{...expense,amount:'1.234'}})).status,400);
 assert.equal((await request('/sales/history?limit=101')).status,400);
});

test('notifications use real low-stock/expiry data and read state belongs to each user',async()=>{
 const p=await product(0,'10.00',{reorderLevel:2});const expired=await product(1);await pool.query("UPDATE products SET expiry_date='2000-01-01' WHERE id=$1",[expired.id]);
 const first=await request('/notifications?limit=100');const notice=first.data.data.find(n=>n.productId===p.id);assert.ok(notice&&!notice.read);assert.ok(first.data.data.some(n=>n.productId===expired.id&&n.title.startsWith('Expired:')));
 await request(`/notifications/${notice.id}/read`,{method:'POST'});assert.equal((await request('/notifications?limit=100')).data.data.find(n=>n.id===notice.id).read,true);assert.equal((await request('/notifications?limit=100',{role:'cashier'})).data.data.find(n=>n.id===notice.id).read,false);
 await request('/notifications/read-all',{method:'POST'});assert.equal((await request('/notifications')).data.unreadCount,0);
 const before=Number((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity);assert.equal(before,0);
});

test('additive restock and optimistic absolute adjustments cannot overwrite a concurrent sale',async()=>{
 const p=await product(10);const results=await Promise.all([request(`/products/${p.id}/restock`,{method:'POST',body:{idempotencyKey:randomUUID(),quantity:5,reason:'Received delivery'}}),request('/sales/checkout',{method:'POST',body:sale(p)})]);assert.ok(results.every(r=>[200,201].includes(r.status)));assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,14);
 assert.equal((await request(`/products/${p.id}`,{method:'PUT',body:{quantity:15,expectedQuantity:10,reason:'Counted stock'}})).status,409);
});

test('migration up/down/up preserves preexisting records and archives all new finance, audit and read data',async()=>{
 const snapshots={stock:await pool.query('SELECT * FROM stock_movements ORDER BY id'),sales:await pool.query('SELECT * FROM sales ORDER BY id'),products:await pool.query('SELECT * FROM products ORDER BY id'),finance:await pool.query('SELECT * FROM financial_transactions ORDER BY id'),audit:await pool.query('SELECT * FROM expense_audit ORDER BY id'),reads:await pool.query('SELECT * FROM notification_reads ORDER BY user_id,alert_key')};
 const up=readFileSync(require.resolve('../../../database/migrations/20261002_mvp.sql'),'utf8'),down=readFileSync(require.resolve('../../../database/migrations/20261002_mvp.down.sql'),'utf8');
 await pool.query(up);assert.equal(await count('financial_transactions'),snapshots.finance.rowCount);await pool.query(down);assert.equal(await count('mvp_archive_financial_transactions'),snapshots.finance.rowCount);assert.equal(await count('sales'),snapshots.sales.rowCount);await pool.query(up);
 for(const [key,table]of[['stock','stock_movements'],['sales','sales'],['products','products'],['finance','financial_transactions'],['audit','expense_audit']]){const rows=(await pool.query(`SELECT * FROM ${table} ORDER BY id`)).rows;assert.deepEqual(rows,snapshots[key].rows);}
 assert.deepEqual((await pool.query('SELECT * FROM notification_reads ORDER BY user_id,alert_key')).rows,snapshots.reads.rows);
});

test('legacy report APIs write the verified schema and employee partial edits preserve omitted fields',async()=>{
 const financial=await request('/reports/financial',{method:'POST',body:{report_name:'Monthly record',type:'Monthly',total_revenue:500,total_expenses:100,net_profit:400,period_start:'2026-01-01',period_end:'2026-01-31'}});assert.equal(financial.status,201);
 const reports=await request('/reports/financial');assert.equal(reports.data.data[0].total_revenue,'500.00');assert.equal(reports.data.data[0].total_costs,'100.00');
 const compliance=await request('/reports/compliance',{method:'POST',body:{policy_name:'Stock record review',status:'Compliant',auditor_name:'Test reviewer',last_audit_date:'2026-01-01'}});assert.equal(compliance.status,201);assert.equal((await request('/reports/compliance')).data.data[0].status,'completed');
 const employee=await request('/employees',{method:'POST',body:{first_name:'Jane',last_name:'Smith',email:'jane@example.com',department:'Pharmacy',job_title:'Assistant',salary:1000,hire_date:'2026-01-01'}});const id=employee.data.data.id;
 assert.equal((await request(`/employees/${id}`,{method:'PUT',body:{salary:1200}})).status,200);const saved=(await request(`/employees/${id}`)).data;assert.equal(saved.first_name,'Jane');assert.equal(saved.email,'jane@example.com');assert.equal(saved.position,'Assistant');assert.equal(saved.salary,'1200.00');
});

test('deactivated staff cannot use an otherwise valid signed session',async()=>{
 await pool.query('UPDATE users SET is_active=FALSE WHERE id=2');try{assert.equal((await request('/products',{role:'pharmacist'})).status,401);}finally{await pool.query('UPDATE users SET is_active=TRUE WHERE id=2');}
});


test('delivery retries do not add the same stock twice',async()=>{
 const p=await product(10),body={idempotencyKey:randomUUID(),quantity:5,reason:'Supplier delivery'};
 const results=await Promise.all(Array.from({length:5},()=>request(`/products/${p.id}/restock`,{method:'POST',body})));
 assert.ok(results.every(r=>r.status===200));assert.equal((await pool.query('SELECT quantity FROM products WHERE id=$1',[p.id])).rows[0].quantity,15);assert.equal(await count('stock_movements','WHERE product_id=$1',[p.id]),1);
});

test('account provisioning links employees atomically and management protects access',async()=>{
 const username='staff-'+randomUUID().slice(0,8);
 const created=await request('/auth/register',{method:'POST',body:{username,password:'TestPassword42',full_name:'New Staff',role:'cashier',email:'new@example.com'}});
 assert.equal(created.status,201,JSON.stringify(created.data));const id=created.data.user.id;
 assert.equal(await count('employees','WHERE user_id=$1',[id]),1);
 const list=await request('/accounts');assert.equal(list.status,200);assert.ok(list.data.data.every(u=>!('password_hash' in u)));
 assert.equal((await request('/accounts',{role:'cashier'})).status,403);
 assert.equal((await request('/accounts/1',{method:'PATCH',body:{is_active:false}})).status,403);
 const login=await request('/auth/login',{method:'POST',authenticated:false,body:{username,password:'TestPassword42'}});assert.equal(login.status,200);
 assert.equal((await request(`/accounts/${id}`,{method:'PATCH',body:{password:'ChangedPassword42'}})).status,200);
 const old=await fetch(base+'/products',{headers:{Authorization:`Bearer ${login.data.token}`}});assert.equal(old.status,401);
 assert.equal((await request('/auth/login',{method:'POST',authenticated:false,body:{username,password:'TestPassword42'}})).status,401);
 assert.equal((await request('/auth/login',{method:'POST',authenticated:false,body:{username,password:'ChangedPassword42'}})).status,200);
 const employee=(await pool.query('SELECT id FROM employees WHERE user_id=$1',[id])).rows[0];
 const conflict=await request('/auth/register',{method:'POST',body:{username:username+'x',password:'TestPassword42',full_name:'Duplicate',role:'cashier',employee_id:employee.id}});
 assert.equal(conflict.status,409);assert.equal(await count('users','WHERE username=$1',[username+'x']),0);
});

test('leave permissions, concurrent overlap protection and terminal transitions',async()=>{
 const employee=(await pool.query("INSERT INTO employees(employee_id,first_name,last_name,hire_date) VALUES($1,'Leave','Test',CURRENT_DATE) RETURNING id",['LEAVE-'+randomUUID()])).rows[0];
 const body={employee_id:employee.id,leave_type:'Annual',start_date:today,expected_return_date:today};
 assert.equal((await request('/leave',{method:'POST',role:'cashier',body})).status,403);
 const responses=await Promise.all([request('/leave',{method:'POST',role:'hr_officer',body}),request('/leave',{method:'POST',role:'hr_officer',body})]);
 assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);
 const id=responses.find(r=>r.status===201).data.data.id;
 assert.equal((await request(`/leave/${id}`,{method:'PATCH',role:'hr_officer',body:{status:'approved'}})).status,200);
 const current=await request(`/leave?status=current&employee_id=${employee.id}`);assert.equal(current.data.data.length,1);
 assert.equal((await request(`/leave/${id}`,{method:'PATCH',body:{status:'completed'}})).status,200);
 assert.equal((await request(`/leave/${id}`,{method:'PATCH',body:{status:'approved'}})).status,409);
 assert.equal((await request(`/leave?status=current&employee_id=${employee.id}`)).data.data.length,0);
});

test('cash change is saved, replayed and excluded from income; other payments must match',async()=>{
 const p=await product(10),body={...sale(p),amountReceived:'20.00'};
 const r=await request('/sales/checkout',{method:'POST',body});assert.equal(r.status,201);assert.equal(r.data.data.amountReceived,'20.00');assert.equal(r.data.data.changeGiven,'8.35');
 assert.equal((await pool.query('SELECT amount FROM financial_transactions WHERE sale_id=$1',[r.data.saleId])).rows[0].amount,'11.65');
 const retry=await request('/sales/checkout',{method:'POST',body});assert.equal(retry.status,200);assert.equal(retry.data.data.changeGiven,'8.35');
 for(const extra of [{amountReceived:'10.00'},{amountReceived:'20.00',paymentMethod:'card'}]){const invalid=await request('/sales/checkout',{method:'POST',body:{...sale(p),...extra}});assert.equal(invalid.status,400);assert.equal(invalid.data.code,'PAYMENT_AMOUNT');}
});

test('attendance day roster, historical ranges and corrections retain one record per day',async()=>{
 const e=(await pool.query("INSERT INTO employees(employee_id,first_name,last_name,hire_date) VALUES($1,'Attendance','History',CURRENT_DATE) RETURNING id",['ATT-'+randomUUID()])).rows[0];
 const body={employee_id:e.id,date:'2026-09-01',status:'present'};
 assert.equal((await request('/attendance',{method:'POST',body})).status,201);
 assert.equal((await request('/attendance',{method:'POST',body:{...body,status:'late'}})).status,201);
 const result=await request(`/attendance?employee_id=${e.id}&start=2026-09-01&end=2026-09-01`);assert.equal(result.data.data.length,1);assert.equal(result.data.data[0].status,'late');assert.equal(result.data.data[0].date,'2026-09-01');
 assert.equal((await request(`/attendance?employee_id=${e.id}&start=2026-09-02`)).data.data.length,0);
 const roster=await request('/attendance/day?start=2026-09-01&search=Attendance');assert.ok(roster.data.data.some(r=>r.employee_id===e.id&&r.status==='late'));
 assert.equal((await request('/attendance?start=2026-02-30')).status,400);
});
