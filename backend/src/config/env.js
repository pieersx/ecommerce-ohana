function requireEnv(name) {
  const value = process.env[name];

  if (!value || !value.trim()) {
    throw new Error(`Falta configurar la variable de entorno ${name}.`);
  }

  return value.trim();
}

function parseOrigins(value) {
  return value
    ? value.split(',').map((origin) => origin.trim()).filter(Boolean)
    : [];
}

function loadEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const frontendOrigins = parseOrigins(process.env.FRONTEND_URL);

  if (nodeEnv === 'production' && !frontendOrigins.length) {
    throw new Error('FRONTEND_URL es obligatorio en producción para configurar CORS.');
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    databaseUrl: requireEnv('DATABASE_URL'),
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    frontendOrigins,
    paymentProvider: process.env.PAYMENT_PROVIDER || 'external',
    paymentCheckoutBaseUrl: process.env.PAYMENT_CHECKOUT_BASE_URL || '',
  };
}

module.exports = loadEnv();
