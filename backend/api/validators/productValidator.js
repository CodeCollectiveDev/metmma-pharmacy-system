const { Joi,validate }=require('../../lib/validation');
const {money}=require('./salesValidator');
const {randomUUID}=require('node:crypto');
const normalizeExpiryDate=(value)=>{
 if(typeof value!=='string') return value;
 const trimmed=value.trim();
 if(!trimmed) return value;
 const iso=/^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
 if(iso){const d=new Date(`${trimmed}T00:00:00Z`); if(Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===trimmed) return trimmed;}
 const locale=/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(trimmed);
 if(locale){const yyyy=locale[3],mm=String(locale[2]).padStart(2,'0'),dd=String(locale[1]).padStart(2,'0'); const normalized=`${yyyy}-${mm}-${dd}`; const d=new Date(`${normalized}T00:00:00Z`); if(Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===normalized) return normalized;}
 return null;
};
const fields={
 productCode:Joi.string().trim().uppercase().pattern(/^[A-Z0-9-]+$/).min(3).max(50),name:Joi.string().trim().min(2).max(200),genericName:Joi.string().trim().max(200).allow('',null), batchNumber:Joi.string().trim().uppercase().min(2).max(100),
 expiryDate:Joi.string().trim().custom((value,h)=>{const normalized=normalizeExpiryDate(value); return normalized===null?h.error('any.invalid'):normalized;}),
 quantity:Joi.number().integer().min(0).max(2147483647),unitPrice:money,sellingPrice:money,costPrice:money.allow(null),supplier:Joi.string().trim().min(2).max(200).allow('',null),category:Joi.string().trim().min(2).max(100),reorderLevel:Joi.number().integer().min(0).max(2147483647),location:Joi.string().trim().max(100).allow('',null),barcode:Joi.string().trim().max(100).allow('',null),isActive:Joi.boolean()
};
const createProductSchema=Joi.object({...fields,productCode:fields.productCode.empty('').default(() => `P-${randomUUID().replaceAll('-','').slice(0,12).toUpperCase()}`),name:fields.name.required(),batchNumber:fields.batchNumber.required(),expiryDate:fields.expiryDate.required(),unitPrice:fields.unitPrice.required(),sellingPrice:fields.sellingPrice.required(),supplier:fields.supplier.default(''),category:fields.category.empty('').default('Other'),quantity:fields.quantity.default(0),reorderLevel:fields.reorderLevel.default(10)}).required();
const updateProductSchema=Joi.object({...fields,reason:Joi.string().trim().min(3).max(500).when('quantity',{is:Joi.exist(),then:Joi.required()}),expectedQuantity:Joi.number().integer().min(0).when('quantity',{is:Joi.exist(),then:Joi.required()})}).min(1).required();
module.exports={createProductSchema,updateProductSchema,validateProduct:validate};
