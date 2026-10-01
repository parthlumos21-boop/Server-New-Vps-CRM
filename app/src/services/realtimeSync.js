import { authService } from './authService'
import { CRM_FILTER_USERS, getCrmOwnerRecord, normalizeCrmUserName } from '../features/users/crmUserDirectory'

const normalizeValue = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')

const unique = (values) => Array.from(new Set(values.filter(Boolean)))

const USER_ID_FIELDS = [
  'userId',
  'ownerId',
  'assignedToId',
  'assignedTo',
  'assignedUserId',
  'createdById',
  'createdBy',
  'updatedById',
]

const USER_ID_ARRAY_FIELDS = [
  'assignedUserIds',
  'recipientUserIds',
]

const USER_NAME_FIELDS = [
  'accountOwner',
  'ownerName',
  'dealOwner',
  'customerOwner',
  'contactPerson',
  'addedByName',
  'closedByName',
  'senderName',
]

const USER_NAME_ARRAY_FIELDS = [
  'recipientUserNames',
]

const getUserNameLookup = () => authService
  .getAvailableUsers()
  .reduce((lookup, user) => {
    const normalizedName = normalizeValue(user.name)
    if (normalizedName) {
      lookup.set(normalizedName, user.id)
    }
    return lookup
  }, new Map())

const collectCandidateNames = (record = {}) => unique([
  ...USER_NAME_FIELDS.map((field) => record[field]),
  ...USER_NAME_ARRAY_FIELDS.flatMap((field) => record[field] || []),
].map((value) => String(value || '').trim()).filter(Boolean))

const resolveLinkedUserScope = (user = {}) => {
  const ownerRecord = getCrmOwnerRecord(user.ownerCode || user.owner_code || user.name || user.username)
  const linkedUsers = ownerRecord?.userGroup
    ? CRM_FILTER_USERS.filter((entry) => entry.userGroup === ownerRecord.userGroup)
    : []

  return {
    ids: unique([
      user.id,
      ...linkedUsers.map((entry) => entry.id),
    ].map((value) => String(value || ''))),
    names: unique([
      user.name,
      user.username,
      ownerRecord?.name,
      ...linkedUsers.map((entry) => entry.name),
    ].map(normalizeCrmUserName)),
    ownerCodes: unique([
      user.ownerCode,
      user.owner_code,
      ownerRecord?.ownerCode,
      ...linkedUsers.map((entry) => entry.ownerCode),
    ].map((value) => String(value || ''))),
  }
}

export const resolveUserIdsFromNames = (names = []) => {
  const lookup = getUserNameLookup()
  return unique(names.map((name) => lookup.get(normalizeValue(name))))
}

export const resolveAssignedUserIds = (record = {}) => unique([
  ...USER_ID_FIELDS.map((field) => record[field]),
  ...USER_ID_ARRAY_FIELDS.flatMap((field) => record[field] || []),
  ...resolveUserIdsFromNames(collectCandidateNames(record)),
])

export const enrichRealtimeRecord = (entityType, record = {}) => {
  if (!record || typeof record !== 'object') {
    return record
  }

  const assignedUserIds = resolveAssignedUserIds(record)

  return {
    ...record,
    entityType,
    ...(assignedUserIds.length > 0 ? { assignedUserIds } : {}),
  }
}

export const buildRealtimePayload = ({
  entityType,
  action,
  record = null,
  previousRecord = null,
  actor = null,
}) => {
  const nextRecord = record ? enrichRealtimeRecord(entityType, record) : null
  const previous = previousRecord ? enrichRealtimeRecord(entityType, previousRecord) : null
  const assignedUserIds = unique([
    ...(nextRecord?.assignedUserIds || []),
    ...(previous?.assignedUserIds || []),
  ])

  return {
    entityType,
    action,
    record: nextRecord,
    previousRecord: previous,
    recordId: nextRecord?.id || previous?.id || null,
    assignedUserIds,
    actor: actor ? {
      userId: actor.id,
      role: actor.role,
      name: actor.name,
    } : null,
    timestamp: new Date().toISOString(),
  }
}

export const matchesUserScope = (record, user) => {
  if (!user) return false
  if (user.role === 'admin') return true

  const linkedScope = resolveLinkedUserScope(user)
  const visibleUserIds = resolveAssignedUserIds(record).map((value) => String(value || ''))
  if (visibleUserIds.some((id) => linkedScope.ids.includes(id))) {
    return true
  }

  const visibleNames = collectCandidateNames(record).map(normalizeCrmUserName)
  if (visibleNames.some((name) => linkedScope.names.includes(name))) {
    return true
  }

  const visibleOwnerCodes = [
    record.accountNo,
    record.accountNumber,
    record.ownerCode,
    record.owner_code,
    record.dealOwnerCode,
    record.customerOwnerCode,
  ].map((value) => String(value || '')).filter(Boolean)

  return visibleOwnerCodes.some((ownerCode) => linkedScope.ownerCodes.includes(ownerCode))
}

export const canUserAccessEntity = (user, entityType, payload) => {
  if (!user) return false
  if (user.role === 'admin') return true

  if (entityType === 'message') {
    const message = payload?.record || payload
    const userId = String(user.id || '')
    return (
      String(message?.senderId || '') === userId
      || String(message?.receiverId || '') === userId
      || (message?.recipientUserIds || []).map((id) => String(id || '')).includes(userId)
    )
  }

  const record = payload?.record || payload?.previousRecord || payload

  if (!record) {
    return false
  }

  if (entityType === 'account') {
    const createdByIds = [
      record.createdBy,
      record.createdById,
      record.createdByUserId,
      record.userId,
      record.raw?.createdBy,
      record.raw?.createdByUserId,
      record.raw?.formData?.userId,
      record.raw?.formData?.createdByUserId,
    ].map((value) => String(value || '')).filter(Boolean)

    return createdByIds.includes(String(user.id || ''))
  }

  return matchesUserScope(record, user)
}
