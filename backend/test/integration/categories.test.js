const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const {randomUUID}=require('node:crypto');
const {once}=require('node:events');
const {Pool}=require('pg');
const express=require('express');
const jwt=require('jsonwebtoken');
if(!process.env.TEST_DATABASE_URL)throw new Error('Set TEST_DATABASE_URL to an isolated PostgreSQL test database');
const schema=`categories_test_${randomUUID().replaceAll('-','')}`;
const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL});
const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${schema}`});
require.cache[require.resolve('../../api/db')]={exports:{pool,query:(...args)=>pool.query(...args),transaction:async work=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await work(c);await c.query('COMMIT');return r;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}}};
process.env.JWT_SECRET='isolated-categories-test-key';
let server,base;
const ids={admin:1,pharmacist:2,cashier:3,store_manager:4,hr_officer:5};
async function request(path,{method='GET',body,role='admin'}={}){
 const token=jwt.sign({id:ids[role],username:'test',role},process.env.JWT_SECRET);
 const response=await fetch(`${base}${path}`,{method,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:body===undefined?undefined:JSON.stringify(body)});
 return{status:response.status,data:await response.json()};
}
before(async()=>{
 await admin.query(`CREATE SCHEMA ${schema}`);
 for(const file of ['init.sql','migrations/20261002_mvp.sql','migrations/20261003_staff_workflows.sql','migrations/20261003_payment_amounts.sql','migrations/20261004_categories.sql']){
  await pool.query(readFileSync(require.resolve(`../../../database/${file}`),'utf8'));
 }
 await pool.query(`INSERT INTO users (username, password_hash, role, full_name, email) VALUES
  ('test-admin', 'test-hash', 'admin', 'Test Admin', 'test-admin@example.com'),
  ('test-pharmacist', 'test-hash', 'pharmacist', 'Test Pharmacist', 'test-pharmacist@example.com'),
  ('test-cashier', 'test-hash', 'cashier', 'Test Cashier', 'test-cashier@example.com'),
  ('test-manager', 'test-hash', 'store_manager', 'Test Manager', 'test-manager@example.com'),
  ('test-hr', 'test-hash', 'hr_officer', 'Test HR', 'test-hr@example.com')`);
 const app=express();
 app.use(express.json());
 app.use('/categories',require('../../api/routes/categoriesRoutes'));
 app.use('/products',require('../../api/routes/productsRoutes'));
 app.use(require('../../lib/errors').errorHandler);
 server=app.listen(0,'127.0.0.1');
 await once(server,'listening');
 base=`http://127.0.0.1:${server.address().port}`;
});
after(async()=>{
 if(server)await new Promise(resolve=>server.close(resolve));
 await pool.end();
 await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
 await admin.end();
});
test('every signed-in role reads active categories in configured order',async()=>{
 const response=await request('/categories',{role:'cashier'});
 assert.equal(response.status,200,JSON.stringify(response.data));
 assert.deepEqual(response.data.data.map(category=>category.name),['Antibiotics','Painkillers','Vitamins','Cough & Cold','First Aid','Diagnostics','Other']);
 assert.ok(response.data.data.every(category=>category.isActive===true));
});
test('category writes are restricted to administrators',async()=>{
 for(const role of ['pharmacist','cashier','store_manager','hr_officer']){
  assert.equal((await request('/categories',{method:'POST',role,body:{name:'Not allowed'}})).status,403);
  assert.equal((await request('/categories/1',{method:'PATCH',role,body:{name:'Not allowed'}})).status,403);
 }
});
test('admin can add, rename, reorder and deactivate a category without deleting it',async()=>{
 const created=await request('/categories',{method:'POST',body:{name:'Seasonal',sortOrder:5}});
 assert.equal(created.status,201,JSON.stringify(created.data));
 const id=created.data.data.id;
 assert.equal((await request('/categories')).data.data[0].name,'Seasonal');
 const renamed=await request(`/categories/${id}`,{method:'PATCH',body:{name:'Seasonal remedies',sortOrder:90}});
 assert.equal(renamed.status,200);
 assert.equal(renamed.data.data.name,'Seasonal remedies');
 assert.equal((await request('/categories')).data.data.at(-1).name,'Seasonal remedies');
 const deactivated=await request(`/categories/${id}`,{method:'PATCH',body:{isActive:false}});
 assert.equal(deactivated.status,200);
 assert.equal(deactivated.data.data.isActive,false);
 assert.ok(!(await request('/categories')).data.data.some(category=>category.id===id));
 const all=await request('/categories?all=true');
 assert.ok(all.data.data.some(category=>category.id===id&&category.isActive===false));
 assert.equal((await pool.query('SELECT COUNT(*)::int AS count FROM categories WHERE id=$1',[id])).rows[0].count,1);
});
test('product create and update reject unknown or deactivated category names',async()=>{
 const baseProduct={name:'Seasonal tablets',batchNumber:'B-1',expiryDate:'2030-01-01',quantity:5,unitPrice:10,sellingPrice:12,category:'Not a category'};
 const unknown=await request('/products',{method:'POST',body:baseProduct});
 assert.equal(unknown.status,400);
 assert.equal(unknown.data.code,'VALIDATION');
 assert.deepEqual(unknown.data.errors.map(error=>error.field),['category']);
 const created=await request('/products',{method:'POST',body:{...baseProduct,category:'Antibiotics'}});
 assert.equal(created.status,201,JSON.stringify(created.data));
 const id=created.data.data.id;
 const category=(await request('/categories',{method:'POST',body:{name:'Retired category',sortOrder:100}})).data.data;
 await request(`/categories/${category.id}`,{method:'PATCH',body:{isActive:false}});
 const retiredCreate=await request('/products',{method:'POST',body:{...baseProduct,batchNumber:'B-2',category:'Retired category'}});
 assert.equal(retiredCreate.status,400);
 assert.equal(retiredCreate.data.code,'VALIDATION');
 assert.deepEqual(retiredCreate.data.errors.map(error=>error.field),['category']);
 const retiredUpdate=await request(`/products/${id}`,{method:'PUT',body:{category:'Retired category'}});
 assert.equal(retiredUpdate.status,400);
 assert.equal(retiredUpdate.data.code,'VALIDATION');
 assert.deepEqual(retiredUpdate.data.errors.map(error=>error.field),['category']);
 assert.equal((await request(`/products/${id}`,{method:'PUT',body:{category:'Antibiotics'}})).status,200);
});
