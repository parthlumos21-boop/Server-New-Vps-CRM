const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const logger = require('../utils/logger')

const AuditLog = getMongoModel('audit_log')

const record = async ({ actor, action, entityType, entityId, changes = {}, ipAddress = null }) => {
  try {
    await AuditLog.create({
      legacyId: await getNextLegacyId('audit_log'),
      actorId: actor?.id || null,
      actorName: actor?.name || null,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      changes: changes || {},
      ipAddress,
      companyId: actor?.companyId || 1,
      createdAt: new Date(),
    })
  } catch (error) {
    logger.warn({ err: error, entityType, entityId, action }, 'Failed to write audit log')
  }
}

module.exports = { record }
