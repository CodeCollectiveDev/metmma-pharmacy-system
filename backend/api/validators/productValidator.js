const Joi = require('joi');

const createProductSchema = Joi.object({
  productCode: Joi.string().pattern(/^[A-Z0-9-]+$/).min(3).max(50).optional().allow('', null),
  name: Joi.string().min(2).max(200).required(),
  genericName: Joi.string().min(2).max(200).optional().allow('', null),
  batchNumber: Joi.string().min(2).max(100).optional().allow('', null),
  expiryDate: Joi.date().greater('now').optional().allow(null, ''),
  quantity: Joi.number().integer().min(0).default(0),
  unitPrice: Joi.number().precision(2).min(0).required(),
  sellingPrice: Joi.number().precision(2).min(0).required(),
  costPrice: Joi.number().precision(2).min(0).optional().allow(null),
  supplier: Joi.string().min(2).max(200).optional().allow('', null),
  category: Joi.string().min(2).max(100).required(),
  reorderLevel: Joi.number().integer().min(0).default(10),
  location: Joi.string().max(100).optional().allow('', null),
  barcode: Joi.string().max(100).optional().allow('', null),
  isActive: Joi.boolean().default(true)
});

// FIXED: Added .keys({ reason: ... }) so Joi doesn't strip it
const updateProductSchema = createProductSchema.fork(
  Object.keys(createProductSchema.describe().keys), 
  (schema) => schema.optional()
).keys({
  reason: Joi.string().when('quantity', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  })
}).min(1);

const expiringProductsQuerySchema = Joi.object({
  days: Joi.number().integer().positive().default(90)
});

const validateProduct = (schema) => {
  return (req, res, next) => {
    // stripUnknown: true will now keep 'reason' because it's in the schema
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message.replace(/"/g, "'") }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    req.body = value;
    next();
  };
};

const validateExpiringProductsQuery = (req, res, next) => {
  const { error, value } = expiringProductsQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(d => ({ field: d.path.join('.'), message: d.message.replace(/"/g, "'") }));
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  req.validatedExpiringProductsQuery = value;
  next();
};

module.exports = {
  createProductSchema,
  updateProductSchema,
  expiringProductsQuerySchema,
  validateProduct,
  validateExpiringProductsQuery
};
