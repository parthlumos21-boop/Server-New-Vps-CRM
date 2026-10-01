const userTypeRepository = require('../repositories/userTypeRepository')
const auditLog = require('./auditLog')
const { AppError } = require('../utils/appError')
const {
  permissionCatalog,
  USER_TYPE_STATUS_OPTIONS,
  USER_TYPE_LANDING_PAGES,
  ROLE_HIERARCHY_OPTIONS,
  flattenPermissions,
  permissionLookup,
} = require('../constants/userTypeCatalog')

const cleanString = (value) => String(value || '').trim()
const normalizeOptionalId = (value) => {
  if (value === null || value === undefined || value === '') return null
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    throw new AppError('Invalid related role selected.', 400)
  }
  return numericValue
}

const normalizeHierarchyLevel = (value) => {
  const numericValue = Number(value)
  const valid = ROLE_HIERARCHY_OPTIONS.some((option) => option.value === numericValue)
  if (!valid) {
    throw new AppError('Invalid role hierarchy level.', 400)
  }
  return numericValue
}

const buildEnabledPermissionSet = (permissions = []) => {
  const enabledSet = new Set()
  permissions.forEach((permission) => {
    if (permission.enabled) {
      enabledSet.add(permission.key)
    }
  })
  return enabledSet
}

const validatePermissions = (rawPermissions = [], enableEmailAccess = false) => {
  const normalized = flattenPermissions().map((permission) => ({
    key: permission.fullKey,
    groupKey: permission.groupKey,
    enabled: false,
  }))

  const byKey = normalized.reduce((accumulator, permission) => {
    accumulator[permission.key] = permission
    return accumulator
  }, {})

  ;(rawPermissions || []).forEach((permission) => {
    const key = cleanString(permission.key || permission.permissionKey)
    if (!key) return
    if (!byKey[key]) {
      throw new AppError(`Unknown permission: ${key}`, 400)
    }
    byKey[key].enabled = Boolean(permission.enabled)
  })

  if (!enableEmailAccess) {
    Object.values(byKey).forEach((permission) => {
      if (permission.groupKey === 'newEmailAccess') {
        permission.enabled = false
      }
    })
  }

  const enabledPermissions = buildEnabledPermissionSet(Object.values(byKey))

  Object.values(byKey).forEach((permission) => {
    if (!permission.enabled) return

    const catalogEntry = permissionLookup[permission.key]
    const dependencies = catalogEntry?.dependencies || []
    dependencies.forEach((dependencyKey) => {
      if (!enabledPermissions.has(dependencyKey)) {
        throw new AppError(
          `${catalogEntry.label} requires ${permissionLookup[dependencyKey]?.label || dependencyKey}.`,
          400
        )
      }
    })
  })

  return Object.values(byKey)
}

const mapPermissionsForClient = (rows = []) => {
  const map = new Map()
  rows.forEach((row) => {
    map.set(row.key, Boolean(row.enabled))
  })
  return map
}

const hydrateUserType = async (row) => {
  if (!row) return null
  const permissions = await userTypeRepository.listUserTypePermissions(row.id)
  return {
    ...row,
    permissions: mapPermissionsForClient(permissions),
  }
}

const ensureUniqueName = async (actor, name, excludeId = null) => {
  const currentList = await userTypeRepository.listUserTypes(actor.companyId, { search: name })
  const duplicate = currentList.find(
    (entry) => entry.name.toLowerCase() === name.toLowerCase() && entry.id !== excludeId
  )
  if (duplicate) {
    throw new AppError('A user type with this name already exists.', 409)
  }
}

const buildUserTypePayload = async (actor, payload = {}, existingUserType = null) => {
  const name = cleanString(payload.name || payload.userTypeName || existingUserType?.name)
  if (!name) {
    throw new AppError('User Type Name is required.', 400)
  }

  const status = cleanString(payload.status || existingUserType?.status || 'draft').toLowerCase()
  if (!USER_TYPE_STATUS_OPTIONS.includes(status)) {
    throw new AppError('Invalid user type status.', 400)
  }

  const defaultLandingPage = cleanString(payload.defaultLandingPage || existingUserType?.defaultLandingPage || '/dashboard')
  const landingPageValid = USER_TYPE_LANDING_PAGES.some((entry) => entry.value === defaultLandingPage)
  if (!landingPageValid) {
    throw new AppError('Invalid default landing page.', 400)
  }

  const enableEmailAccess = Boolean(
    payload.enableEmailAccess !== undefined
      ? payload.enableEmailAccess
      : existingUserType?.enableEmailAccess
  )

  const permissions = validatePermissions(
    payload.permissions || Object.entries(existingUserType?.permissions || {}).map(([key, enabled]) => ({ key, enabled })),
    enableEmailAccess
  )

  const hierarchyLevel = normalizeHierarchyLevel(
    payload.hierarchyLevel ?? existingUserType?.hierarchyLevel ?? ROLE_HIERARCHY_OPTIONS[0].value
  )

  return {
    companyId: actor.companyId,
    name,
    description: cleanString(payload.description || existingUserType?.description),
    status,
    defaultLandingPage,
    enableEmailAccess,
    copyFromUserTypeId: normalizeOptionalId(payload.copyFromUserTypeId ?? existingUserType?.copyFromUserTypeId),
    hierarchyLevel,
    parentUserTypeId: normalizeOptionalId(payload.parentUserTypeId ?? existingUserType?.parentUserTypeId),
    createdBy: existingUserType?.createdBy || actor.id,
    updatedBy: actor.id,
    permissions,
    isArchived: Boolean(payload.isArchived ?? existingUserType?.isArchived ?? status === 'archived'),
    archivedAt: (payload.isArchived ?? status === 'archived')
      ? (existingUserType?.archivedAt || new Date().toISOString())
      : null,
  }
}

const listUserTypes = async (actor, filters = {}) => {
  const rows = await userTypeRepository.listUserTypes(actor.companyId, filters)
  return Promise.all(rows.map((row) => hydrateUserType(row)))
}

const getUserTypeById = async (actor, id) => {
  const normalizedId = Number(id)
  if (!Number.isFinite(normalizedId)) {
    throw new AppError('Invalid user type id.', 400)
  }

  const row = await userTypeRepository.findUserTypeById(actor.companyId, normalizedId)
  if (!row) {
    throw new AppError('User type not found.', 404)
  }

  return hydrateUserType(row)
}

const getPermissionCatalog = async () => {
  const groups = await userTypeRepository.listPermissionGroups()
  return {
    groups: permissionCatalog.map((group) => ({
      ...group,
      dbGroup: groups.find((entry) => entry.key === group.key) || null,
    })),
    statuses: USER_TYPE_STATUS_OPTIONS,
    landingPages: USER_TYPE_LANDING_PAGES,
    hierarchyOptions: ROLE_HIERARCHY_OPTIONS,
  }
}

const createUserType = async (actor, payload) => {
  const normalizedPayload = await buildUserTypePayload(actor, payload)
  await ensureUniqueName(actor, normalizedPayload.name)

  if (normalizedPayload.parentUserTypeId) {
    const parent = await userTypeRepository.findUserTypeById(actor.companyId, normalizedPayload.parentUserTypeId)
    if (!parent) {
      throw new AppError('Selected parent role does not exist.', 404)
    }
  }

  const createdId = await userTypeRepository.createUserType(normalizedPayload)
  const created = await getUserTypeById(actor, createdId)
  await auditLog.record({
    actor,
    action: 'create',
    entityType: 'user_type',
    entityId: created.id,
    changes: { after: created },
  })
  return created
}

const updateUserType = async (actor, id, payload) => {
  const existing = await getUserTypeById(actor, id)
  const normalizedPayload = await buildUserTypePayload(actor, payload, existing)
  await ensureUniqueName(actor, normalizedPayload.name, existing.id)

  if (normalizedPayload.parentUserTypeId === existing.id) {
    throw new AppError('A user type cannot be its own parent.', 400)
  }

  if (normalizedPayload.parentUserTypeId) {
    const parent = await userTypeRepository.findUserTypeById(actor.companyId, normalizedPayload.parentUserTypeId)
    if (!parent) {
      throw new AppError('Selected parent role does not exist.', 404)
    }
  }

  const updatedRow = await userTypeRepository.updateUserType(actor.companyId, existing.id, normalizedPayload)
  if (!updatedRow) {
    throw new AppError('User type not found.', 404)
  }
  const updated = await getUserTypeById(actor, existing.id)
  await auditLog.record({
    actor,
    action: normalizedPayload.isArchived ? 'archive' : 'update',
    entityType: 'user_type',
    entityId: updated.id,
    changes: { before: existing, after: updated },
  })
  return updated
}

const deleteUserType = async (actor, id) => {
  const existing = await getUserTypeById(actor, id)
  const deleted = await userTypeRepository.deleteUserType(actor.companyId, existing.id)
  if (!deleted) {
    throw new AppError('User type not found.', 404)
  }
  await auditLog.record({
    actor,
    action: 'delete',
    entityType: 'user_type',
    entityId: existing.id,
    changes: { before: existing },
  })
  return { id: existing.id }
}

const getEffectivePermissionsForUser = async (actor) => {
  const assignedTypeIds = await userTypeRepository.listRoleMappingsForUser(actor.companyId, actor.id)
  if (!assignedTypeIds.length) {
    return {
      assignedTypeIds: [],
      permissions: {},
    }
  }

  const permissionMap = {}
  for (const id of assignedTypeIds) {
    const permissions = await userTypeRepository.listUserTypePermissions(id)
    permissions.forEach((permission) => {
      if (permission.enabled) {
        permissionMap[permission.key] = true
      }
    })
  }

  return {
    assignedTypeIds,
    permissions: permissionMap,
  }
}

module.exports = {
  listUserTypes,
  getUserTypeById,
  getPermissionCatalog,
  createUserType,
  updateUserType,
  deleteUserType,
  getEffectivePermissionsForUser,
}
