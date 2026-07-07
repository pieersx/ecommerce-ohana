const path = require('path')
const cors = require('cors')
const express = require('express')
const helmet = require('helmet')
const morgan = require('morgan')

const env = require('./config/env')
const prisma = require('./config/prisma')
const { errorHandler, notFound } = require('./middleware/errorHandler')
const { apiRateLimiter, authRateLimiter } = require('./middleware/rateLimiters')
const adminRoutes = require('./routes/admin.routes')
const authRoutes = require('./routes/auth.routes')
const catalogRoutes = require('./routes/catalog.routes')
const dashboardRoutes = require('./routes/dashboard.routes')
const ordersRoutes = require('./routes/orders.routes')
const paymentsRoutes = require('./routes/payments.routes')
const productsRoutes = require('./routes/products.routes')
const uploadRoutes = require('./routes/upload.routes')
const usersRoutes = require('./routes/users.routes')
const asyncHandler = require('./utils/asyncHandler')

const app = express()

// Con SERVE_FRONTEND el frontend es mismo origen: no hace falta abrir CORS.
const corsOrigin = env.frontendOrigins.length
  ? env.frontendOrigins
  : (env.serveFrontend ? false : true)

app.set('trust proxy', 1)
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      // Imagenes de productos: S3 (uploads), URLs externas https y previews blob:.
      'img-src': ["'self'", 'data:', 'blob:', 'https:'],
    },
  },
}))
app.use(cors({ origin: corsOrigin }))
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'))
app.use(express.json({ limit: '100kb' }))
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')))
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

app.use('/api/admin', adminRoutes)
app.use('/api/auth', authRateLimiter, authRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/payments', paymentsRoutes)
app.use('/api/upload', uploadRoutes)

const frontendDist = process.env.FRONTEND_DIST_DIR
  ? path.resolve(process.env.FRONTEND_DIST_DIR)
  : path.join(__dirname, '..', '..', 'frontend', 'dist')

if (env.serveFrontend) {
  app.use(express.static(frontendDist))
  app.get(/^\/(?!api\/|uploads\/).*/, (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'))
  })
}

app.use(notFound)
app.use(errorHandler)

module.exports = app
