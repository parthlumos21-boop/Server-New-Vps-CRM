const logger = require('../utils/logger')
const tryRequire = (name) => { try { return require(name) } catch (_) { return null } }
const pinoHttp = tryRequire('pino-http')

const fallbackLogger = (req, _res, next) => {
  req.id = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  req.log = logger
  next()
}

module.exports = pinoHttp
  ? pinoHttp({
      logger,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error'
        if (res.statusCode >= 400) return 'warn'
        return 'info'
      },
      genReqId: (req) => req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    })
  : fallbackLogger
