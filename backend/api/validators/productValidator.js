const { Joi,validate }=require('../../lib/validation');
const {money}=require('./salesValidator');
const fields={
 productCode:Joi.string().trim().pattern(/^[A-Z0-9-]+$/).min(3).max(50),name:Joi.string().trim().min(2).max(200),genericName:Joi.string().trim().max(200).allow('',null),batchNumber:Joi.string().trim().min(2).max(100),
 expiryDate:Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value,h)=>{const d=new Date(value+'T00:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value?value:h.error('any.invalid');}),
 quantity:Joi.number().integer().min(0).max(2147483647),unitPrice:money,sellingPrice:money,costPrice:money.allow(null),supplier:Joi.string().trim().min(2).max(200),category:Joi.string().trim().min(2).max(100),reorderLevel:Joi.number().integer().min(0).max(2147483647),location:Joi.string().trim().max(100).allow('',null),barcode:Joi.string().trim().max(100).allow('',null),isActive:Joi.boolean()
};
const createProductSchema=Joi.object({...fields,productCode:fields.productCode.required(),name:fields.name.required(),batchNumber:fields.batchNumber.required(),expiryDate:fields.expiryDate.required(),unitPrice:fields.unitPrice.required(),sellingPrice:fields.sellingPrice.required(),supplier:fields.supplier.required(),category:fields.category.required(),quantity:fields.quantity.default(0),reorderLevel:fields.reorderLevel.default(10)}).required();
const updateProductSchema=Joi.object({...fields,reason:Joi.string().trim().min(3).max(500).when('quantity',{is:Joi.exist(),then:Joi.required()}),expectedQuantity:Joi.number().integer().min(0).when('quantity',{is:Joi.exist(),then:Joi.required()})}).min(1).required();
module.exports={createProductSchema,updateProductSchema,validateProduct:validate};
