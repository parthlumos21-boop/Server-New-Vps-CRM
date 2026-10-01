const { AppError } = require('../utils/appError')

const GLOBAL_ROLES = new Set(['super_admin'])
const PRIVILEGED_ROLES = new Set(['admin', 'super_admin'])
const STANDARD_ROLES = new Set(['manager', 'engineer', 'sales', 'user'])
const SUPPORTED_ROLES = new Set([...PRIVILEGED_ROLES, ...STANDARD_ROLES])
const DEFAULT_OWNER_KEYS = [
  'ownerUserId',
  'owner_user_id',
  'assignedTo',
  'assigned_to',
  'createdBy',
  'created_by',
  'userId',
  'user_id',
  'uploadedBy',
  'uploaded_by',
  'updatedBy',
  'updated_by',
  'senderId',
  'sender_id',
  'receiverId',
  'receiver_id',
]

const normalizeRole = (role) => String(role || '').trim().toLowerCase()

const isSupportedRole = (role) => SUPPORTED_ROLES.has(normalizeRole(role))

const isGlobalRole = (role) => GLOBAL_ROLES.has(normalizeRole(role))

const isPrivilegedRole = (role) => PRIVILEGED_ROLES.has(normalizeRole(role))

const isStandardRole = (role) => STANDARD_ROLES.has(normalizeRole(role))

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const stringValue = String(value).trim()
  if (!/^-?\d+$/.test(stringValue)) return null
  const parsedValue = Number.parseInt(stringValue, 10)
  return Number.isSafeInteger(parsedValue) ? parsedValue : null
}

const toTrimmedStringOrNull = (value) => {
  if (value === null || value === undefined) return null
  const stringValue = String(value).trim()
  return stringValue || null
}

const uniqueNumericValues = (values = []) => (
  Array.from(new Set(
    values
      .map((value) => toNumberOrNull(value))
      .filter((value) => value !== null)
  ))
)

const buildAnyColumnCondition = ({ prefix, columns, values, params, cast = 'int' }) => {
  const normalizedColumns = Array.from(new Set(
    (columns || [])
      .map((column) => String(column || '').trim())
      .filter(Boolean)
  ))
  const normalizedValues = uniqueNumericValues(values || [])

  if (normalizedColumns.length === 0 || normalizedValues.length === 0) {
    return ''
  }

  params.push(normalizedValues)
  const paramRef = `$${params.length}::${cast}[]`
  return `(${normalizedColumns.map((column) => `${prefix}${column} = ANY(${paramRef})`).join(' OR ')})`
}

const extractOwnerIds = (record, extraKeys = []) => {
  if (!record || typeof record !== 'object') return []
  return uniqueNumericValues(
    [...DEFAULT_OWNER_KEYS, ...extraKeys].map((key) => record[key])
  )
}

const resolveRecordCompanyId = (record) => (
  toNumberOrNull(record?.companyId ?? record?.company_id)
)

const hasCompanyAccess = (actor, companyId) => {
  if (companyId === null || companyId === undefined) return true
  if (isGlobalRole(actor?.role)) return true

  const actorCompanyId = toNumberOrNull(actor?.companyId ?? actor?.company_id)
  return actorCompanyId !== null && actorCompanyId === toNumberOrNull(companyId)
}

const canAccessRecord = (actor, record, extraOwnerKeys = []) => {
  if (!actor || !record) return false
  if (!hasCompanyAccess(actor, resolveRecordCompanyId(record))) return false
  if (isPrivilegedRole(actor.role)) return true

  const scopedUserIds = uniqueNumericValues([
    actor.id,
    ...(actor.scopeUserIds || []),
  ])
  const recordOwnerIds = extractOwnerIds(record, extraOwnerKeys)
  if (recordOwnerIds.some((ownerId) => scopedUserIds.includes(ownerId))) {
    return true
  }

  const scopedOwnerCodes = uniqueNumericValues(actor.scopeOwnerCodes || [])
  const recordOwnerCodes = uniqueNumericValues([
    record.accountNo,
    record.accountNumber,
    record.account_no,
  ])
  return recordOwnerCodes.some((ownerCode) => scopedOwnerCodes.includes(ownerCode))
}

const assertRecordAccess = (actor, record, entityLabel, extraOwnerKeys = []) => {
  if (!canAccessRecord(actor, record, extraOwnerKeys)) {
    throw new AppError(`You do not have permission to access this ${entityLabel}.`, 403)
  }
}

const buildScopedWhereClause = ({
  actor,
  params = [],
  companyColumn = 'company_id',
  ownerColumns = ['owner_user_id'],
  columnPrefix = '',
  companyWide = false,
  scopeUserIds = null,
  additionalScopeGroups = [],
}) => {
  const nextParams = [...params]
  const conditions = []
  const prefix = columnPrefix ? `${columnPrefix}.` : ''
  const actorCompanyId = toNumberOrNull(actor?.companyId ?? actor?.company_id)

  if (!isGlobalRole(actor?.role) && actorCompanyId !== null) {
    nextParams.push(actorCompanyId)
    conditions.push(`${prefix}${companyColumn} = $${nextParams.length}`)
  }

  if (!companyWide && !isPrivilegedRole(actor?.role)) {
    const scopedValues = uniqueNumericValues(
      scopeUserIds && scopeUserIds.length ? scopeUserIds : [actor?.id]
    )
    const scopedGroups = []
    const ownerCondition = buildAnyColumnCondition({
      prefix,
      columns: ownerColumns,
      values: scopedValues,
      params: nextParams,
      cast: 'int',
    })

    if (ownerCondition) {
      scopedGroups.push(ownerCondition)
    }

    additionalScopeGroups.forEach((group) => {
      const groupCondition = buildAnyColumnCondition({
        prefix,
        columns: group.columns,
        values: group.values,
        params: nextParams,
        cast: group.cast || 'int',
      })
      if (groupCondition) {
        scopedGroups.push(groupCondition)
      }
    })

    if (scopedGroups.length === 0) {
      conditions.push('1 = 0')
    } else {
      conditions.push(`(${scopedGroups.join(' OR ')})`)
    }
  }

  return {
    clause: conditions.length > 0 ? conditions.join(' AND ') : '1 = 1',
    params: nextParams,
  }
}

const applyOwnershipMetadata = (actor, payload = {}, existingRecord = null, overrides = {}) => {
  const canChooseTenant = isGlobalRole(actor?.role)
  const createdBy = canChooseTenant
    ? toNumberOrNull(
        overrides.createdBy
        ?? payload.createdBy
        ?? payload.created_by
        ?? existingRecord?.createdBy
        ?? existingRecord?.created_by
        ?? actor?.id
      )
    : toNumberOrNull(
        existingRecord?.createdBy
        ?? existingRecord?.created_by
        ?? actor?.id
      )
  const assignedTo = toNumberOrNull(
    overrides.assignedTo
    ?? payload.assignedTo
    ?? payload.assigned_to
    ?? existingRecord?.assignedTo
    ?? existingRecord?.assigned_to
  )
  const uploadedBy = toNumberOrNull(
    overrides.uploadedBy
    ?? payload.uploadedBy
    ?? payload.uploaded_by
    ?? existingRecord?.uploadedBy
    ?? existingRecord?.uploaded_by
  )
  const ownerUserId = toNumberOrNull(
    overrides.ownerUserId
    ?? payload.ownerUserId
    ?? payload.owner_user_id
    ?? existingRecord?.ownerUserId
    ?? existingRecord?.owner_user_id
    ?? assignedTo
    ?? uploadedBy
    ?? createdBy
    ?? actor?.id
  )
  const companyId = canChooseTenant
    ? toNumberOrNull(
        overrides.companyId
        ?? payload.companyId
        ?? payload.company_id
        ?? existingRecord?.companyId
        ?? existingRecord?.company_id
        ?? actor?.companyId
        ?? actor?.company_id
        ?? 1
      )
    : toNumberOrNull(
        existingRecord?.companyId
        ?? existingRecord?.company_id
        ?? actor?.companyId
        ?? actor?.company_id
        ?? 1
      )
  const projectId = toNumberOrNull(
    overrides.projectId
    ?? payload.projectId
    ?? payload.project_id
    ?? payload.data?.projectId
    ?? payload.data?.project_id
    ?? existingRecord?.projectId
    ?? existingRecord?.project_id
    ?? existingRecord?.data?.projectId
  )
  const workflowId = toTrimmedStringOrNull(
    overrides.workflowId
    ?? payload.workflowId
    ?? payload.workflow_id
    ?? payload.data?.workflowId
    ?? payload.data?.workflow_id
    ?? existingRecord?.workflowId
    ?? existingRecord?.workflow_id
    ?? existingRecord?.data?.workflowId
  )

  return {
    ...payload,
    companyId,
    createdBy,
    ownerUserId,
    projectId,
    workflowId,
  }
}

module.exports = {
  SUPPORTED_ROLES,
  normalizeRole,
  isSupportedRole,
  isGlobalRole,
  isPrivilegedRole,
  isStandardRole,
  toNumberOrNull,
  toTrimmedStringOrNull,
  extractOwnerIds,
  hasCompanyAccess,
  canAccessRecord,
  assertRecordAccess,
  buildScopedWhereClause,
  applyOwnershipMetadata,
}
