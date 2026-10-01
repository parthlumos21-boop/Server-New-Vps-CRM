require('./loadEnv')

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

const parseDurationMs = (value, fallback) => {
  const rawValue = String(value || '').trim()
  if (!rawValue) return fallback

  const match = rawValue.match(/^(\d+)(ms|s|m|h|d)?$/i)
  if (!match) return fallback

  const amount = Number.parseInt(match[1], 10)
  const unit = String(match[2] || 'ms').toLowerCase()
  const unitMs = {
    ms: 1,
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  }[unit]

  return amount * unitMs
}

const DEV_JWT_FALLBACK = 'dev-only-insecure-jwt-secret-change-me'
const DEV_JWT_REFRESH_FALLBACK = 'dev-only-insecure-refresh-secret-change-me'

const resolveJwtSecret = () => {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production.')
  }
  return DEV_JWT_FALLBACK
}

const resolveJwtRefreshSecret = () => {
  if (process.env.JWT_REFRESH_SECRET) return process.env.JWT_REFRESH_SECRET
  if ((process.env.NODE_ENV || 'development') === 'production') {
    throw new Error('JWT_REFRESH_SECRET environment variable is required in production.')
  }
  return DEV_JWT_REFRESH_FALLBACK
}

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGINS || ''
  return raw.split(',').map((value) => value.trim()).filter(Boolean)
}

const resolveMongoConfig = () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/crm'
  const fallbackDbName = (() => {
    try {
      const parsedUrl = new URL(uri)
      return parsedUrl.pathname.replace(/^\/+/, '') || 'crm'
    } catch (_error) {
      return 'crm'
    }
  })()

  return {
    uri,
    dbName: process.env.MONGODB_DB || process.env.MONGO_DB || fallbackDbName,
    maxPoolSize: parseInteger(process.env.MONGO_POOL_MAX, 30),
    serverSelectionTimeoutMS: parseInteger(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS, 5000),
  }
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInteger(process.env.PORT, 5000),
  databaseUrl: process.env.MONGODB_URI || process.env.MONGO_URI || process.env.DATABASE_URL || '',
  mongo: resolveMongoConfig(),
  jwtSecret: resolveJwtSecret(),
  jwtRefreshSecret: resolveJwtRefreshSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  jwtCookieMaxAgeMs: parseDurationMs(process.env.JWT_EXPIRES_IN || '15m', 15 * 60 * 1000),
  refreshTokenExpiresDays: parseInteger(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 7),
  rememberMeRefreshTokenExpiresDays: parseInteger(process.env.REMEMBER_ME_REFRESH_TOKEN_EXPIRES_DAYS, 30),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  bcryptRounds: parseInteger(process.env.BCRYPT_ROUNDS, 10),
  corsOrigins: parseCorsOrigins(),
  rateLimitMax: parseInteger(process.env.RATE_LIMIT_MAX, 1200),
  rateLimitWindowMs: parseInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  authRateLimitMax: parseInteger(process.env.AUTH_RATE_LIMIT_MAX, 80),
  requestTimeoutMs: parseInteger(process.env.REQUEST_TIMEOUT_MS, 120000),
  keepAliveTimeoutMs: parseInteger(process.env.KEEP_ALIVE_TIMEOUT_MS, 65000),
  headersTimeoutMs: parseInteger(process.env.HEADERS_TIMEOUT_MS, 70000),
}

module.exports = {
  env,
}
