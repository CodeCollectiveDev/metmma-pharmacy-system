// Requires explicit disposable fixture acknowledgement; never use with real pharmacy data.
const {sourceRoot,browserTools,benchDatabaseUrl,fixtureSecret}=require('./config.cjs');
const {Pool}=require(require('node:path').join(sourceRoot,'backend/node_modules/pg'));
const bcrypt=require(require('node:path').join(sourceRoot,'backend/node_modules/bcryptjs'));
const fs=require('node:fs');
(async()=>{const db=new Pool({connectionString:benchDatabaseUrl});
await db.query(fs.readFileSync(require('node:path').join(sourceRoot,'database/init.sql'),'utf8'));
await db.query('UPDATE users SET password_hash=$1',[await bcrypt.hash('MvpTestPassword42',10)]);
await db.query(`INSERT INTO products (product_code,name,batch_number,expiry_date,quantity,unit_price,selling_price,supplier,category,barcode)
SELECT 'BENCH-'||n, 'Medicine '||lpad(n::text,4,'0'), 'BATCH-'||n, '2030-01-01', 100, 10, 10, 'Test supplier', 'Antibiotics', '900'||lpad(n::text,5,'0') FROM generate_series(1,1000) n ON CONFLICT DO NOTHING`);
await db.query(`INSERT INTO sales(receipt_number,total_amount,payment_method,user_id) SELECT 'BASE-'||n,11.65,'cash',1 FROM generate_series(1,100) n ON CONFLICT DO NOTHING`);
console.log('Isolated fixture: 1,000 products, 100 sales; bcrypt test accounts.');await db.end()})().catch(e=>{console.error(e);process.exit(1)});
