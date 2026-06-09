const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')

const env = require('./config/env')
const prisma = require('./config/prisma')
const { errorHandler, notFound } = require('./middleware/errorHandler')
const { apiRateLimiter, authRateLimiter } = require('./middleware/rateLimiters')
const authRoutes = require('./routes/auth.routes')
const catalogRoutes = require('./routes/catalog.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const ordersRoutes = require('./routes/orders.routes')
const paymentsRoutes = require('./routes/payments.routes')
const productsRoutes = require('./routes/products.routes')
const usersRoutes = require('./routes/users.routes')
const asyncHandler = require('./utils/asyncHandler')

const app = express()

const corsOrigin = env.frontendOrigins.length ? env.frontendOrigins : true

app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: corsOrigin }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '100kb' }))
app.use('/api', apiRateLimiter)

app.get(
  '/api/health',
  asyncHandler(async (_req, res) => {
    const result = await prisma.$queryRawUnsafe('SELECT NOW() AS current_time')

    res.json({
      status: 'ok',
      database: 'connected',
      current_time: result[0].current_time,
    })
  })
)

app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/payments', paymentsRoutes)

app.use(notFound)
app.use(errorHandler)

module.exports = app
