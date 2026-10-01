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

const normalizeDealCityForFilter = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  if (normalizedValue === 'ahmedabad' || normalizedValue === 'ahmadabad') return 'ahmadabad'
  if (normalizedValue === 'baroda' || normalizedValue === 'vadodara') return 'vadodara'
  return String(value || '').trim()
}

const normalizeMappedConvertedDeal = (record) => {
  const mapped = baseRepository.map(record)
  if (!mapped) return null
  const data = mapped.data && typeof mapped.data === 'object' ? mapped.data : {}

  return {
    ...mapped,
    accountName: mapped.accountName || mapped.linkedAccountName || data.accountName || data.linkedAccountName || '',
    accountNumber: mapped.accountNumber || mapped.linkedAccountNumber || data.accountNumber || data.linkedAccountNumber || '',
    linkedAccountName: mapped.linkedAccountName || mapped.accountName || data.linkedAccountName || data.accountName || '',
    linkedAccountNumber: mapped.linkedAccountNumber || mapped.accountNumber || data.linkedAccountNumber || data.accountNumber || '',
    customerName: mapped.customerName || data.customerName || '',
    customerNumber: mapped.customerNumber || data.customerNumber || data.customer_number || '',
    companyName: mapped.companyName || data.companyName || mapped.accountName || data.accountName || mapped.customerName || data.customerName || '',
    companyProfile: mapped.companyProfile || data.companyProfile || data.company || '',
    companyLogo: mapped.companyLogo || data.companyLogo || '',
    projectName: mapped.projectName || data.projectName || data.project_name || mapped.title || data.title || data.name || '',
    city: normalizeDealCityForFilter(mapped.city || mapped.location || data.city || data.location || data.branchLocation || data.projectLocation || ''),
    location: mapped.location || mapped.city || data.location || data.city || data.branchLocation || data.projectLocation || '',
    contactPerson: mapped.contactPerson || mapped.contactName || data.contactPerson || data.contactName || '',
    contactName: mapped.contactName || mapped.contactPerson || data.contactName || data.contactPerson || '',
    contactMobile: mapped.contactMobile || mapped.phone || data.contactMobile || data.phone || '',
    contactPhone: mapped.contactPhone || mapped.phone || data.contactPhone || data.phone || '',
    phone: mapped.phone || mapped.contactMobile || mapped.contactPhone || data.phone || data.contactMobile || data.contactPhone || '',
    contactEmail: mapped.contactEmail || mapped.email || data.contactEmail || data.email || '',
    email: mapped.email || mapped.contactEmail || data.email || data.contactEmail || '',
    address: mapped.address || data.address || '',
    sourceDealTitle: mapped.sourceDealTitle || mapped.title || data.title || data.name || '',
    sourceDealNumber: mapped.sourceDealNumber || mapped.dealNumber || data.dealNumber || '',
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
  const rawLimit = String(filters.limit ?? '').trim().toLowerCase()
  const shouldReturnAll = !rawLimit || ['all', '0', '-1'].includes(rawLimit)
  const page = Math.max(1, Number.parseInt(String(filters.page || '1'), 10) || 1)
  const limit = shouldReturnAll
    ? 0
    : Math.min(5000, Math.max(1, Number.parseInt(rawLimit, 10) || 5000))

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

  let query = ConvertedDeal
    .find(filter)
    .sort({ convertedAt: -1, legacyId: -1 })

  if (limit > 0) {
    query = query.skip((page - 1) * limit).limit(limit)
  }

  const records = await query.lean()

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
  const rawCity = mappedDeal.city || mappedDeal.location || data.city || data.location || data.branchLocation || data.projectLocation || ''
  const city = normalizeDealCityForFilter(rawCity)
  const projectName = mappedDeal.projectName || data.projectName || data.project_name || mappedDeal.title || mappedDeal.name || ''

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
    customerNumber: mappedDeal.customerNumber || data.customerNumber || data.customer_number || '',
    companyName: mappedDeal.companyName || data.companyName || accountName || customerName,
    companyProfile: mappedDeal.companyProfile || data.companyProfile || data.company || '',
    companyLogo: mappedDeal.companyLogo || data.companyLogo || '',
    amount: mappedDeal.amount ?? data.amount ?? data.value ?? null,
    currency: mappedDeal.currency || data.currency || 'INR',
    stage: mappedDeal.stage || data.stage || 'converted',
    status: mappedDeal.status || data.status || mappedDeal.stage || 'converted',
    ownerName,
    projectName,
    city,
    location: mappedDeal.location || mappedDeal.city || data.location || data.city || rawCity || city,
    contactPerson: mappedDeal.contactPerson || mappedDeal.contactName || data.contactPerson || data.contactName || '',
    contactName: mappedDeal.contactName || mappedDeal.contactPerson || data.contactName || data.contactPerson || '',
    contactMobile: mappedDeal.contactMobile || mappedDeal.phone || data.contactMobile || data.phone || '',
    contactPhone: mappedDeal.contactPhone || mappedDeal.phone || data.contactPhone || data.phone || '',
    phone: mappedDeal.phone || mappedDeal.contactMobile || mappedDeal.contactPhone || data.phone || data.contactMobile || data.contactPhone || '',
    contactEmail: mappedDeal.contactEmail || mappedDeal.email || data.contactEmail || data.email || '',
    email: mappedDeal.email || mappedDeal.contactEmail || data.email || data.contactEmail || '',
    address: mappedDeal.address || data.address || '',
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
      customerNumber: mappedDeal.customerNumber || data.customerNumber || data.customer_number || '',
      companyName: mappedDeal.companyName || data.companyName || accountName || customerName,
      companyProfile: mappedDeal.companyProfile || data.companyProfile || data.company || '',
      companyLogo: mappedDeal.companyLogo || data.companyLogo || '',
      projectName,
      city,
      location: mappedDeal.location || mappedDeal.city || data.location || data.city || rawCity || city,
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
