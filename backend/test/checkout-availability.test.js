const {test}=require('node:test');
const assert=require('node:assert/strict');
const {randomUUID}=require('node:crypto');
let products=[],writes=0;
const client={query:async(sql)=>{
 if(sql.startsWith('SELECT id,request_hash'))return{rows:[]};
 if(sql.includes('FROM products WHERE id=ANY'))return{rows:products};
 if(sql.startsWith('INSERT INTO sales')){writes++;return{rows:[{id:1}]};}
 if(sql.startsWith('SELECT s.*'))return{rows:[{id:1,receipt_number:'REC-test',total_amount:'11.65',subtotal_amount:'10.00',tax_amount:'1.65',payment_method:'cash'}]};
 if(sql.includes('FROM sale_items si'))return{rows:[{productId:1,name:'Medicine',quantity:1,unitPrice:'10.00',subtotal:'10.00'}]};
 return{rows:[]};
}};
require.cache[require.resolve('../api/db')]={exports:{transaction:work=>work(client)}};
const {processSale}=require('../api/controllers/salesController');
const request=()=>({requestId:'test-reference',user:{id:1},body:{idempotencyKey:randomUUID(),items:[{productId:1,quantity:1,unitPrice:'10.00',subtotal:'10.00'}],totalAmount:'11.65',paymentMethod:'cash'}});
test('valid current stock produces a receipt; unavailable stock identifies the exact cart line',async()=>{
 process.env.TAX_RATE_BPS='1650';writes=0;products=[{id:1,name:'Medicine',quantity:5,selling_price:'10.00',is_active:true,valid_expiry:true,expiry_date:'2030-01-01'}];let body;
 await processSale(request(),{status(){return this},json(value){body=value}});
 assert.equal(body.data.receiptNumber,'REC-test');assert.equal(writes,1);
 for(const [reason,rows] of [['expired',[{...products[0],valid_expiry:false,expiry_date:'2020-01-01'}]],['inactive',[{...products[0],is_active:false}]],['missing',[]],['missing_expiry',[{...products[0],valid_expiry:null,expiry_date:null}]]]){
  products=rows;
  await assert.rejects(processSale(request(),{}),e=>e.code==='PRODUCT_UNAVAILABLE'&&e.fields[0]==='items.0.productId'&&e.unavailableItems[0].reason===reason);
 }
 assert.equal(writes,1);
});
