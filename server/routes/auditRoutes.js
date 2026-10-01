const express = require('express')
const auditLog = require('../services/auditLog')
const { requireAuth } = require('../middleware/authMiddleware')

const router = express.Router()

router.use(requireAuth)

router.post('/client', async (req, res) => {
  const eventType = String(req.body?.eventType || 'client.event').slice(0, 80)
  const route = String(req.body?.route || '').slice(0, 300)
  const metadata = auditLog.sanitizeObject(req.body?.metadata || {})

  auditLog.recordRequest({
    actor: req.user,
    action: eventType,
    entityType: 'frontend',
    entityId: route || null,
    method: 'CLIENT',
    path: route || req.originalUrl,
    statusCode: 200,
    durationMs: 0,
    ipAddress: req.ip,
    requestId: req.id,
    source: 'frontend',
    metadata: {
      ...metadata,
      actorMode: auditLog.getActorMode(req.user),
      userAgent: String(req.headers['user-agent'] || '').slice(0, 300),
    },
  })

  res.status(204).end()
})

module.exports = router
