const { AppError } = require('../utils/appError')
const { getSocketServer } = require('../socket/socketServer')
const { SOCKET_EVENTS } = require('../socket/socketEvents')
const auditLog = require('./auditLog')
const notificationRepository = require('../repositories/notificationRepository')
const { applyOwnershipMetadata, assertRecordAccess, isPrivilegedRole, toNumberOrNull } = require('../security/accessScope')
const { resolveCrmGroupScope } = require('../security/crmGroupScope')
const userRepository = require('../repositories/userRepository')

const OWNER_KEYS_TO_RESOLVE = [
  'assignedTo', 'assigned_to', 'ownerUserId', 'owner_user_id',
  'createdBy', 'created_by', 'userId', 'user_id', 'uploadedBy', 'uploaded_by',
]

const isNumericValue = (value) => {
  if (value === null || value === undefined) return false
  const s = String(value).trim()
  return /^\d+$/.test(s)
}

const resolveUserIdIfString = async (value) => {
  if (value === null || value === undefined) return null
  const numericValue = toNumberOrNull(value)
  if (numericValue !== null) return numericValue
  const str = String(value || '').trim()
  if (!str) return null

  // Try login (username or email)
  const byLogin = await userRepository.findUserByLogin(str)
  if (byLogin && byLogin.id) return byLogin.id

  // Try name
  const byName = await userRepository.findUserByName(str)
  if (byName && byName.id) return byName.id

  return null
}

const normalizeOwnerFields = async (payload = {}, actor = {}) => {
  if (!payload || typeof payload !== 'object') return
  // Resolve common owner/assignee keys in-place
  await Promise.all(OWNER_KEYS_TO_RESOLVE.map(async (key) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) return
    const raw = payload[key]
    if (raw === null || raw === undefined) return
    if (isNumericValue(raw)) return
    try {
      const resolved = await resolveUserIdIfString(raw)
      if (resolved !== null) payload[key] = resolved
    } catch (e) {
      // Ignore resolution errors and leave the original value; DB layer will handle validation
    }
  }))
}

const normalizeId = (id, label) => {
  const parsed = toNumberOrNull(id)
  if (parsed === null) {
    throw new AppError(`${label} id is invalid.`, 400)
  }
  return parsed
}

const ensureAccess = (actor, record, entityLabel) => {
  assertRecordAccess(actor, record, entityLabel)
}

const emitEntity = (entityType, action, record, actor) => {
  const socketServer = getSocketServer()
  if (!socketServer) return

  const payload = { action, record, recordId: record?.id, entityType, actor: { id: actor.id, name: actor.name, role: actor.role } }
  const eventName = `${entityType}:${action}`

  socketServer.emitToAdmins(eventName, payload)
  socketServer.emitToAdmins(SOCKET_EVENTS.DASHBOARD_UPDATE, {
    entityType, action, recordId: record?.id, actor: { id: actor.id, name: actor.name, companyId: actor.companyId }, timestamp: new Date().toISOString(),
  })

  const assignedUserId = record?.assignedTo || record?.userId
  if (assignedUserId && assignedUserId !== actor.id) {
    const notificationMessage = `${actor.name || 'A user'} ${action} a ${entityType}.`

    notificationRepository.createNotification({
      senderId: actor.id,
      receiverId: assignedUserId,
      message: notificationMessage,
      companyId: actor.companyId,
    }).catch(() => {})

    socketServer.emitToUser(assignedUserId, eventName, payload)
    socketServer.emitToUser(assignedUserId, SOCKET_EVENTS.NOTIFICATION, {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: 'info',
      title: `${entityType} ${action}`,
      message: notificationMessage,
      timestamp: new Date().toISOString(),
      companyId: actor.companyId,
    })
  }

  socketServer.pushActivity(`${entityType}-${action}`, actor, { recordId: record?.id })
}

const createCrudService = ({
  repository,
  entityLabel,
  entityType,
  buildPayload,
  adminOnlyDelete = false,
  enforceScope = true,
}) => {
  const list = async (actor) => {
    if (!enforceScope || !repository.listForActor) {
      if (!enforceScope || isPrivilegedRole(actor.role)) {
        return repository.listAll()
      }
      return repository.listForUser(actor.id)
    }

    const scope = await resolveCrmGroupScope(actor)
    return repository.listForActor(scope.actor, scope.queryOptions)
  }

  const get = async (actor, id) => {
    const normalizedId = normalizeId(id, entityLabel)
    const scope = await resolveCrmGroupScope(actor)
    const record = repository.findByIdForActor
      ? await repository.findByIdForActor(normalizedId, scope.actor, scope.queryOptions)
      : await repository.findById(normalizedId)
    if (!record) throw new AppError(`${entityLabel} not found.`, 404)
    if (enforceScope) ensureAccess(scope.actor, record, entityLabel)
    return record
  }

  const create = async (actor, body) => {
    // Build payload and normalize owner/assignment fields before applying ownership metadata
    const rawPayload = await buildPayload(body || {}, actor, null)
    await normalizeOwnerFields(rawPayload, actor)
    const payload = applyOwnershipMetadata(actor, rawPayload, null)
    const record = await repository.create(payload)
    emitEntity(entityType, 'created', record, actor)
    auditLog.record({ actor, action: 'create', entityType, entityId: record?.id, changes: { after: record } })
    return record
  }

  const update = async (actor, id, body) => {
    const existing = await get(actor, id)
    const rawPayload = await buildPayload(body || {}, actor, existing)
    await normalizeOwnerFields(rawPayload, actor)
    const payload = applyOwnershipMetadata(actor, rawPayload, existing)
    const record = await repository.update(normalizeId(id, entityLabel), payload)
    if (!record) throw new AppError(`${entityLabel} not found.`, 404)
    emitEntity(entityType, 'updated', record, actor)
    auditLog.record({ actor, action: 'update', entityType, entityId: record?.id, changes: { before: existing, after: record } })
    return record
  }

  const remove = async (actor, id) => {
    const existing = await get(actor, id)
    if (adminOnlyDelete && !isPrivilegedRole(actor.role)) {
      throw new AppError(`Only admins can delete this ${entityLabel}.`, 403)
    }
    await repository.remove(normalizeId(id, entityLabel))
    emitEntity(entityType, 'deleted', existing, actor)
    auditLog.record({ actor, action: 'delete', entityType, entityId: existing?.id, changes: { before: existing } })
    return { id: existing.id }
  }

  return { list, get, create, update, remove }
}

module.exports = {
  createCrudService,
  normalizeId,
  ensureAccess,
  emitEntity,
}
