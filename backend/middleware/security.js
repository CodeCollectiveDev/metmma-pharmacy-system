const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const securityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet());
  console.log('Security headers applied via Helmet');

  // CORS - restrict in production, allow all in development
  const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',')
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(cors({
    origin: allowedOrigins,
    credentials: true,
  }));
  console.log('CORS enabled for:', allowedOrigins);

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
  console.log('Rate limiting applied');
};

module.exports = securityMiddleware;
