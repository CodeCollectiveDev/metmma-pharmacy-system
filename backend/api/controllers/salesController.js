const { createHash, randomUUID } = require('node:crypto');
const db = require('../db');
const { AppError } = require('../../lib/errors');
const { paging, dateFilter } = require('../../lib/validation');
const { minor, decimal, tax, taxRate } = require('../../lib/money');
const hash = body => createHash('sha256').update(JSON.stringify(body)).digest('hex');
async function saleData(client,id) {
  const sale = (await client.query(`SELECT s.*,u.username FROM sales s LEFT JOIN users u ON u.id=s.user_id WHERE s.id=$1`,[id])).rows[0];
  const items = (await client.query(`SELECT si.product_id AS "productId",si.product_name AS name,si.quantity,si.unit_price AS "unitPrice",si.subtotal,p.quantity AS "remainingStock" FROM sale_items si LEFT JOIN products p ON p.id=si.product_id WHERE si.sale_id=$1 ORDER BY si.id`,[id])).rows;
  return { id:sale.id,receiptNumber:sale.receipt_number,date:sale.created_at,subtotal:sale.subtotal_amount,tax:sale.tax_amount,totalAmount:sale.total_amount,paymentMethod:sale.payment_method,customerName:sale.customer_name,userId:sale.user_id,cashier:sale.username,status:sale.status,items };
}
async function processSale(req,res) {
  const body = req.body;
  const canonical = {items:[...body.items].sort((a,b)=>a.productId-b.productId).map(i=>({productId:i.productId,quantity:i.quantity,unitPrice:decimal(minor(i.unitPrice)),subtotal:decimal(minor(i.subtotal))})),totalAmount:decimal(minor(body.totalAmount)),paymentMethod:body.paymentMethod,customerName:body.customerName || null};
  const requestHash = hash(canonical);
  const result = await db.transaction(async client => {
    // Serializes retries before any insert or stock check. Hash collisions only serialize unrelated requests.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`checkout:${req.user.id}:${body.idempotencyKey}`]);
    const previous = (await client.query('SELECT id,request_hash FROM sales WHERE user_id=$1 AND idempotency_key=$2',[req.user.id,body.idempotencyKey])).rows[0];
    if (previous) { if (previous.request_hash !== requestHash) throw new AppError('CHECKOUT_KEY_CONFLICT',409); return { data:await saleData(client,previous.id),replayed:true }; }
    const ids = canonical.items.map(i=>i.productId);
    const locked = (await client.query(`SELECT id,name,quantity,selling_price,is_active,expiry_date>=CURRENT_DATE AS valid_expiry FROM products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE`,[ids])).rows;
    if (locked.length !== ids.length || locked.some(p=>!p.is_active || !p.valid_expiry)) throw new AppError('PRODUCT_UNAVAILABLE',409);
    let subtotal = 0n;
    for (const item of canonical.items) {
      const product = locked.find(p=>p.id===item.productId);
      if (product.quantity<item.quantity) throw new AppError('INSUFFICIENT_STOCK',409,[`items.${body.items.findIndex(i=>i.productId===item.productId)}.quantity`]);
      const line = minor(product.selling_price)*BigInt(item.quantity);
      if (minor(item.unitPrice)!==minor(product.selling_price) || minor(item.subtotal)!==line) throw new AppError('PRICE_CHANGED',409);
      subtotal += line;
    }
    const bps = taxRate(), taxes = tax(subtotal,bps), total = subtotal+taxes;
    if (total>999999999999n) throw new AppError('VALIDATION',400,['totalAmount']);
    if (minor(canonical.totalAmount)!==total) throw new AppError('PRICE_CHANGED',409);
    const receiptNumber=`REC-${randomUUID()}`;
    const sale = (await client.query(`INSERT INTO sales(receipt_number,total_amount,payment_method,customer_name,user_id,idempotency_key,request_hash,subtotal_amount,tax_amount,tax_rate_bps) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,[receiptNumber,decimal(total),body.paymentMethod,body.customerName || null,req.user.id,body.idempotencyKey,requestHash,decimal(subtotal),decimal(taxes),bps])).rows[0];
    // Bounded bulk writes, independent of cart size. All locks acquired in product ID order above.
    const quantities = canonical.items.map(i=>i.quantity), names = locked.map(p=>p.name), prices = locked.map(p=>p.selling_price), subtotals = canonical.items.map(i=>decimal(minor(locked.find(p=>p.id===i.productId).selling_price)*BigInt(i.quantity)));
    await client.query(`INSERT INTO sale_items(sale_id,product_id,quantity,unit_price,subtotal,product_name) SELECT $1,product_id,quantity,price,subtotal,name FROM UNNEST($2::int[],$3::int[],$4::numeric[],$5::numeric[],$6::text[]) AS x(product_id,quantity,price,subtotal,name)`,[sale.id,ids,quantities,prices,subtotals,names]);
    await client.query(`INSERT INTO stock_movements(product_id,user_id,movement_type,quantity_change,previous_quantity,new_quantity,notes) SELECT p.id,$1,'sale',-x.quantity,p.quantity,p.quantity-x.quantity,$2 FROM products p JOIN UNNEST($3::int[],$4::int[]) x(id,quantity) ON p.id=x.id`,[req.user.id,`Receipt: ${receiptNumber}`,ids,quantities]);
    await client.query(`UPDATE products p SET quantity=p.quantity-x.quantity,updated_at=CURRENT_TIMESTAMP FROM UNNEST($1::int[],$2::int[]) x(id,quantity) WHERE p.id=x.id AND p.quantity>=x.quantity`,[ids,quantities]);
    await client.query(`INSERT INTO financial_transactions(type,amount,payment_method,sale_id,created_by,transaction_date) SELECT 'income',total_amount,payment_method,id,user_id,created_at FROM sales WHERE id=$1`,[sale.id]);
    return { data:await saleData(client,sale.id),replayed:false };
  });
  res.status(result.replayed?200:201).json({success:true,saleId:result.data.id,receiptNumber:result.data.receiptNumber,...result});
}
async function getSaleHistory(req,res) {
  const query=req.validatedQuery, values=[], where=dateFilter(query,values,'s.created_at');
  if(req.user.role==='cashier'){values.push(req.user.id);where.push(`s.user_id=$${values.length}`);}
  if(query.search){values.push(`%${query.search}%`);where.push(`(s.receipt_number ILIKE $${values.length} OR s.customer_name ILIKE $${values.length})`);}
  const filter=where.length?`WHERE ${where.join(' AND ')}`:'';
  const count=(await db.query(`SELECT COUNT(*) FROM sales s ${filter}`,values)).rows[0].count;
  values.push(query.limit,(query.page-1)*query.limit);
  const result=await db.query(`WITH selected AS (SELECT s.*,u.username FROM sales s LEFT JOIN users u ON u.id=s.user_id ${filter} ORDER BY s.created_at DESC,s.id DESC LIMIT $${values.length-1} OFFSET $${values.length}) SELECT s.*,COALESCE(lines.items,'[]'::json) AS items FROM selected s LEFT JOIN LATERAL (SELECT json_agg(json_build_object('productId',si.product_id,'name',si.product_name,'quantity',si.quantity,'unitPrice',si.unit_price::text,'subtotal',si.subtotal::text) ORDER BY si.id) AS items FROM sale_items si WHERE si.sale_id=s.id) lines ON TRUE ORDER BY s.created_at DESC,s.id DESC`,values);
  res.json({success:true,data:result.rows.map(s=>({id:s.id,receiptNumber:s.receipt_number,date:s.created_at,totalAmount:s.total_amount,subtotal:s.subtotal_amount,tax:s.tax_amount,paymentMethod:s.payment_method || 'cash',customerName:s.customer_name,cashier:s.username,status:s.status,items:s.items})),pagination:paging(query,count,result.rowCount)});
}
async function reverseSale(req,res) {
  const result=await db.transaction(async client=>{
    const sale=(await client.query('SELECT * FROM sales WHERE id=$1 FOR UPDATE',[req.params.id])).rows[0];
    if(!sale)throw new AppError('NOT_FOUND',404);
    if(sale.status==='reversed')return sale; // A retry cannot restock or refund twice.
    const items=(await client.query('SELECT product_id,SUM(quantity)::int AS quantity FROM sale_items WHERE sale_id=$1 GROUP BY product_id ORDER BY product_id',[sale.id])).rows;
    await client.query('SELECT id FROM products WHERE id=ANY($1::int[]) ORDER BY id FOR UPDATE',[items.map(i=>i.product_id)]);
    await client.query(`INSERT INTO stock_movements(product_id,user_id,movement_type,quantity_change,previous_quantity,new_quantity,notes) SELECT p.id,$1,'return',x.quantity,p.quantity,p.quantity+x.quantity,$2 FROM products p JOIN UNNEST($3::int[],$4::int[]) x(id,quantity) ON p.id=x.id`,[req.user.id,`Reversal ${sale.receipt_number}: ${req.body.reason}`,items.map(i=>i.product_id),items.map(i=>i.quantity)]);
    await client.query(`UPDATE products p SET quantity=p.quantity+x.quantity,updated_at=CURRENT_TIMESTAMP FROM UNNEST($1::int[],$2::int[]) x(id,quantity) WHERE p.id=x.id`,[items.map(i=>i.product_id),items.map(i=>i.quantity)]);
    await client.query(`INSERT INTO financial_transactions(type,amount,payment_method,sale_id,created_by,note) VALUES('refund',-$1::numeric,$2,$3,$4,$5)`,[sale.total_amount,sale.payment_method || 'cash',sale.id,req.user.id,req.body.reason]);
    return (await client.query(`UPDATE sales SET status='reversed',reversed_at=CURRENT_TIMESTAMP,reversed_by=$2,reversal_reason=$3,reversal_kind=$4 WHERE id=$1 RETURNING id,status`,[sale.id,req.user.id,req.body.reason,req.body.kind])).rows[0];
  });
  res.json({success:true,data:result});
}
module.exports={processSale,getSaleHistory,reverseSale};
