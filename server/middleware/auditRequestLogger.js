const auditLog = require('../services/auditLog')

const SKIPPED_PATHS = new Set([
  '/api/health',
  '/api/setup-status',
])

const isSkippedRequest = (req) => {
  const path = String(req.originalUrl || req.url || '').split('?')[0]
  if (SKIPPED_PATHS.has(path)) return true
  if (path === '/api/audit/client') return true
  if (path.startsWith('/api/docs')) return true
  if (path.startsWith('/api/openapi')) return true
  return false
}

const getEntityTypeFromPath = (path = '') => {
  const [, apiSegment = 'api', entitySegment = 'api'] = String(path).split('/')
  return apiSegment === 'api' ? entitySegment || 'api' : 'api'
}

const getEntityIdFromPath = (path = '') => {
  const segments = String(path).split('/').filter(Boolean)
  return segments.length >= 3 ? segments[2] : null
}

const auditRequestLogger = (req, res, next) => {
  if (isSkippedRequest(req)) {
    next()
    return
  }

  const startedAt = Date.now()

  res.on('finish', () => {
    const path = String(req.originalUrl || req.url || '').split('?')[0]
    const method = String(req.method || '').toUpperCase()
    const statusCode = res.statusCode
    const actor = req.user || null
    const actorMode = actor ? auditLog.getActorMode(actor) : String(req.body?.role || '').toLowerCase() || null
    const action = `api.${method.toLowerCase()}`

    auditLog.recordRequest({
      actor,
      action,
      entityType: getEntityTypeFromPath(path),
      entityId: getEntityIdFromPath(path),
      method,
      path,
      statusCode,
      durationMs: Date.now() - startedAt,
      ipAddress: req.ip,
      requestId: req.id,
      source: 'backend',
      metadata: {
        actorMode,
        actorRole: actor?.role || req.body?.role || null,
        query: req.query,
        params: req.params,
        result: statusCode >= 400 ? 'failure' : 'success',
      },
    })
  })

  next()
}

module.exports = auditRequestLogger
