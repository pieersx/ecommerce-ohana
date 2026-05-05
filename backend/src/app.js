const cors = require('cors');
const express = require('express');

const prisma = require('./config/prisma');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const authRoutes = require('./routes/auth.routes');
const catalogRoutes = require('./routes/catalog.routes');
const ordersRoutes = require('./routes/orders.routes');
const productsRoutes = require('./routes/products.routes');
const usersRoutes = require('./routes/users.routes');
const asyncHandler = require('./utils/asyncHandler');

const app = express();

const corsOrigin = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get('/api/health', asyncHandler(async (_req, res) => {
  const result = await prisma.$queryRawUnsafe('SELECT NOW() AS current_time');

  res.json({
    status: 'ok',
    database: 'connected',
    current_time: result[0].current_time,
  });
}));

app.use('/api/auth', authRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/orders', ordersRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
