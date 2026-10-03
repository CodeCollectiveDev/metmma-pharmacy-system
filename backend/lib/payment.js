const {minor}=require('./money');
const {AppError}=require('./errors');
function paymentAmounts(total,paymentMethod,amountReceived){
 const received=amountReceived===undefined?total:minor(amountReceived);
 if(received<total || (paymentMethod!=='cash' && received!==total))throw new AppError('PAYMENT_AMOUNT',400,['amountReceived']);
 return {received,change:received-total};
}
module.exports={paymentAmounts};
