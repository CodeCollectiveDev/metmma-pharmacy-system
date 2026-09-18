const Joi = require('joi');

const money = Joi.number().min(0).max(9999999999.99).precision(2);
const saleSchema = Joi.object({
  items: Joi.array().items(Joi.object({
    productId: Joi.number().integer().positive().required(),
    quantity: Joi.number().integer().positive().required(),
    unitPrice: money.required(),
    subtotal: money.required()
  })).min(1).required(),
  totalAmount: money.required(),
  paymentMethod: Joi.string().trim().min(1).max(20).default('cash'),
  customerName: Joi.string().trim().max(100).allow('', null)
}).required();

const validateSale = (req, res, next) => {
  const { error, value } = saleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({ field: detail.path.join('.'), message: detail.message }))
    });
  }
  req.body = value;
  next();
};

module.exports = { saleSchema, validateSale };
