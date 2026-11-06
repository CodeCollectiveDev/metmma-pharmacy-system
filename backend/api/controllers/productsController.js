const db=require('../db');
const {createHash}=require('node:crypto');
const {AppError}=require('../../lib/errors');
const {paging}=require('../../lib/validation');
const columns=`id,product_code,name,generic_name,batch_number,expiry_date::text,quantity,unit_price,selling_price,cost_price,supplier,category,reorder_level,location,barcode,is_active,expiry_date<CURRENT_DATE AS expired`;
const formatProduct=p=>({id:p.id,productCode:p.product_code,name:p.name,genericName:p.generic_name,batchNumber:p.batch_number,expiryDate:p.expiry_date,quantity:p.quantity,unitPrice:p.unit_price,sellingPrice:p.selling_price,costPrice:p.cost_price,supplier:p.supplier,category:p.category,reorderLevel:p.reorder_level,location:p.location,barcode:p.barcode,isActive:p.is_active,expired:p.expired,stockStatus:p.quantity===0?'Out of Stock':p.quantity<=p.reorder_level?'Low Stock':'In Stock'});
async function requireActiveCategory(client,category){
 const result=await client.query('SELECT id FROM categories WHERE name=$1 AND is_active=TRUE FOR SHARE',[category]);
 if(result.rowCount)return;
 const failure=new AppError('VALIDATION',400,['category']);
 failure.fieldDetails=[{field:'category',message:'Choose an option from the list.'}];
 throw failure;
}
async function requireCurrentOrFutureExpiry(client,expiryDate){
 const valid=(await client.query('SELECT $1::date>=CURRENT_DATE AS valid',[expiryDate])).rows[0].valid;
 if(!valid)throw new AppError('VALIDATION',400,['expiryDate']);
}
// Advisory only: find an active record with the same name and batch (case-insensitive). Public data only.
async function findDuplicateBatch(client,name,batchNumber,excludeId){
 const result=await client.query(`SELECT id,name,product_code,batch_number,expiry_date::text AS expiry_date,quantity FROM products WHERE is_active=TRUE AND lower(name)=lower($1) AND upper(batch_number)=upper($2) AND ($3::int IS NULL OR id<>$3::int) ORDER BY id ASC LIMIT 1`,[name,batchNumber,excludeId??null]);
 const row=result.rows[0];
 return row?{id:row.id,name:row.name,productCode:row.product_code,batchNumber:row.batch_number,expiryDate:row.expiry_date,quantity:row.quantity}:null;
}
async function getAllProducts(req,res){
 const q=req.validatedQuery,values=[],where=['is_active=TRUE'];
 if(q.id){values.push(q.id);where.push(`id=$${values.length}`);}
 if(q.category){values.push(`%${q.category}%`);where.push(`category ILIKE $${values.length}`);}
 if(q.search){values.push(q.sellable?`${q.search.toLowerCase()}%`:`%${q.search.toLowerCase()}%`);const n=values.length;where.push(`(lower(name) LIKE $${n} OR lower(product_code) LIKE $${n} OR lower(generic_name) LIKE $${n} OR lower(batch_number) LIKE $${n} OR lower(barcode) LIKE $${n})`);}
 if(q.barcode){values.push(q.barcode);where.push(`(barcode=$${values.length} OR lower(product_code)=lower($${values.length}) OR lower(batch_number)=lower($${values.length}))`);}
 if(q.sellable)where.push('quantity>0 AND expiry_date>=CURRENT_DATE');
 if(q.status==='low')where.push('quantity<=reorder_level');
 if(q.status==='expired')where.push('expiry_date<CURRENT_DATE');
 if(q.status==='expiring')where.push('quantity>0 AND expiry_date BETWEEN CURRENT_DATE AND CURRENT_DATE+90');
 if(q.days!==undefined){values.push(q.days);where.push(`quantity>0 AND expiry_date<=CURRENT_DATE+$${values.length}::int`);}
 const filter=where.join(' AND '),count=(await db.query(`SELECT COUNT(*) FROM products WHERE ${filter}`,values)).rows[0].count;
 values.push(q.limit,(q.page-1)*q.limit);
 const result=await db.query(`SELECT ${columns} FROM products WHERE ${filter} ORDER BY name ASC,id ASC LIMIT $${values.length-1} OFFSET $${values.length}`,values);
 res.json({success:true,count:result.rowCount,data:result.rows.map(formatProduct),pagination:paging(q,count,result.rowCount)});
}
async function getProductById(req,res){const row=(await db.query(`SELECT ${columns} FROM products WHERE id=$1`,[req.params.id])).rows[0];if(!row)throw new AppError('NOT_FOUND',404);res.json({success:true,data:formatProduct(row)});}
async function getSummary(req,res){res.json((await db.query(`SELECT COUNT(*)::int AS total,COUNT(*) FILTER(WHERE quantity<=reorder_level)::int AS low,COUNT(*) FILTER(WHERE expiry_date<CURRENT_DATE)::int AS expired FROM products WHERE is_active=TRUE`)).rows[0]);}
async function createProduct(req,res){
 const d=req.body;
 const row=await db.transaction(async client=>{
  await requireCurrentOrFutureExpiry(client,d.expiryDate);
  await requireActiveCategory(client,d.category);
  const duplicateBatch=await findDuplicateBatch(client,d.name,d.batchNumber);
  const result=await client.query(`INSERT INTO products(product_code,name,generic_name,batch_number,expiry_date,quantity,unit_price,selling_price,cost_price,supplier,category,reorder_level,location,barcode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING ${columns}`,[d.productCode,d.name,d.genericName,d.batchNumber,d.expiryDate,d.quantity,d.unitPrice,d.sellingPrice,d.costPrice,d.supplier,d.category,d.reorderLevel,d.location,d.barcode]);
  const product=result.rows[0];
  if(d.quantity)await client.query(`INSERT INTO stock_movements(product_id,user_id,movement_type,quantity_change,previous_quantity,new_quantity,notes) VALUES($1,$2,'purchase',$3,0,$3,'Initial stock')`,[product.id,req.user.id,d.quantity]);
  return {product,duplicateBatch};
 });
 res.status(201).json({success:true,data:formatProduct(row.product),...(row.duplicateBatch?{duplicateBatch:row.duplicateBatch}:{})});
}
const fieldMap={productCode:'product_code',name:'name',genericName:'generic_name',batchNumber:'batch_number',expiryDate:'expiry_date',quantity:'quantity',unitPrice:'unit_price',sellingPrice:'selling_price',costPrice:'cost_price',supplier:'supplier',category:'category',reorderLevel:'reorder_level',location:'location',barcode:'barcode',isActive:'is_active'};
async function updateProduct(req,res){
 const result=await db.transaction(async client=>{
  const current=(await client.query('SELECT id,quantity FROM products WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!current)throw new AppError('NOT_FOUND',404);
  if(req.body.quantity!==undefined&&req.body.expectedQuantity!==current.quantity)throw new AppError('CONFLICT',409);
  if(req.body.expiryDate!==undefined)await requireCurrentOrFutureExpiry(client,req.body.expiryDate);
  if(req.body.category!==undefined)await requireActiveCategory(client,req.body.category);
  const fields=Object.entries(req.body).filter(([key])=>fieldMap[key]);if(!fields.length)throw new AppError('VALIDATION',400);
  const values=fields.map(([,value])=>value);values.push(req.params.id);
  const row=(await client.query(`UPDATE products SET ${fields.map(([key],i)=>`${fieldMap[key]}=$${i+1}`).join(',')},updated_at=CURRENT_TIMESTAMP WHERE id=$${values.length} RETURNING ${columns}`,values)).rows[0];
  if(row.quantity!==current.quantity)await client.query(`INSERT INTO stock_movements(product_id,user_id,movement_type,quantity_change,previous_quantity,new_quantity,notes) VALUES($1,$2,$3,$4,$5,$6,$7)`,[current.id,req.user.id,row.quantity>current.quantity?'adjustment_in':'adjustment_out',row.quantity-current.quantity,current.quantity,row.quantity,req.body.reason]);
  const duplicateBatch=await findDuplicateBatch(client,row.name,row.batch_number,row.id);
  return {row,duplicateBatch};
 });
 res.json({success:true,data:formatProduct(result.row),...(result.duplicateBatch?{duplicateBatch:result.duplicateBatch}:{})});
}
async function restockProduct(req,res){
 const hash=createHash('sha256').update(JSON.stringify({id:req.params.id,quantity:req.body.quantity,reason:req.body.reason})).digest('hex');
 const row=await db.transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`restock:${req.user.id}:${req.body.idempotencyKey}`]);
  const previous=(await client.query('SELECT request_hash FROM stock_movements WHERE user_id=$1 AND idempotency_key=$2',[req.user.id,req.body.idempotencyKey])).rows[0];
  if(previous){if(previous.request_hash!==hash)throw new AppError('CONFLICT',409);return (await client.query(`SELECT ${columns} FROM products WHERE id=$1`,[req.params.id])).rows[0];}
  const old=(await client.query('SELECT id,quantity,is_active,expiry_date>=CURRENT_DATE AS valid FROM products WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];if(!old)throw new AppError('NOT_FOUND',404);if(!old.is_active||!old.valid)throw new AppError('PRODUCT_UNAVAILABLE',409);
  if(old.quantity+req.body.quantity>2147483647)throw new AppError('VALIDATION',400,['quantity']);
  const row=(await client.query(`UPDATE products SET quantity=quantity+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING ${columns}`,[req.body.quantity,old.id])).rows[0];
  await client.query(`INSERT INTO stock_movements(product_id,user_id,movement_type,quantity_change,previous_quantity,new_quantity,notes,idempotency_key,request_hash) VALUES($1,$2,'purchase',$3,$4,$5,$6,$7,$8)`,[old.id,req.user.id,req.body.quantity,old.quantity,row.quantity,req.body.reason,req.body.idempotencyKey,hash]);return row;
 });res.json({success:true,data:formatProduct(row)});
}
async function deleteProduct(req,res){const row=(await db.query(`UPDATE products SET is_active=FALSE,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id`,[req.params.id])).rows[0];if(!row)throw new AppError('NOT_FOUND',404);res.json({success:true,message:'Product deactivated. Past records are kept.'});}
module.exports={getAllProducts,getProductById,getSummary,createProduct,updateProduct,restockProduct,deleteProduct,formatProduct,findDuplicateBatch};
