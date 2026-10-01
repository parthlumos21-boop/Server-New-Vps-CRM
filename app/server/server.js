const express = require('express')
const http = require('http')
const fs = require('fs')
const path = require('path')
const cors = require('cors')
const bodyParser = require('body-parser')
const { env } = require('./config/env')
const { connectDatabase } = require('./config/db')
const { createSocketServer } = require('./socket/socketServer')
const logger = require('./utils/logger')
const { normalizeRequestBody } = require('./utils/requestPayload')
const requestLogger = require('./middleware/requestLogger')
const authRoutes = require('./routes/authRoutes')
const leadRoutes = require('./routes/leadRoutes')
const notificationRoutes = require('./routes/notificationRoutes')
const userRoutes = require('./routes/userRoutes')
const messageRoutes = require('./routes/messageRoutes')
const dealRoutes = require('./routes/dealRoutes')
const convertedDealRoutes = require('./routes/convertedDealRoutes')
const taskRoutes = require('./routes/taskRoutes')
const reminderRoutes = require('./routes/reminderRoutes')
const quotationRoutes = require('./routes/quotationRoutes')
const customerRoutes = require('./routes/customerRoutes')
const supportRequestRoutes = require('./routes/supportRequestRoutes')
const bookmarkRoutes = require('./routes/bookmarkRoutes')
const calendarRoutes = require('./routes/calendarRoutes')
const dashboardRoutes = require('./routes/dashboardRoutes')
const customViewRoutes = require('./routes/customViewRoutes')
const settingsRoutes = require('./routes/settingsRoutes')
const integrationRoutes = require('./routes/integrationRoutes')
const searchRoutes = require('./routes/searchRoutes')
const attachmentRoutes = require('./routes/attachmentRoutes')
const remarkRoutes = require('./routes/remarkRoutes')
const projectRoutes = require('./routes/projectRoutes')
const userTypeRoutes = require('./routes/userTypeRoutes')
const jobPlanningRoutes = require('./routes/jobPlanningRoutes')
const productRoutes = require('./routes/productRoutes')
const openapiSpec = require('./docs/openapi')
const jobQueue = require('./services/jobQueue')
const emailService = require('./services/emailService')
const { requireBackendReady } = require('./middleware/backendReady')
const { ensureDatabaseSetup, getPublicSetupStatus, isBackendReady } = require('./services/runtimeSetupService')
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler')
const { requireAuth } = require('./middleware/authMiddleware')
const { requireAdmin } = require('./middleware/roleMiddleware')
const ovrcRoutes = require('./routes/ovrcRoutes')


const tryRequire = (moduleName) => {
  try { return require(moduleName) } catch (_) { return null }
}

const app = express()
const server = http.createServer(app)
const clientDistPath = path.resolve(__dirname, '..', 'dist')
const clientIndexPath = path.join(clientDistPath, 'index.html')

app.set('trust proxy', 1)
app.disable('x-powered-by')

const defaultOrigins = [
  env.clientUrl,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]
const allowedOrigins = Array.from(new Set([
  ...defaultOrigins,
  ...env.corsOrigins,
].filter(Boolean)))

const helmet = tryRequire('helmet')
if (helmet) {
  app.use(helmet({ contentSecurityPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }))
}

app.use(requestLogger)

app.use('/api', (_req, res, next) => {
  res.set('Cache-Control', 'no-store')
  next()
})

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}))

const cookieParser = tryRequire('cookie-parser')
if (cookieParser) {
  app.use(cookieParser())
}

app.use(bodyParser.json({ limit: '2mb' }))
app.use(bodyParser.urlencoded({ extended: true, limit: '2mb' }))
app.use(normalizeRequestBody)

const rateLimit = tryRequire('express-rate-limit')
if (rateLimit) {
  const isIntegrationProbe = (req) => {
    if (req.method !== 'GET') return false

    return [
      req.path,
      req.originalUrl,
    ].some((requestPath) => (
      requestPath === '/integrations/status'
      || requestPath === '/integrations/downloads'
      || requestPath === '/api/integrations/status'
      || requestPath === '/api/integrations/downloads'
    ))
  }

  const generalLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isIntegrationProbe,
  })
  const authLimiter = rateLimit({
    windowMs: env.rateLimitWindowMs,
    max: env.authRateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  })
  app.use('/api/auth/login', authLimiter)
  app.use('/api/', generalLimiter)
}

const swaggerUi = tryRequire('swagger-ui-express')
if (swaggerUi) {
  app.use('/api/docs', requireAuth, requireAdmin, swaggerUi.serve, swaggerUi.setup(openapiSpec))
  app.get('/api/openapi.json', requireAuth, requireAdmin, (_req, res) => res.json(openapiSpec))
}

jobQueue.registerHandler('email:send', async (payload) => {
  await emailService.sendEmail(payload)
})

const socketServer = createSocketServer(server)

server.keepAliveTimeout = env.keepAliveTimeoutMs
server.headersTimeout = env.headersTimeoutMs
server.requestTimeout = env.requestTimeoutMs

app.get('/', (_req, res) => res.redirect('/api/health'))
app.get('/favicon.ico', (_req, res) => res.status(204).end())
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.status(204).end())

app.get('/api/health', async (_req, res, next) => {
  try {
    if (!isBackendReady()) {
      await ensureDatabaseSetup()
    }

    if (!isBackendReady()) {
      res.json({
        success: true,
        status: 'degraded',
        timestamp: new Date().toISOString(),
        onlineUsers: await socketServer.getOnlineUsersCount(),
        activities: socketServer.getActivities().length,
        jobs: jobQueue.getQueueStatus(),
        emailConfigured: emailService.isConfigured(),
        setup: getPublicSetupStatus(),
      })
      return
    }

    const connection = await connectDatabase()
    await connection.db.admin().ping()
    const onlineUsers = await socketServer.getOnlineUsersCount()

    res.json({
      success: true,
      status: 'ok',
      timestamp: new Date().toISOString(),
      onlineUsers,
      activities: socketServer.getActivities().length,
      jobs: jobQueue.getQueueStatus(),
      emailConfigured: emailService.isConfigured(),
      setup: getPublicSetupStatus(),
    })
  } catch (error) {
    next(error)
  }
})

app.get('/api/setup-status', async (_req, res) => {
  if (!isBackendReady()) {
    await ensureDatabaseSetup()
  }

  let loginBrandGlowColor = null
  if (isBackendReady()) {
    try {
      const { getMongoModel } = require('./models/mongoModels')
      const AppSettings = getMongoModel('app_settings')
      const setting = await AppSettings.findOne({ scope: 'global', key: 'loginBrandGlowColor' }).lean()
      if (setting && setting.value) {
        loginBrandGlowColor = setting.value
      }
    } catch (err) {
      // Ignore errors when fetching settings
    }
  }

  res.json({
    success: true,
    data: {
      ...getPublicSetupStatus(),
      loginBrandGlowColor,
    },
  })
})

app.get('/api/activities', requireAuth, (req, res) => {
  res.json({
    success: true,
    data: socketServer.getActivities(req.user),
  })
})

app.use('/api/auth', requireBackendReady, authRoutes)
app.use('/api/leads', requireBackendReady, leadRoutes)
app.use('/api/notifications', requireBackendReady, notificationRoutes)
app.use('/api/users', requireBackendReady, userRoutes)
app.use('/api/messages', requireBackendReady, messageRoutes)
app.use('/api/deals', requireBackendReady, dealRoutes)
app.use('/api/converted-deals', requireBackendReady, convertedDealRoutes)
app.use('/api/tasks', requireBackendReady, taskRoutes)
app.use('/api/reminders', requireBackendReady, reminderRoutes)
app.use('/api/quotations', requireBackendReady, quotationRoutes)
app.use('/api/customers', requireBackendReady, customerRoutes)
app.use('/api/support-requests', requireBackendReady, supportRequestRoutes)
app.use('/api/bookmarks', requireBackendReady, bookmarkRoutes)
app.use('/api/calendar', requireBackendReady, calendarRoutes)
app.use('/api/dashboard', requireBackendReady, dashboardRoutes)
app.use('/api/custom-views', requireBackendReady, customViewRoutes)
app.use('/api/settings', requireBackendReady, settingsRoutes)
app.use('/api/integrations', requireBackendReady, integrationRoutes)
app.use('/api/search', requireBackendReady, searchRoutes)
app.use('/api/attachments', requireBackendReady, attachmentRoutes)
app.use('/api/projects', requireBackendReady, projectRoutes)
app.use('/api/user-types', requireBackendReady, userTypeRoutes)
app.use('/api/job-plannings', requireBackendReady, jobPlanningRoutes)
app.use('/api/products', requireBackendReady, productRoutes)
app.use('/api/ovrc', requireBackendReady, requireAuth, ovrcRoutes)
app.use('/api', requireBackendReady, remarkRoutes)

app.use(express.static(clientDistPath))
app.get(/^\/(?!api(?:\/|$)).*/, (req, res, next) => {
  if (fs.existsSync(clientIndexPath)) {
    res.sendFile(clientIndexPath, (error) => {
      if (error) next(error)
    })
    return
  }

  const redirectUrl = new URL(req.originalUrl, env.clientUrl)
  res.redirect(302, redirectUrl.toString())
})

app.use(notFoundHandler)
app.use(errorHandler)

server.on('error', (error) => {
  if (error && error.code === 'EADDRINUSE') {
    logger.error(
      { port: env.port },
      `Port ${env.port} is already in use. Stop the existing backend process and start the server again.`
    )
    process.exit(1)
    return
  }

  logger.error({ err: error }, 'Server failed to start')
  process.exit(1)
})

server.listen(env.port, () => {
  logger.info({ port: env.port }, 'Server running')
  logger.info('Socket.IO ready for connections')

  ensureDatabaseSetup().then((ready) => {
    if (!ready) {
      logger.warn('Backend is running in setup mode until MongoDB becomes available.')
    }
  })
})
