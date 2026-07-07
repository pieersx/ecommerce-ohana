const rateLimit = require('express-rate-limit');

const env = require('../config/env');

const skipInTests = () => env.nodeEnv === 'test';

const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Demasiados intentos. Intenta nuevamente en unos minutos.' },
});

const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests,
  message: { message: 'Demasiadas solicitudes. Intenta nuevamente en unos minutos.' },
});

module.exports = {
  apiRateLimiter,
  authRateLimiter,
};
