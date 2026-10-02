const { randomUUID } = require('node:crypto');
const messages = {
  VALIDATION: 'Please check the highlighted fields and try again.',
  SESSION_EXPIRED: 'Please sign in again to continue.',
  INVALID_CREDENTIALS: 'The username or password is incorrect.',
  PERMISSION_DENIED: 'Your account cannot do this. Please ask your administrator for help.',
  NOT_FOUND: 'This item is no longer available.',
  INSUFFICIENT_STOCK: 'There is not enough stock for this sale. Check the quantities and try again.',
  PRODUCT_UNAVAILABLE: 'An item is expired or no longer available.',
  PRICE_CHANGED: 'A price changed. Check the current prices and try again.',
  CONFLICT: 'This record changed or already exists. Refresh the list and try again.',
  CHECKOUT_KEY_CONFLICT: 'This checkout reference has already been used for a different cart.',
  RATE_LIMITED: 'Please wait a moment, then try again.',
  UNEXPECTED: 'We could not complete this action. Please try again.',
  UNAVAILABLE: 'The pharmacy system is temporarily unavailable. Please try again.'
};
class AppError extends Error {
  constructor(code, status = 400, fields = []) { super(messages[code] || messages.UNEXPECTED); this.code = code; this.status = status; this.fields = fields; }
}
const requestContext = (req, res, next) => {
  req.requestId = randomUUID(); res.setHeader('X-Request-ID', req.requestId);
  res.setHeader('Cache-Control', 'no-store');
  next();
};
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  let code = error instanceof AppError ? error.code : 'UNEXPECTED';
  let status = error instanceof AppError ? error.status : 500;
  if (error.type === 'entity.parse.failed') { code = 'VALIDATION'; status = 400; }
  if (['23505', '23503', '40001', '40P01'].includes(error.code)) { code = 'CONFLICT'; status = 409; }
  if (['23514','22003','22P02'].includes(error.code)) { code = 'VALIDATION'; status = 400; }
  if (error.type === 'entity.too.large') { code = 'VALIDATION'; status = 413; }
  const requestId = req.requestId || randomUUID();
  // Full details stay in the server log. Never log request bodies or credentials.
  if (status >= 500 || !(error instanceof AppError)) console.error(JSON.stringify({ requestId, path: req.path, error: error.message, stack: error.stack }));
  res.status(status).json({ success: false, code, message: messages[code], errors: (error.fields || []).map(field => ({ field, message: 'Please check this value.' })), requestId });
}
module.exports = { AppError, requestContext, errorHandler };
