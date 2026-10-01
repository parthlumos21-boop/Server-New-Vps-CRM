const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { byLegacyId } = require('./mongoQueryHelpers')

const PasswordResetRequest = getMongoModel('password_reset_requests')
const PasswordResetAuditLog = getMongoModel('password_reset_audit_logs')

const sanitizeRequest = (record) => {
  if (!record) return null
  return {
    id: record.legacyId ?? record.id,
    userId: record.userId,
    email: record.email,
    userName: record.userName || '',
    status: record.status,
    attemptCount: record.attemptCount ?? 1,
    maxAttempts: record.maxAttempts ?? 1,
    assignedPassword: record.assignedPassword ?? record.assigned_password ?? '',
    adminId: record.adminId ?? null,
    adminName: record.adminName || '',
    adminActionAt: record.adminActionAt || null,
    adminComment: record.adminComment || '',
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

const findRequestRecordById = async (requestId) => PasswordResetRequest.findOne(byLegacyId(requestId))

const findPendingRequestByUserId = async (userId) => PasswordResetRequest
  .findOne({ userId, status: 'pending' })
  .sort({ createdAt: -1 })
  .lean()

const countRequestsByUserId = async (userId) => PasswordResetRequest.countDocuments({ userId })

const updateRequestStatus = async (requestId, updates = {}) => {
  const now = new Date()
  const record = await PasswordResetRequest.findOneAndUpdate(
    byLegacyId(requestId),
    {
      $set: {
        ...updates,
        updatedAt: now,
      },
    },
    { new: true }
  ).lean()

  return sanitizeRequest(record)
}

const createRequest = async ({
  user,
  newPasswordHash,
  assignedPassword = '',
  status = 'pending',
  attemptCount = 1,
  maxAttempts = 1,
  adminId = null,
  adminName = '',
  adminActionAt = null,
  adminComment = '',
  requestMeta = {},
}) => {
  const legacyId = await getNextLegacyId('password_reset_requests')
  const record = await PasswordResetRequest.create({
    legacyId,
    userId: user.id,
    email: user.email,
    userName: user.name || user.username || user.email,
    newPasswordHash,
    assignedPassword,
    status,
    attemptCount,
    maxAttempts,
    adminId,
    adminName,
    adminActionAt,
    adminComment,
    requestMeta,
  })

  return sanitizeRequest(record)
}

const listRequests = async ({ status = 'pending' } = {}) => {
  const normalizedStatus = String(status || '').toLowerCase()
  const filter = normalizedStatus && normalizedStatus !== 'all'
    ? { status: normalizedStatus === 'completed' ? { $in: ['completed', 'approved'] } : normalizedStatus }
    : {}
  const records = await PasswordResetRequest.find(filter).sort({ createdAt: -1 }).lean()
  return records.map(sanitizeRequest)
}

const createAuditLog = async ({ requestId, userId, email, action, actorId = null, actorName = '', comment = '', metadata = {} }) => {
  const legacyId = await getNextLegacyId('password_reset_audit_logs')
  await PasswordResetAuditLog.create({
    legacyId,
    requestId,
    userId,
    email,
    action,
    actorId,
    actorName,
    comment,
    metadata,
  })
}

module.exports = {
  createAuditLog,
  createRequest,
  countRequestsByUserId,
  findPendingRequestByUserId,
  findRequestRecordById,
  listRequests,
  sanitizeRequest,
  updateRequestStatus,
}
