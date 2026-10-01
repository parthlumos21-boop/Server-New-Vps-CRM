const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const logger = require('../utils/logger')

const AuditLog = getMongoModel('audit_log')
const SENSITIVE_KEYS = new Set([
  'authorization',
  'cookie',
  'password',
  'passwordhash',
  'token',
  'access_token',
  'refresh_token',
  'secret',
  'apikey',
  'api_key',
  'otp',
])

const AUDIT_DISABLED = String(process.env.DISABLE_CRM_AUDIT_LOGS || '').toLowerCase() === 'true'

const getActorMode = (actor = {}) => {
  const role = String(actor.role || '').trim().toLowerCase()
  return role === 'admin' || role === 'super_admin' ? 'admin' : 'user'
}

const redactValue = (value, key = '') => {
  const normalizedKey = String(key || '').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()
  if (SENSITIVE_KEYS.has(normalizedKey) || normalizedKey.includes('password') || normalizedKey.includes('token')) {
    return '[REDACTED]'
  }

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((entry) => redactValue(entry))
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 50)
        .map(([entryKey, entryValue]) => [entryKey, redactValue(entryValue, entryKey)])
    )
  }

  if (typeof value === 'string' && value.length > 500) {
    return `${value.slice(0, 500)}...`
  }

  return value
}

const sanitizeObject = (value = {}) => redactValue(value)

const writeAudit = async (entry) => {
  if (AUDIT_DISABLED) return

  await AuditLog.create({
    legacyId: await getNextLegacyId('audit_log'),
    ...entry,
    createdAt: entry.createdAt || new Date(),
  })
}

const record = async ({ actor, action, entityType, entityId, changes = {}, ipAddress = null }) => {
  try {
    await writeAudit({
      actorId: actor?.id || null,
      actorName: actor?.name || null,
      actorRole: actor?.role || null,
      actorMode: getActorMode(actor),
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      changes: sanitizeObject(changes || {}),
      ipAddress,
      companyId: actor?.companyId || 1,
    })
  } catch (error) {
    logger.warn({ err: error, entityType, entityId, action }, 'Failed to write audit log')
  }
}

const recordRequest = async ({
  actor,
  action = 'api.request',
  entityType = 'api',
  entityId = null,
  method,
  path,
  statusCode,
  durationMs,
  ipAddress,
  requestId,
  source = 'backend',
  metadata = {},
}) => {
  try {
    await writeAudit({
      actorId: actor?.id || null,
      actorName: actor?.name || null,
      actorRole: actor?.role || metadata?.actorRole || null,
      actorMode: actor ? getActorMode(actor) : (metadata?.actorMode || null),
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      changes: {},
      ipAddress,
      companyId: actor?.companyId || metadata?.companyId || 1,
      requestId,
      source,
      method,
      path,
      statusCode,
      durationMs,
      metadata: sanitizeObject(metadata || {}),
    })

    logger.info({
      audit: true,
      source,
      actorMode: actor ? getActorMode(actor) : metadata?.actorMode,
      actorId: actor?.id || null,
      action,
      method,
      path,
      statusCode,
      durationMs,
    }, 'CRM audit log recorded')
  } catch (error) {
    logger.warn({ err: error, action, method, path }, 'Failed to write request audit log')
  }
}

module.exports = {
  record,
  recordRequest,
  sanitizeObject,
  getActorMode,
}
