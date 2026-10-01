const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
const { toNumberOrNull } = require('../security/accessScope')
const { mapMongoDocument } = require('../utils/mongoRecordMapper')
const { createCrudRepository } = require('./crudRepositoryFactory')
const { buildScopedMongoFilter, byLegacyId, mergeFilters, regexSearch } = require('./mongoQueryHelpers')

const baseRepository = createCrudRepository({
  table: 'converted_deals',
  ownerColumn: 'owner_user_id',
})

const ConvertedDeal = getMongoModel('converted_deals')
const Deal = getMongoModel('deals')
const Lead = getMongoModel('leads')
const User = getMongoModel('users')

const normalizeMappedConvertedDeal = (record) => {
  const mapped = baseRepository.map(record)
  if (!mapped) return null

  return {
    ...mapped,
    accountName: mapped.accountName || mapped.linkedAccountName || '',
    linkedAccountName: mapped.linkedAccountName || mapped.accountName || '',
    linkedAccountNumber: mapped.linkedAccountNumber || mapped.accountNumber || '',
    sourceDealTitle: mapped.sourceDealTitle || mapped.title || '',
    sourceDealNumber: mapped.sourceDealNumber || mapped.dealNumber || '',
    isConvertedDeal: true,
    recordType: 'convertedDeal',
    sourceType: 'convertedDeal',
  }
}

const isConvertedDealDocument = (deal = {}) => {
  const data = deal.data && typeof deal.data === 'object' ? deal.data : {}
  return Boolean(
    deal.accountId
    && (
      data.conversionSource === 'search-account'
      || data.convertedFromAccount === true
      || data.convertedFromAccount === 'true'
      || deal.conversionSource === 'search-account'
      || deal.convertedFromAccount === true
      || deal.convertedFromAccount === 'true'
    )
  )
}

const buildSearchFilter = (searchTerm) => {
  const trimmedSearch = String(searchTerm || '').trim()
  if (!trimmedSearch) return {}

  const pattern = regexSearch(trimmedSearch)
  return {
    $or: [
      { title: pattern },
      { dealNumber: pattern },
      { accountName: pattern },
      { linkedAccountName: pattern },
      { customerName: pattern },
      { ownerName: pattern },
      { sourceDealTitle: pattern },
      { sourceDealNumber: pattern },
      { 'data.dealNumber': pattern },
      { 'data.accountName': pattern },
      { 'data.customerName': pattern },
    ],
  }
}

const listWithFilters = async (actor, filters = {}, { companyWide = false, scopeUserIds = null } = {}) => {
  const accountId = toNumberOrNull(filters.accountId ?? filters.account_id)
  const status = String(filters.status || '').trim()
  const owner = String(filters.owner || filters.ownerName || '').trim()
  const date = String(filters.date || '').trim()
  const convertedDate = String(filters.convertedDate || filters.converted_at || '').trim()
  const page = Math.max(1, Number.parseInt(String(filters.page || '1'), 10) || 1)
  const limit = Math.min(250, Math.max(1, Number.parseInt(String(filters.limit || '100'), 10) || 100))

  const buildDayRangeFilter = (field, value) => {
    if (!value) return {}
    const start = new Date(`${value}T00:00:00.000Z`)
    const end = new Date(`${value}T23:59:59.999Z`)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return {}
    return { [field]: { $gte: start, $lte: end } }
  }

  const filter = mergeFilters(
    buildScopedMongoFilter({
      actor,
      ownerFields: ['ownerUserId', 'assignedTo', 'createdBy', 'owner_user_id', 'assigned_to', 'created_by'],
      companyWide,
      scopeUserIds,
    }),
    buildSearchFilter(filters.search ?? filters.q),
    accountId === null ? {} : { accountId },
    status && status !== 'all' ? { $or: [{ status }, { stage: status }] } : {},
    owner ? { ownerName: new RegExp(owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') } : {},
    buildDayRangeFilter('createdAt', date),
    buildDayRangeFilter('convertedAt', convertedDate)
  )

  const records = await ConvertedDeal
    .find(filter)
    .sort({ convertedAt: -1, legacyId: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean()

  return records.map(normalizeMappedConvertedDeal)
}

const findExistingConversion = async ({ accountId = null, sourceDealId = null } = {}, { companyId = null } = {}) => {
  const normalizedAccountId = toNumberOrNull(accountId)
  const normalizedSourceDealId = toNumberOrNull(sourceDealId)

  if (normalizedAccountId === null && normalizedSourceDealId === null) {
    return null
  }

  const filter = {
    ...(normalizedSourceDealId !== null ? { sourceDealId: normalizedSourceDealId } : { accountId: normalizedAccountId }),
    ...(companyId !== null && companyId !== undefined ? { companyId: toNumberOrNull(companyId) } : {}),
  }

  const record = await ConvertedDeal.findOne(filter).sort({ legacyId: -1 }).lean()
  return normalizeMappedConvertedDeal(record)
}

const findById = async (id) => {
  const record = await ConvertedDeal.findOne(byLegacyId(id)).lean()
  return normalizeMappedConvertedDeal(record)
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

  const record = await ConvertedDeal.findOne(filter).lean()
  return normalizeMappedConvertedDeal(record)
}

const resolveAccountSnapshot = async (accountId) => {
  const normalizedAccountId = toNumberOrNull(accountId)
  if (normalizedAccountId === null) return null

  const account = await Lead.findOne(byLegacyId(normalizedAccountId)).lean()
  if (!account) return null

  const formData = account.formData && typeof account.formData === 'object' ? account.formData : {}
  return {
    accountName: formData.accountName || account.customerName || account.company || '',
    accountNumber: formData.accountNumber || formData.accountNo || account.accountNo || '',
    customerName: account.customerName || formData.customerName || formData.accountName || '',
    ownerName: formData.accountOwner || account.ownerName || '',
    customerId: formData.customerId || account.customerId || null,
  }
}

const resolveOwnerName = async (deal = {}) => {
  const data = deal.data && typeof deal.data === 'object' ? deal.data : {}
  const directOwnerName = data.ownerName || data.dealOwner || deal.ownerName || ''
  if (directOwnerName) return directOwnerName

  const ownerId = toNumberOrNull(deal.ownerUserId ?? deal.assignedTo)
  if (ownerId === null) return ''

  const owner = await User.findOne(byLegacyId(ownerId)).lean()
  return owner?.name || owner?.username || ''
}

const buildConvertedDealPayload = async (deal) => {
  const mappedDeal = mapMongoDocument(deal)
  if (!mappedDeal || !isConvertedDealDocument(mappedDeal)) {
    return null
  }

  const data = mappedDeal.data && typeof mappedDeal.data === 'object' ? mappedDeal.data : {}
  const accountSnapshot = await resolveAccountSnapshot(mappedDeal.accountId)
  const resolvedDealOwnerName = await resolveOwnerName(mappedDeal)
  const accountName = data.accountName || accountSnapshot?.accountName || mappedDeal.accountName || ''
  const customerName = mappedDeal.customerName || data.customerName || accountSnapshot?.customerName || accountName
  const dealNumber = mappedDeal.dealNumber || data.dealNumber || data.deal_number || ''
  const ownerName = accountSnapshot?.ownerName || resolvedDealOwnerName

  return {
    title: mappedDeal.title || mappedDeal.name || '',
    dealNumber,
    accountId: toNumberOrNull(mappedDeal.accountId),
    dealId: toNumberOrNull(mappedDeal.id),
    sourceDealId: toNumberOrNull(mappedDeal.id),
    customerId: toNumberOrNull(mappedDeal.customerId || data.customerId || accountSnapshot?.customerId),
    accountName,
    linkedAccountName: accountName,
    linkedAccountNumber: accountSnapshot?.accountNumber || data.accountNumber || '',
    customerName,
    amount: mappedDeal.amount ?? data.amount ?? data.value ?? null,
    currency: mappedDeal.currency || data.currency || 'INR',
    stage: mappedDeal.stage || data.stage || 'converted',
    status: mappedDeal.status || data.status || mappedDeal.stage || 'converted',
    ownerName,
    convertedAt: mappedDeal.convertedAt || data.convertedAt || mappedDeal.createdAt || new Date(),
    assignedTo: toNumberOrNull(mappedDeal.assignedTo),
    createdBy: toNumberOrNull(mappedDeal.createdBy),
    ownerUserId: toNumberOrNull(mappedDeal.ownerUserId),
    companyId: toNumberOrNull(mappedDeal.companyId) || 1,
    projectId: toNumberOrNull(mappedDeal.projectId),
    workflowId: toNumberOrNull(mappedDeal.workflowId),
    notes: mappedDeal.notes || '',
    data: {
      ...data,
      sourceDealId: toNumberOrNull(mappedDeal.id),
      dealId: toNumberOrNull(mappedDeal.id),
      accountId: toNumberOrNull(mappedDeal.accountId),
      customerId: toNumberOrNull(mappedDeal.customerId || data.customerId || accountSnapshot?.customerId),
      accountName,
      customerName,
      convertedFromAccount: true,
      conversionSource: 'search-account',
    },
  }
}

const upsertFromDeal = async (deal) => {
  const payload = await buildConvertedDealPayload(deal)
  if (!payload?.sourceDealId || !payload?.accountId) {
    return null
  }

  const legacyId = await getNextLegacyId('converted_deals')
  const record = await ConvertedDeal.findOneAndUpdate(
    {
      companyId: payload.companyId,
      sourceDealId: payload.sourceDealId,
    },
    {
      $set: payload,
      $setOnInsert: {
        legacyId,
        createdAt: payload.convertedAt || new Date(),
      },
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  ).lean()

  return normalizeMappedConvertedDeal(record)
}

const syncFromDeals = async ({ companyId = null, sourceDealId = null } = {}) => {
  const filters = [
    { accountId: { $ne: null } },
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
  ]

  if (companyId !== null && companyId !== undefined) {
    filters.push({ companyId: toNumberOrNull(companyId) })
  }

  if (sourceDealId !== null && sourceDealId !== undefined) {
    filters.push(byLegacyId(sourceDealId))
  }

  const deals = await Deal.find(mergeFilters(...filters)).lean()
  const convertedDeals = []

  for (const deal of deals) {
    const convertedDeal = await upsertFromDeal(deal)
    if (convertedDeal) {
      convertedDeals.push(convertedDeal)
    }
  }

  return convertedDeals
}

const syncFromDeal = async (deal = {}) => {
  const normalizedSourceDealId = toNumberOrNull(deal.id ?? deal.sourceDealId ?? deal.source_deal_id)
  if (normalizedSourceDealId === null) {
    return null
  }

  const sourceDeal = await Deal.findOne(byLegacyId(normalizedSourceDealId)).lean()
  return upsertFromDeal(sourceDeal || deal)
}

module.exports = {
  ...baseRepository,
  create: async (payload) => {
    const existing = await findExistingConversion(payload, { companyId: payload.companyId })
    if (existing) return existing

    const created = await baseRepository.create(payload)
    return created?.id ? findById(created.id) : null
  },
  update: async (id, payload) => {
    const updated = await baseRepository.update(id, payload)
    return updated?.id ? findById(updated.id) : null
  },
  findById,
  findByIdForActor,
  findExistingConversion,
  listWithFilters,
  syncFromDeal,
  syncFromDeals,
}
