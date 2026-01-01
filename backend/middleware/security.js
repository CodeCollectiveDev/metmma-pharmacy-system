const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');

const securityMiddleware = (app) => {
  // Helmet for security headers
  app.use(helmet());
  console.log('Security headers applied via Helmet');

  // CORS
  app.use(cors());
  console.log('CORS enabled');

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
  });
  app.use(limiter);
  console.log('Rate limiting applied');
};

module.exports = securityMiddleware;