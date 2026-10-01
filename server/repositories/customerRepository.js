const { createCrudRepository } = require('./crudRepositoryFactory')
const { byLegacyId, buildScopedMongoFilter, mergeFilters } = require('./mongoQueryHelpers')
const { getCrmOwnerRecord } = require('../features/crmUserDirectory')
const { isPrivilegedRole } = require('../security/accessScope')

const repository = createCrudRepository({ table: 'customers', jsonbColumns: ['data'] })
const visibleFilter = { frontendDeleted: { $ne: true } }

const uniqueValues = (values = []) => Array.from(new Set(
  values
    .map((value) => String(value || '').trim())
    .filter(Boolean)
))

const buildCustomerOwnerTextFilter = async (actor = {}) => {
  if (!actor || isPrivilegedRole(actor.role)) return null

  const ownerRecord = await getCrmOwnerRecord(actor.ownerCode || actor.owner_code || actor.name || actor.username)
  const ownerNames = uniqueValues([
    actor.name,
    actor.username,
    actor.email,
    actor.ownerDisplayName,
    actor.owner_display_name,
    ownerRecord?.name,
    ...(ownerRecord?.aliases || []),
  ])
  const ownerCodes = uniqueValues([
    actor.ownerCode,
    actor.owner_code,
    ownerRecord?.ownerCode,
  ])

  const clauses = [
    ...ownerNames.flatMap((name) => ([
      { customerOwner: name },
      { customerOwnerName: name },
      { customerOwnerDisplay: name },
      { ownerName: name },
      { assignedToName: name },
      { addedBy: name },
      { addedByName: name },
      { 'data.customerOwner': name },
      { 'data.customerOwnerName': name },
      { 'data.customerOwnerDisplay': name },
      { 'data.ownerName': name },
      { 'data.assignedToName': name },
      { 'data.addedBy': name },
      { 'data.addedByName': name },
    ])),
    ...ownerCodes.flatMap((code) => ([
      { ownerCode: code },
      { customerOwnerCode: code },
      { 'data.ownerCode': code },
      { 'data.customerOwnerCode': code },
    ])),
  ]

  return clauses.length ? { $or: clauses } : null
}

const buildCompanyFilter = (actor, queryOptions = {}) => buildScopedMongoFilter({
  actor,
  companyField: 'company_id',
  ownerFields: [],
  companyWide: true,
  scopeUserIds: queryOptions.scopeUserIds,
})

const dedupeById = (records = []) => {
  const seen = new Set()
  return records.filter((record) => {
    const key = String(record?.id || record?.legacyId || record?._id || '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
}

repository.listForActor = async (actor, queryOptions = {}) => {
  const scopedRecords = await repository.model
    .find(mergeFilters(buildScopedMongoFilter({
      actor,
      companyField: 'company_id',
      ownerFields: ['ownerUserId', 'owner_user_id', 'assigned_to', 'created_by'],
      companyWide: queryOptions.companyWide,
      scopeUserIds: queryOptions.scopeUserIds,
    }), visibleFilter))
    .sort({ updatedAt: -1, legacyId: -1 })
    .lean()

  if (queryOptions.companyWide || isPrivilegedRole(actor?.role)) {
    return scopedRecords.map(repository.map)
  }

  const ownerTextFilter = await buildCustomerOwnerTextFilter(actor)
  if (!ownerTextFilter) {
    return scopedRecords.map(repository.map)
  }

  const ownerTextRecords = await repository.model
    .find(mergeFilters(buildCompanyFilter(actor, queryOptions), ownerTextFilter, visibleFilter))
    .sort({ updatedAt: -1, legacyId: -1 })
    .lean()

  return dedupeById([...scopedRecords, ...ownerTextRecords]).map(repository.map)
}

repository.findByIdForActor = async (id, actor, queryOptions = {}) => {
  const records = await repository.listForActor(actor, queryOptions)
  return records.find((record) => String(record.id) === String(id)) || null
}

module.exports = repository
