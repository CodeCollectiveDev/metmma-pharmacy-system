const Joi = require('joi');

/**
 * Joi Validation Middleware
 * Usage: validate(schema, 'body'|'params'|'query')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map((d) => ({ message: d.message, path: d.path }))
      });
    }
    req[property] = value;
    next();
  };
}

module.exports = validate;
