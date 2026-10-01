const { getMongoModel } = require('../models/mongoModels')
const { toNumberOrNull } = require('../security/accessScope')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters, regexSearch } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'deals',
  ownerColumn: 'owner_user_id',
})

const Deal = getMongoModel('deals')
const Lead = getMongoModel('leads')

const normalizeMappedDeal = async (record) => {
  const mapped = baseRepository.map(record)
  if (!mapped) return null

  const data = mapped.data && typeof mapped.data === 'object' ? mapped.data : {}
  const latest = (...values) => values.find((value) => value !== undefined && value !== null)
  const latestText = (...values) => String(latest(...values, '') || '').trim()
  const resolvedAmount = latest(data.amount, data.value, data.dealValue, mapped.amount, mapped.value, mapped.dealValue)
  let linkedAccountName = mapped.linkedAccountName || mapped.accountName || data.accountName || ''
  let linkedAccountNumber = mapped.linkedAccountNumber || mapped.accountNumber || data.accountNumber || data.accountNo || ''

  const accountId = toNumberOrNull(mapped.accountId)
  if (accountId !== null && (!linkedAccountName || !linkedAccountNumber)) {
    const account = await Lead.findOne(byLegacyId(accountId)).lean()
    const formData = account?.formData && typeof account.formData === 'object' ? account.formData : {}
    linkedAccountName = linkedAccountName || formData.accountName || account?.customerName || account?.company || ''
    linkedAccountNumber = linkedAccountNumber || formData.accountNumber || formData.accountNo || account?.accountNo || ''
  }

  return {
    ...mapped,
    dealNumber: mapped.dealNumber || data.dealNumber || data.deal_number || '',
    amount: resolvedAmount ?? null,
    value: resolvedAmount ?? null,
    dealValue: resolvedAmount ?? null,
    status: latestText(data.status, mapped.status, data.stage, mapped.stage),
    stage: latestText(data.stage, mapped.stage, data.status, mapped.status) || 'new',
    probability: latest(data.probability, mapped.probability, null),
    expectedCloseDate: latestText(data.expectedCloseDate, data.expectedClosureDate, data.closeDate, mapped.expectedCloseDate, mapped.expectedClosureDate, mapped.closeDate),
    expectedClosureDate: latestText(data.expectedClosureDate, data.expectedCloseDate, data.closeDate, mapped.expectedClosureDate, mapped.expectedCloseDate, mapped.closeDate),
    closeDate: latestText(data.closeDate, data.expectedCloseDate, mapped.closeDate, mapped.expectedCloseDate),
    actualClosureDate: latestText(data.actualClosureDate, mapped.actualClosureDate),
    dealDate: latestText(data.dealDate, mapped.dealDate),
    dealType: latestText(data.dealType, mapped.dealType, data.customerCategory, mapped.customerCategory),
    dealSource: latestText(data.dealSource, data.source, mapped.dealSource, mapped.source),
    source: latestText(data.source, data.dealSource, mapped.source, mapped.dealSource),
    dealSubsource: latestText(data.dealSubsource, data.subsource, mapped.dealSubsource, mapped.subsource),
    subsource: latestText(data.subsource, data.dealSubsource, mapped.subsource, mapped.dealSubsource),
    projectName: latestText(data.projectName, mapped.projectName),
    projectStatus: latestText(data.projectStatus, mapped.projectStatus),
    poValue: latest(data.poValue, mapped.poValue, ''),
    jobNo: latestText(data.jobNo, mapped.jobNo),
    contactPerson: latestText(data.contactPerson, data.contactName, mapped.contactPerson, mapped.contactName),
    contactName: latestText(data.contactName, data.contactPerson, mapped.contactName, mapped.contactPerson),
    contactMobile: latestText(data.contactMobile, data.phone, mapped.contactMobile, mapped.phone),
    contactPhone: latestText(data.contactPhone, data.phone, mapped.contactPhone, mapped.phone),
    phone: latestText(data.phone, data.contactMobile, data.contactPhone, mapped.phone, mapped.contactMobile, mapped.contactPhone),
    contactEmail: latestText(data.contactEmail, data.email, mapped.contactEmail, mapped.email),
    email: latestText(data.email, data.contactEmail, mapped.email, mapped.contactEmail),
    address: latestText(data.address, mapped.address),
    description: latestText(data.description, mapped.description),
    dealScore: latest(data.dealScore, mapped.dealScore, null),
    productCategory: latestText(data.productCategory, mapped.productCategory),
    consultantName: latestText(data.consultantName, mapped.consultantName),
    gstin: latestText(data.gstin, mapped.gstin),
    orderCustomerStatus: latestText(data.orderCustomerStatus, mapped.orderCustomerStatus),
    quotationCustomerStatus: latestText(data.quotationCustomerStatus, mapped.quotationCustomerStatus),
    customerReferenceDate: latestText(data.customerReferenceDate, data.customerRefDate, mapped.customerReferenceDate, mapped.customerRefDate),
    customerReferenceNumber: latestText(data.customerReferenceNumber, data.customerRefNo, mapped.customerReferenceNumber, mapped.customerRefNo),
    reasonForLostOrder: latestText(data.reasonForLostOrder, data.reasonForLost, mapped.reasonForLostOrder, mapped.reasonForLost),
    reasonForLost: latestText(data.reasonForLost, data.reasonForLostOrder, mapped.reasonForLost, mapped.reasonForLostOrder),
    linkedAccountName,
    linkedAccountNumber,
  }
}

const mapDeals = async (records = []) => Promise.all(records.map(normalizeMappedDeal))

const buildSearchFilter = (searchTerm) => {
  const trimmedSearch = String(searchTerm || '').trim()
  if (!trimmedSearch) return {}

  const pattern = regexSearch(trimmedSearch)
  return {
    $or: [
      { title: pattern },
      { customerName: pattern },
      { dealNumber: pattern },
      { accountName: pattern },
      { linkedAccountName: pattern },
      { 'data.dealNumber': pattern },
      { 'data.accountName': pattern },
      { 'data.projectName': pattern },
      { 'data.customerName': pattern },
    ],
  }
}

const sortFromFilters = (filters = {}) => {
  const sortBy = String(filters.sortBy || '').trim()
  const direction = String(filters.sortDir || '').trim().toLowerCase() === 'asc' ? 1 : -1
  const sortableFields = {
    amount: 'amount',
    createdAt: 'createdAt',
    customerName: 'customerName',
    expectedCloseDate: 'expectedCloseDate',
    stage: 'stage',
    title: 'title',
    updatedAt: 'updatedAt',
  }

  return {
    [sortableFields[sortBy] || 'updatedAt']: direction,
    legacyId: -1,
  }
}

const listWithFilters = async (actor, filters = {}, { companyWide = false, scopeUserIds = null } = {}) => {
  const ownerUserId = toNumberOrNull(filters.ownerUserId ?? filters.owner_id ?? filters.ownerId)
  const coOwnerId = toNumberOrNull(filters.coOwnerId ?? filters.co_owner_id ?? filters.coOwnerUserId)
  const ownerName = String(filters.ownerName ?? filters.owner_name ?? '').trim()
  const stage = String(filters.stage || '').trim()
  const page = Math.max(1, Number.parseInt(String(filters.page || '1'), 10) || 1)
  const limit = Math.min(250, Math.max(1, Number.parseInt(String(filters.limit || '100'), 10) || 100))

  const filter = mergeFilters(
    buildScopedMongoFilter({
      actor,
      ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
      companyWide,
      scopeUserIds,
    }),
    buildSearchFilter(filters.search ?? filters.q),
    ownerUserId === null ? {} : { ownerUserId },
    stage ? { stage } : {},
    ownerName ? { $or: [{ 'data.ownerName': ownerName }, { 'data.dealOwner': ownerName }, { ownerName }] } : {},
    coOwnerId === null ? {} : {
      $or: [
        { 'data.coOwnerId': String(coOwnerId) },
        { 'data.co_owner_id': String(coOwnerId) },
        { 'data.coOwnerIds': String(coOwnerId) },
        { 'data.co_owner_ids': String(coOwnerId) },
      ],
    }
  )

  const records = await Deal
    .find(filter)
    .sort(sortFromFilters(filters))
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return mapDeals(records)
}

const findById = async (id) => {
  const record = await Deal.findOne(byLegacyId(id)).lean()
  return normalizeMappedDeal(record)
}

const findByIdForActor = async (id, actor, { companyWide = false, scopeUserIds = null } = {}) => {
  const filter = mergeFilters(
    byLegacyId(id),
    buildScopedMongoFilter({
      actor,
      ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
      companyWide,
      scopeUserIds,
    })
  )

  const record = await Deal.findOne(filter).lean()
  return normalizeMappedDeal(record)
}

const findConvertedFromAccount = async (accountId, actor, { companyWide = false, scopeUserIds = null } = {}) => {
  const normalizedAccountId = toNumberOrNull(accountId)
  if (normalizedAccountId === null) {
    return null
  }

  const filter = mergeFilters(
    { accountId: normalizedAccountId },
    {
      $or: [
        { 'data.conversionSource': 'search-account' },
        { 'data.convertedFromAccount': true },
        { 'data.convertedFromAccount': 'true' },
        { conversionSource: 'search-account' },
        { convertedFromAccount: true },
        { convertedFromAccount: 'true' },
      ],
    },
    buildScopedMongoFilter({
      actor,
      ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
      companyWide,
      scopeUserIds,
    })
  )

  const record = await Deal.findOne(filter).sort({ createdAt: -1, legacyId: -1 }).lean()
  return normalizeMappedDeal(record)
}

const findDuplicate = async ({ title, accountId = null, customerName = null } = {}, { excludeId = null, companyId = null } = {}) => {
  const trimmedTitle = String(title || '').trim()
  if (!trimmedTitle) {
    return null
  }

  const normalizedAccountId = toNumberOrNull(accountId)
  const normalizedCompanyId = toNumberOrNull(companyId)
  const filter = {
    title: new RegExp(`^${trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    accountId: normalizedAccountId,
    customerName: new RegExp(`^${String(customerName || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'),
    ...(normalizedCompanyId === null ? {} : { companyId: normalizedCompanyId }),
  }

  const normalizedExcludeId = toNumberOrNull(excludeId)
  if (normalizedExcludeId !== null) {
    filter.legacyId = { $ne: normalizedExcludeId }
  } else if (excludeId) {
    filter._id = { $ne: excludeId }
  }

  const record = await Deal.findOne(filter).sort({ legacyId: -1 }).lean()
  return baseRepository.map(record)
}

const getNextDealSequence = async (companyId = null) => {
  const normalizedCompanyId = toNumberOrNull(companyId)
  const records = await Deal.find(normalizedCompanyId === null ? {} : { companyId: normalizedCompanyId })
    .select({ dealNumber: 1, data: 1 })
    .lean()

  const maxSequence = records.reduce((maxValue, record) => {
    const rawNumber = record.dealNumber || record.data?.dealNumber || record.data?.deal_number || ''
    const sequence = Number.parseInt(String(rawNumber).replace(/\D/gu, ''), 10)
    return Number.isFinite(sequence) ? Math.max(maxValue, sequence) : maxValue
  }, 0)

  return maxSequence + 1
}

module.exports = {
  ...baseRepository,
  getNextDealSequence,
  create: async (payload) => {
    const created = await baseRepository.create(payload)
    return findById(created.id)
  },
  update: async (id, payload) => {
    const updated = await baseRepository.update(id, payload)
    return updated?.id ? findById(updated.id) : null
  },
  findById,
  findByIdForActor,
  findConvertedFromAccount,
  findDuplicate,
  listWithFilters,
}
