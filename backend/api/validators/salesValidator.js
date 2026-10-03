const { Joi, validate } = require('../../lib/validation');
const money = Joi.alternatives().try(Joi.string().pattern(/^\d{1,10}(\.\d{1,2})?$/),Joi.number().min(0).max(9999999999.99).custom((value,helpers)=>Math.abs(value*100-Math.round(value*100))<1e-5 ? value : helpers.error('any.invalid')));
const saleSchema = Joi.object({
  idempotencyKey: Joi.string().guid({version:'uuidv4'}).required(),
  items: Joi.array().items(Joi.object({ productId:Joi.number().integer().positive().max(2147483647).required(),quantity:Joi.number().integer().min(1).max(1000000).required(),unitPrice:money.required(),subtotal:money.required() })).min(1).max(100).unique('productId').required(),
  totalAmount:money.required(),amountReceived:money,paymentMethod:Joi.string().valid('cash','card','mobile_money','bank_transfer').default('cash'),customerName:Joi.string().trim().max(100).allow('',null),userId:Joi.number().integer().positive().allow(null)
}).required();
module.exports = { saleSchema, validateSale:validate(saleSchema), money };
