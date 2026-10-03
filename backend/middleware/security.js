const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { AppError } = require('../lib/errors');
module.exports = app => {
  app.use(helmet());
  const origins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173').split(',').map(s => s.trim());
  app.use(cors({ origin: origins, exposedHeaders: ['X-Request-ID'] }));
  app.use(rateLimit({ windowMs: 15 * 60000, limit: 1500, standardHeaders: 'draft-8', legacyHeaders: false, handler: (req,res,next) => next(new AppError('RATE_LIMITED',429)) }));
};
