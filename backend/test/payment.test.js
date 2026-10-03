const {test}=require('node:test');
const assert=require('node:assert/strict');
const {paymentAmounts}=require('../lib/payment');
test('cash change uses minor units and rejects insufficient tender',()=>{
 assert.deepEqual(paymentAmounts(1165n,'cash','20.00'),{received:2000n,change:835n});
 assert.deepEqual(paymentAmounts(30n,'cash','0.50'),{received:50n,change:20n});
 assert.throws(()=>paymentAmounts(1165n,'cash','10.00'),{code:'PAYMENT_AMOUNT'});
});
test('electronic payments require an exact amount and old requests remain compatible',()=>{
 for(const method of ['card','mobile_money','bank_transfer']){
  assert.deepEqual(paymentAmounts(1165n,method,'11.65'),{received:1165n,change:0n});
  assert.throws(()=>paymentAmounts(1165n,method,'20.00'),{code:'PAYMENT_AMOUNT'});
 }
 assert.deepEqual(paymentAmounts(1165n,'cash'),{received:1165n,change:0n});
});
