const Joi = require('joi');
const { AppError } = require('./errors');
function fieldMessage(detail) {
  const limit = detail.context?.limit;
  if (['any.required', 'string.empty'].includes(detail.type)) return 'This field is required.';
  if (detail.type === 'string.min') return `Enter at least ${limit} characters.`;
  if (detail.type === 'string.max') return `Use no more than ${limit} characters.`;
  if (detail.type === 'string.email') return 'Enter a valid email address, such as name@example.com.';
  if (detail.type === 'number.integer') return 'Enter a whole number.';
  if (detail.type === 'number.min') return `Enter ${limit} or more.`;
  if (detail.type === 'number.max') return `Enter ${limit} or less.`;
  if (detail.type === 'number.positive') return 'Enter an amount greater than zero.';
  if (detail.type === 'number.precision') return 'Use no more than two decimal places.';
  if (detail.type === 'number.base') return 'Enter a number.';
  if (detail.type.startsWith('date.')) return 'Choose a valid date no later than today.';
  if (detail.path[0] === 'productCode') return 'Use 3–50 letters, numbers or hyphens.';
  if (detail.path[0] === 'phone') return 'Use 10–15 characters: digits, spaces, + or -.';
  if (detail.type === 'any.only') return 'Choose an option from the list.';
  return 'Check this value and try again.';
}
const validate = (schema, prop = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[prop], { abortEarly: false });
  if (error) {
    const failure = new AppError('VALIDATION', 400, error.details.map(d => d.path.join('.')));
    failure.fieldDetails = error.details.map(d => ({ field: d.path.join('.'), message: fieldMessage(d) }));
    return next(failure);
  }
  // Express 5 exposes query as a getter; validated query lives separately.
  if (prop === 'query') req.validatedQuery = value;
  else req[prop] = value;
  next();
};
const idParam = Joi.object({ id: Joi.number().integer().positive().max(2147483647).required() });
const pageFields = { page: Joi.number().integer().min(1).max(1000000).default(1), limit: Joi.number().integer().min(1).max(100).default(25) };
const dateFields = { start: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/), end: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/) };
const pageQuery = Joi.object(pageFields);
function paging(query, total, count) { const { page, limit } = query; return { page, limit, total: Number(total), totalPages: Math.ceil(Number(total) / limit), hasMore: (page - 1) * limit + count < Number(total) }; }
function dateFilter(query, values, column) {
  const pieces = [];
  for (const name of ['start','end']) {
    if (!query[name]) continue;
    const date = new Date(`${query[name]}T00:00:00Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0,10) !== query[name]) throw new AppError('VALIDATION',400,[name]);
  }
  if (query.start && query.end && query.start > query.end) throw new AppError('VALIDATION',400,['end']);
  if (query.start) { values.push(query.start); pieces.push(`${column} >= $${values.length}::date`); }
  if (query.end) { values.push(query.end); pieces.push(`${column} < $${values.length}::date + INTERVAL '1 day'`); }
  return pieces;
}
module.exports = { Joi, validate, idParam, pageFields, dateFields, pageQuery, paging, dateFilter };
