const { isGlobalRole, isPrivilegedRole, toNumberOrNull } = require('../security/accessScope')
const { camelToSnake, snakeToCamel } = require('../utils/mongoRecordMapper')

const toArray = (value) => (Array.isArray(value) ? value : [value])

const uniqueNumbers = (values = []) => Array.from(new Set(
  values.map((value) => toNumberOrNull(value)).filter((value) => value !== null)
))

const fieldAliases = (field) => {
  const normalizedField = String(field || '').trim()
  const camelField = snakeToCamel(normalizedField)
  const snakeField = camelToSnake(normalizedField)
  return Array.from(new Set([normalizedField, camelField, snakeField].filter(Boolean)))
}

const buildFieldInFilter = (fields = [], values = []) => {
  const normalizedValues = uniqueNumbers(values)
  if (normalizedValues.length === 0) return null

  const clauses = fields.flatMap((field) => fieldAliases(field).map((alias) => ({ [alias]: { $in: normalizedValues } })))
  return clauses.length ? { $or: clauses } : null
}

const buildScopedMongoFilter = ({
  actor,
  companyField = 'companyId',
  ownerFields = ['ownerUserId'],
  companyWide = false,
  scopeUserIds = null,
  additionalScopeGroups = [],
} = {}) => {
  const filter = {}
  const actorCompanyId = toNumberOrNull(actor?.companyId ?? actor?.company_id)

  if (!isGlobalRole(actor?.role) && actorCompanyId !== null) {
    filter.$or = fieldAliases(companyField).map((field) => ({ [field]: actorCompanyId }))
  }

  if (!companyWide && !isPrivilegedRole(actor?.role)) {
    const scopedValues = uniqueNumbers(scopeUserIds && scopeUserIds.length ? scopeUserIds : [actor?.id])
    const ownerFilter = buildFieldInFilter(ownerFields, scopedValues)
    const additionalFilters = additionalScopeGroups
      .map((group) => buildFieldInFilter(group.fields || group.columns || [], group.values || []))
      .filter(Boolean)

    const accessClauses = [
      ...(ownerFilter?.$or || []),
      ...additionalFilters.flatMap((entry) => entry.$or || []),
    ]

    if (accessClauses.length === 0) {
      return { _id: null }
    }

    if (filter.$or) {
      return {
        $and: [
          { $or: filter.$or },
          { $or: accessClauses },
        ],
      }
    }

    return { $or: accessClauses }
  }

  return filter
}

const mergeFilters = (...filters) => {
  const normalizedFilters = filters.filter((filter) => filter && Object.keys(filter).length > 0)
  if (normalizedFilters.length === 0) return {}
  if (normalizedFilters.length === 1) return normalizedFilters[0]
  return { $and: normalizedFilters }
}

const regexSearch = (value) => new RegExp(String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

const byLegacyId = (id) => {
  const numericId = toNumberOrNull(id)
  if (numericId !== null) {
    return {
      $or: [
        { legacyId: numericId },
        { id: numericId },
      ],
    }
  }

  return { _id: id }
}

const sortFromOrder = (defaultOrder = 'updated_at DESC, id DESC') => (
  String(defaultOrder || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((sort, part) => {
      const [field, direction] = part.split(/\s+/u)
      const mongoField = field === 'id' ? 'legacyId' : snakeToCamel(field)
      sort[mongoField] = String(direction || '').toLowerCase() === 'asc' ? 1 : -1
      return sort
    }, {})
)

module.exports = {
  byLegacyId,
  buildFieldInFilter,
  buildScopedMongoFilter,
  fieldAliases,
  mergeFilters,
  regexSearch,
  sortFromOrder,
  uniqueNumbers,
}
