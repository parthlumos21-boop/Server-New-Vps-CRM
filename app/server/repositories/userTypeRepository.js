const { Types } = require('mongoose')
const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { MAIL_GROUP_KEY, permissionCatalog } = require('../constants/userTypeCatalog')
const { toNumberOrNull } = require('../security/accessScope')
const { mapMongoDocument } = require('../utils/mongoRecordMapper')
const { byLegacyId, mergeFilters, regexSearch } = require('./mongoQueryHelpers')

const UserType = getMongoModel('user_types')
const RoleMapping = getMongoModel('role_mapping')
const User = getMongoModel('users')

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return ['true', '1', 'yes', 'active'].includes(value.trim().toLowerCase())
  return Boolean(value)
}

const idFilter = (id) => {
  if (Types.ObjectId.isValid(String(id)) && toNumberOrNull(id) === null) {
    return { _id: id }
  }
  return byLegacyId(id)
}

const companyFilter = (companyId) => {
  const numericCompanyId = toNumberOrNull(companyId)
  if (numericCompanyId === null) return {}
  return {
    $or: [
      { companyId: numericCompanyId },
      { company_id: numericCompanyId },
    ],
  }
}

const normalizePermissionRow = (permission = {}, source = 'user_permissions') => {
  const key = String(permission.key || permission.permissionKey || permission.permission_key || '').trim()
  if (!key) return null

  const groupKey = String(
    permission.groupKey ||
    permission.permissionGroupKey ||
    permission.permission_group_key ||
    key.split('.')[0] ||
    ''
  ).trim()

  return {
    key,
    groupKey,
    enabled: normalizeBoolean(permission.enabled ?? permission.isEnabled ?? permission.is_enabled, false),
    source: permission.source || permission.sourceTable || permission.source_table || source,
    updatedAt: permission.updatedAt || permission.updated_at || null,
  }
}

const permissionsFromObject = (permissionMap = {}) => Object.entries(permissionMap)
  .map(([key, enabled]) => normalizePermissionRow({ key, groupKey: String(key).split('.')[0], enabled }))
  .filter(Boolean)

const normalizePermissions = (document = {}) => {
  const permissions = []

  if (Array.isArray(document.permissions)) {
    permissions.push(...document.permissions.map((permission) => normalizePermissionRow(permission)).filter(Boolean))
  } else if (document.permissions && typeof document.permissions === 'object') {
    permissions.push(...permissionsFromObject(document.permissions))
  }

  if (Array.isArray(document.userPermissions)) {
    permissions.push(...document.userPermissions.map((permission) => normalizePermissionRow(permission, 'user_permissions')).filter(Boolean))
  }

  if (Array.isArray(document.user_permissions)) {
    permissions.push(...document.user_permissions.map((permission) => normalizePermissionRow(permission, 'user_permissions')).filter(Boolean))
  }

  if (Array.isArray(document.mailPermissions)) {
    permissions.push(...document.mailPermissions.map((permission) => normalizePermissionRow(permission, 'mail_permissions')).filter(Boolean))
  }

  if (Array.isArray(document.mail_permissions)) {
    permissions.push(...document.mail_permissions.map((permission) => normalizePermissionRow(permission, 'mail_permissions')).filter(Boolean))
  }

  const deduped = new Map()
  permissions.forEach((permission) => {
    const source = permission.groupKey === MAIL_GROUP_KEY ? 'mail_permissions' : permission.source
    deduped.set(permission.key, { ...permission, source })
  })

  return Array.from(deduped.values()).sort((left, right) => (
    `${left.groupKey}.${left.key}`.localeCompare(`${right.groupKey}.${right.key}`)
  ))
}

const normalizePermissionPayload = (permissions = []) => (
  (Array.isArray(permissions) ? permissions : permissionsFromObject(permissions))
    .map((permission) => normalizePermissionRow(permission, permission.groupKey === MAIL_GROUP_KEY ? 'mail_permissions' : 'user_permissions'))
    .filter(Boolean)
)

const activeUserCountForType = async (companyId, userTypeId) => {
  const numericCompanyId = toNumberOrNull(companyId)
  const numericUserTypeId = toNumberOrNull(userTypeId)
  if (numericUserTypeId === null) return 0

  const roleMappingFilter = mergeFilters(
    companyFilter(numericCompanyId),
    {
      $or: [
        { userTypeId: numericUserTypeId },
        { user_type_id: numericUserTypeId },
      ],
      isActive: { $ne: false },
      is_active: { $ne: false },
    }
  )

  const [mappingCount, assignedUserCount] = await Promise.all([
    RoleMapping.countDocuments(roleMappingFilter),
    User.countDocuments(mergeFilters(
      companyFilter(numericCompanyId),
      {
        isActive: { $ne: false },
        $or: [
          { assignedUserTypeIds: numericUserTypeId },
          { assigned_user_type_ids: numericUserTypeId },
          { userTypeIds: numericUserTypeId },
          { user_type_ids: numericUserTypeId },
        ],
      }
    )),
  ])

  return Math.max(mappingCount, assignedUserCount)
}

const permissionUpdatedAt = (document = {}) => {
  const timestamps = normalizePermissions(document)
    .map((permission) => permission.updatedAt)
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter(Number.isFinite)

  const baseTimestamp = new Date(document.updatedAt || document.updated_at || document.createdAt || document.created_at || Date.now()).getTime()
  return new Date(Math.max(baseTimestamp, ...timestamps)).toISOString()
}

const mapUserTypeDocument = async (document) => {
  if (!document) return null
  const row = mapMongoDocument(document)
  const id = row.legacyId ?? row.id
  const companyId = row.companyId ?? row.company_id ?? 1

  return {
    id,
    legacyId: row.legacyId ?? id,
    mongoId: row.mongoId || row._id?.toString?.() || undefined,
    companyId,
    name: row.name || '',
    description: row.description || '',
    status: row.status || 'draft',
    defaultLandingPage: row.defaultLandingPage || row.default_landing_page || '/dashboard',
    enableEmailAccess: normalizeBoolean(row.enableEmailAccess ?? row.enable_email_access, false),
    copyFromUserTypeId: row.copyFromUserTypeId ?? row.copy_from_user_type_id ?? null,
    hierarchyLevel: row.hierarchyLevel ?? row.hierarchy_level ?? 1,
    parentUserTypeId: row.parentUserTypeId ?? row.parent_user_type_id ?? null,
    isArchived: normalizeBoolean(row.isArchived ?? row.is_archived, false),
    archivedAt: row.archivedAt || row.archived_at || null,
    createdBy: row.createdBy ?? row.created_by ?? null,
    updatedBy: row.updatedBy ?? row.updated_by ?? null,
    activeUserCount: await activeUserCountForType(companyId, id),
    permissionsUpdatedAt: permissionUpdatedAt(row),
    createdAt: row.createdAt || row.created_at || null,
    updatedAt: row.updatedAt || row.updated_at || null,
  }
}

const listPermissionGroups = async () => (
  permissionCatalog.map((group, index) => ({
    key: group.key,
    label: group.label,
    description: group.description || '',
    displayOrder: index + 1,
  }))
)

const listUserTypes = async (companyId, filters = {}) => {
  const clauses = [companyFilter(companyId)]

  if (filters.search) {
    const search = regexSearch(filters.search)
    clauses.push({
      $or: [
        { name: search },
        { description: search },
      ],
    })
  }

  if (filters.status) {
    clauses.push({ status: String(filters.status).trim().toLowerCase() })
  }

  const records = await UserType
    .find(mergeFilters(...clauses))
    .sort({ isArchived: 1, status: 1, name: 1, legacyId: 1 })
    .lean()

  return Promise.all(records.map(mapUserTypeDocument))
}

const findUserTypeById = async (companyId, id) => {
  const record = await UserType.findOne(mergeFilters(companyFilter(companyId), idFilter(id))).lean()
  return mapUserTypeDocument(record)
}

const listUserTypePermissions = async (userTypeId) => {
  const record = await UserType.findOne(idFilter(userTypeId)).lean()
  return normalizePermissions(record || {})
}

const listRoleMappingsForUser = async (companyId, userId) => {
  const numericUserId = toNumberOrNull(userId)
  if (numericUserId === null) return []

  const companyClause = companyFilter(companyId)
  const [roleMappings, user] = await Promise.all([
    RoleMapping.find(mergeFilters(
      companyClause,
      {
        $or: [
          { userId: numericUserId },
          { user_id: numericUserId },
        ],
        isActive: { $ne: false },
        is_active: { $ne: false },
      }
    ))
      .sort({ isPrimary: -1, is_primary: -1, createdAt: 1, created_at: 1 })
      .lean(),
    User.findOne(mergeFilters(companyClause, idFilter(numericUserId))).lean(),
  ])

  const mappedIds = roleMappings
    .map((row) => toNumberOrNull(row.userTypeId ?? row.user_type_id))
    .filter((id) => id !== null)

  const userAssignedIds = [
    ...(Array.isArray(user?.assignedUserTypeIds) ? user.assignedUserTypeIds : []),
    ...(Array.isArray(user?.assigned_user_type_ids) ? user.assigned_user_type_ids : []),
    ...(Array.isArray(user?.userTypeIds) ? user.userTypeIds : []),
    ...(Array.isArray(user?.user_type_ids) ? user.user_type_ids : []),
  ].map(toNumberOrNull).filter((id) => id !== null)

  const candidateIds = Array.from(new Set([...mappedIds, ...userAssignedIds]))
  if (!candidateIds.length) return []

  const activeTypes = await UserType
    .find(mergeFilters(
      companyClause,
      {
        $or: candidateIds.flatMap((id) => [
          { legacyId: id },
          { id },
        ]),
        isArchived: { $ne: true },
        is_archived: { $ne: true },
        status: 'active',
      }
    ))
    .lean()

  return activeTypes
    .map((entry) => toNumberOrNull(entry.legacyId ?? entry.id))
    .filter((id) => id !== null)
}

const buildUserTypeDocument = async (payload = {}, existing = null) => {
  const legacyId = existing?.legacyId ?? existing?.id ?? await getNextLegacyId('user_types')
  return {
    legacyId,
    id: legacyId,
    companyId: toNumberOrNull(payload.companyId) ?? toNumberOrNull(existing?.companyId) ?? 1,
    name: payload.name,
    description: payload.description || '',
    status: payload.status || 'draft',
    defaultLandingPage: payload.defaultLandingPage || '/dashboard',
    enableEmailAccess: normalizeBoolean(payload.enableEmailAccess, false),
    copyFromUserTypeId: toNumberOrNull(payload.copyFromUserTypeId),
    hierarchyLevel: toNumberOrNull(payload.hierarchyLevel) ?? 1,
    parentUserTypeId: toNumberOrNull(payload.parentUserTypeId),
    isArchived: normalizeBoolean(payload.isArchived, false),
    archivedAt: payload.archivedAt || null,
    createdBy: toNumberOrNull(payload.createdBy) ?? existing?.createdBy ?? null,
    updatedBy: toNumberOrNull(payload.updatedBy) ?? null,
    permissions: normalizePermissionPayload(payload.permissions),
  }
}

const createUserType = async (payload) => {
  const document = await buildUserTypeDocument(payload)
  const created = await UserType.create(document)
  return created.legacyId ?? created.id
}

const updateUserType = async (companyId, id, payload) => {
  const existing = await UserType.findOne(mergeFilters(companyFilter(companyId), idFilter(id))).lean()
  if (!existing) return null

  const document = await buildUserTypeDocument(payload, mapMongoDocument(existing))
  delete document.createdBy

  const updated = await UserType.findOneAndUpdate(
    mergeFilters(companyFilter(companyId), idFilter(id)),
    { $set: document },
    { new: true, runValidators: true }
  ).lean()

  return mapUserTypeDocument(updated)
}

const deleteUserType = async (companyId, id) => {
  const existing = await UserType.findOneAndDelete(mergeFilters(companyFilter(companyId), idFilter(id))).lean()
  if (!existing) return null

  const numericId = toNumberOrNull(existing.legacyId ?? existing.id ?? id)
  if (numericId !== null) {
    await RoleMapping.deleteMany({
      $or: [
        { userTypeId: numericId },
        { user_type_id: numericId },
      ],
    })
  }

  return mapUserTypeDocument(existing)
}

module.exports = {
  listPermissionGroups,
  listUserTypes,
  findUserTypeById,
  listUserTypePermissions,
  listRoleMappingsForUser,
  createUserType,
  updateUserType,
  deleteUserType,
}
