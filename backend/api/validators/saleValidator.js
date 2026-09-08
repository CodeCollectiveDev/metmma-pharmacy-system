const Joi = require('joi');

const PAYMENT_METHODS = ['cash', 'card', 'mobile_money'];
const SALE_STATUSES = ['completed', 'cancelled', 'refunded'];
const SORT_FIELDS = {
  createdAt: 's.created_at',
  totalAmount: 's.total_amount',
  receiptNumber: 's.receipt_number',
  status: 's.status',
  paymentMethod: 's.payment_method'
};

const saleHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().trim().max(100).allow('', null).empty(''),
  cashierId: Joi.number().integer().positive().allow(null).empty(''),
  paymentMethod: Joi.string()
    .trim()
    .lowercase()
    .valid(...PAYMENT_METHODS)
    .allow('', null)
    .empty(''),
  status: Joi.string()
    .trim()
    .lowercase()
    .valid(...SALE_STATUSES)
    .allow('', null)
    .empty(''),
  startDate: Joi.date().iso().allow(null).empty(''),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).allow(null).empty(''),
  sortBy: Joi.string()
    .valid(...Object.keys(SORT_FIELDS))
    .default('createdAt'),
  sortOrder: Joi.string().uppercase().valid('ASC', 'DESC').default('DESC')
});

const saleIdParamSchema = Joi.object({
  id: Joi.number().integer().positive().required()
});

const validateSaleHistoryQuery = (req, res, next) => {
  const { error, value } = saleHistoryQuerySchema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  });

  if (error) {
    const errors = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message.replace(/"/g, "'")
    }));
    return res.status(400).json({
      success: false,
      message: 'Invalid query parameters',
      errors
    });
  }

  req.query = value;
  next();
};

const validateSaleIdParam = (req, res, next) => {
  const { error, value } = saleIdParamSchema.validate(req.params, {
    abortEarly: false,
    convert: true
  });

  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid sale ID'
    });
  }

  req.params = value;
  next();
};

module.exports = {
  PAYMENT_METHODS,
  SALE_STATUSES,
  SORT_FIELDS,
  validateSaleHistoryQuery,
  validateSaleIdParam
};
