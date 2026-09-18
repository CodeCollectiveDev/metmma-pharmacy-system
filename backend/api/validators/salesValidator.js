const Joi = require('joi');

const MAX_MONEY = 9999999999.99;
const MAX_MONEY_CENTS = 999999999999n;
const money = Joi.number().min(0).max(MAX_MONEY).precision(2);
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

const toCents = value => BigInt(Math.round(value * 100));
const fromCents = value => Number(value) / 100;

const verifySaleArithmetic = (sale) => {
  let merchandiseTotalCents = 0n;
  const items = [];

  for (const [index, item] of sale.items.entries()) {
    const unitPriceCents = toCents(item.unitPrice);
    const subtotalCents = unitPriceCents * BigInt(item.quantity);

    if (subtotalCents > MAX_MONEY_CENTS) {
      return { error: { field: `items.${index}.subtotal`, message: 'Line subtotal exceeds the supported monetary limit' } };
    }
    if (toCents(item.subtotal) !== subtotalCents) {
      return { error: { field: `items.${index}.subtotal`, message: 'Subtotal must equal quantity multiplied by unitPrice' } };
    }

    merchandiseTotalCents += subtotalCents;
    items.push({ ...item, unitPrice: fromCents(unitPriceCents), subtotal: fromCents(subtotalCents) });
  }

  const totalAmountCents = toCents(sale.totalAmount);
  if (merchandiseTotalCents > MAX_MONEY_CENTS || totalAmountCents < merchandiseTotalCents) {
    return { error: { field: 'totalAmount', message: 'Total amount cannot be less than the calculated merchandise subtotal' } };
  }

  return {
    value: { ...sale, items, totalAmount: fromCents(totalAmountCents) },
    merchandiseSubtotal: fromCents(merchandiseTotalCents)
  };
};

const validateSale = (req, res, next) => {
  const { error, value } = saleSchema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details.map(detail => ({ field: detail.path.join('.'), message: detail.message }))
    });
  }

  const arithmetic = verifySaleArithmetic(value);
  if (arithmetic.error) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: [arithmetic.error]
    });
  }

  req.body = arithmetic.value;
  next();
};

module.exports = { saleSchema, verifySaleArithmetic, validateSale };
