const dealRepository = require('../repositories/dealRepository')
const convertedDealRepository = require('../repositories/convertedDealRepository')
const { createCrudService } = require('./crudServiceFactory')
const { AppError } = require('../utils/appError')
const { getSocketServer } = require('../socket/socketServer')
const { resolveCrmGroupScope } = require('../security/crmGroupScope')
const { asOptionalInteger, asOptionalNumber, asTrimmedStringOrNull } = require('../utils/requestPayload')
const { dealCreate, dealUpdate } = require('../validation/schemas')

const pickFirstDefined = (...values) => values.find((value) => value !== undefined)

const buildDealData = (body = {}, existing = null) => {
  const data = { ...(existing?.data || {}), ...body }

  if (data.conversionSource === 'search-account' || data.convertedFromAccount === true || data.convertedFromAccount === 'true') {
    delete data.accountName
    delete data.accountNumber
    delete data.linkedAccountName
    delete data.linkedAccountNumber
    delete data.companyName
    delete data.companyProfile
  }

  return data
}

const buildPayload = (body = {}, actor, existing) => {
  const title = asTrimmedStringOrNull(pickFirstDefined(body.title, body.name, body.dealName, existing?.title)) || 'Untitled Deal'
  const amount = asOptionalNumber(pickFirstDefined(body.amount, body.value, body.dealValue, existing?.amount, existing?.value, existing?.dealValue))
  const probability = asOptionalInteger(pickFirstDefined(body.probability, existing?.probability))
  const dealNumber = asTrimmedStringOrNull(pickFirstDefined(body.dealNumber, existing?.dealNumber, existing?.data?.dealNumber))
  const expectedCloseDate = asTrimmedStringOrNull(
    pickFirstDefined(
      body.expectedCloseDate,
      body.expectedClosureDate,
      body.closeDate,
      existing?.expectedCloseDate
    )
  )
  const ownerUserId = asOptionalInteger(
    pickFirstDefined(
      body.ownerUserId,
      body.ownerId,
      body.assignedTo,
      body.assignedUserId,
      existing?.ownerUserId,
      existing?.assignedTo,
      actor.role === 'user' ? actor.id : null
    )
  )
  const assignedTo = asOptionalInteger(
    pickFirstDefined(
      body.assignedTo,
      body.assignedUserId,
      body.ownerUserId,
      existing?.assignedTo,
      existing?.ownerUserId,
      actor.role === 'user' ? actor.id : null
    )
  )

  return {
    title,
    ...(dealNumber ? { dealNumber } : {}),
    customerName: asTrimmedStringOrNull(pickFirstDefined(body.customerName, existing?.customerName)),
    accountId: asOptionalInteger(pickFirstDefined(body.accountId, body.account_id, existing?.accountId)),
    amount,
    value: amount,
    dealValue: amount,
    currency: asTrimmedStringOrNull(pickFirstDefined(body.currency, existing?.currency)) || 'INR',
    stage: asTrimmedStringOrNull(pickFirstDefined(body.stage, body.status, existing?.stage)) || 'new',
    status: asTrimmedStringOrNull(pickFirstDefined(body.status, body.stage, existing?.status, existing?.stage)) || 'new',
    probability: probability === null ? null : Math.max(0, Math.min(100, probability)),
    expectedCloseDate,
    expectedClosureDate: expectedCloseDate,
    closeDate: expectedCloseDate,
    actualClosureDate: asTrimmedStringOrNull(pickFirstDefined(body.actualClosureDate, existing?.actualClosureDate)),
    assignedTo,
    ownerUserId,
    createdBy: existing?.createdBy ?? actor.id,
    notes: asTrimmedStringOrNull(pickFirstDefined(body.notes, existing?.notes)) || '',
    dealDate: asTrimmedStringOrNull(pickFirstDefined(body.dealDate, existing?.dealDate)),
    dealType: asTrimmedStringOrNull(pickFirstDefined(body.dealType, existing?.dealType)),
    dealSource: asTrimmedStringOrNull(pickFirstDefined(body.dealSource, body.source, existing?.dealSource, existing?.source)),
    source: asTrimmedStringOrNull(pickFirstDefined(body.source, body.dealSource, existing?.source, existing?.dealSource)),
    dealSubsource: asTrimmedStringOrNull(pickFirstDefined(body.dealSubsource, body.subsource, existing?.dealSubsource, existing?.subsource)),
    subsource: asTrimmedStringOrNull(pickFirstDefined(body.subsource, body.dealSubsource, existing?.subsource, existing?.dealSubsource)),
    projectName: asTrimmedStringOrNull(pickFirstDefined(body.projectName, existing?.projectName)),
    projectStatus: asTrimmedStringOrNull(pickFirstDefined(body.projectStatus, existing?.projectStatus)),
    poValue: asOptionalNumber(pickFirstDefined(body.poValue, existing?.poValue)),
    jobNo: asTrimmedStringOrNull(pickFirstDefined(body.jobNo, existing?.jobNo)),
    contactPerson: asTrimmedStringOrNull(pickFirstDefined(body.contactPerson, body.contactName, existing?.contactPerson, existing?.contactName)),
    contactName: asTrimmedStringOrNull(pickFirstDefined(body.contactName, body.contactPerson, existing?.contactName, existing?.contactPerson)),
    contactMobile: asTrimmedStringOrNull(pickFirstDefined(body.contactMobile, body.phone, existing?.contactMobile, existing?.phone)),
    contactPhone: asTrimmedStringOrNull(pickFirstDefined(body.contactPhone, body.phone, existing?.contactPhone, existing?.phone)),
    phone: asTrimmedStringOrNull(pickFirstDefined(body.phone, body.contactMobile, body.contactPhone, existing?.phone, existing?.contactMobile, existing?.contactPhone)),
    contactEmail: asTrimmedStringOrNull(pickFirstDefined(body.contactEmail, body.email, existing?.contactEmail, existing?.email)),
    email: asTrimmedStringOrNull(pickFirstDefined(body.email, body.contactEmail, existing?.email, existing?.contactEmail)),
    address: asTrimmedStringOrNull(pickFirstDefined(body.address, existing?.address)),
    description: asTrimmedStringOrNull(pickFirstDefined(body.description, existing?.description)),
    dealScore: asOptionalNumber(pickFirstDefined(body.dealScore, existing?.dealScore)),
    productCategory: asTrimmedStringOrNull(pickFirstDefined(body.productCategory, existing?.productCategory)),
    consultantName: asTrimmedStringOrNull(pickFirstDefined(body.consultantName, existing?.consultantName)),
    gstin: asTrimmedStringOrNull(pickFirstDefined(body.gstin, existing?.gstin)),
    orderCustomerStatus: asTrimmedStringOrNull(pickFirstDefined(body.orderCustomerStatus, existing?.orderCustomerStatus)),
    quotationCustomerStatus: asTrimmedStringOrNull(pickFirstDefined(body.quotationCustomerStatus, existing?.quotationCustomerStatus)),
    customerReferenceDate: asTrimmedStringOrNull(pickFirstDefined(body.customerReferenceDate, body.customerRefDate, existing?.customerReferenceDate, existing?.customerRefDate)),
    customerReferenceNumber: asTrimmedStringOrNull(pickFirstDefined(body.customerReferenceNumber, body.customerRefNo, existing?.customerReferenceNumber, existing?.customerRefNo)),
    reasonForLostOrder: asTrimmedStringOrNull(pickFirstDefined(body.reasonForLostOrder, body.reasonForLost, existing?.reasonForLostOrder, existing?.reasonForLost)),
    reasonForLost: asTrimmedStringOrNull(pickFirstDefined(body.reasonForLost, body.reasonForLostOrder, existing?.reasonForLost, existing?.reasonForLostOrder)),
    data: buildDealData(body, existing),
  }
}

const isConvertedAccountPayload = (payload = {}) => (
  payload.accountId
  && (
    payload.data?.conversionSource === 'search-account'
    || payload.data?.convertedFromAccount === true
    || payload.data?.convertedFromAccount === 'true'
  )
)

const baseService = createCrudService({
  repository: dealRepository,
  entityLabel: 'Deal',
  entityType: 'deal',
  buildPayload,
})

const ensureUniqueDeal = async (actor, payload, excludeId = null) => {
  const duplicate = await dealRepository.findDuplicate(payload, {
    excludeId,
    companyId: actor?.companyId ?? null,
  })

  if (duplicate) {
    throw new AppError('A deal with the same title already exists for this account or customer.', 409)
  }
}

const normalizeComparable = (value) => String(value ?? '').trim().toLowerCase()

const shouldCheckDuplicateOnUpdate = (existing = {}, body = {}) => {
  const fields = [
    ['title', 'title'],
    ['customerName', 'customerName'],
    ['accountId', 'accountId'],
  ]

  return fields.some(([bodyField, existingField]) => (
    Object.prototype.hasOwnProperty.call(body, bodyField)
    && normalizeComparable(body[bodyField]) !== normalizeComparable(existing[existingField])
  ))
}

const emitConvertedDealRealtime = (action, convertedDeal, actor) => {
  const socketServer = getSocketServer()
  if (!socketServer || !convertedDeal) return

  const payload = {
    action,
    record: convertedDeal,
    recordId: convertedDeal.id,
    entityType: 'converted-deal',
    actor: { id: actor.id, name: actor.name, role: actor.role },
  }

  socketServer.emitToAdmins(`converted-deal:${action}`, payload)
  const assignedUserId = convertedDeal.assignedTo || convertedDeal.ownerUserId || convertedDeal.createdBy
  if (assignedUserId) {
    socketServer.emitToUser(assignedUserId, `converted-deal:${action}`, payload)
  }
}

module.exports = {
  ...baseService,
  validation: {
    create: dealCreate,
    update: dealUpdate,
  },
  list: async (actor, filters = {}) => {
    const scope = await resolveCrmGroupScope(actor)
    return dealRepository.listWithFilters(scope.actor, filters, scope.queryOptions)
  },
  getConvertedFromAccount: async (actor, accountId) => {
    const scope = await resolveCrmGroupScope(actor)
    return dealRepository.findConvertedFromAccount(accountId, scope.actor, scope.queryOptions)
  },
  create: async (actor, body = {}) => {
    // Auto-generate deal number server-side when not provided
    const enhancedBody = { ...body }
    try {
      const existingDealNumber = body.dealNumber || null
      if (!existingDealNumber) {
        const seq = await dealRepository.getNextDealSequence(actor?.companyId ?? null)
        enhancedBody.dealNumber = `DL${String(seq).padStart(5, '0')}`
      }
    } catch (err) {
      // If sequence generation fails, continue without blocking creation
    }

    const payload = buildPayload(enhancedBody, actor, null)
    if (isConvertedAccountPayload(payload)) {
      const scope = await resolveCrmGroupScope(actor)
      const existingConvertedDeal = await dealRepository.findConvertedFromAccount(payload.accountId, scope.actor, scope.queryOptions)
      if (existingConvertedDeal) {
        return existingConvertedDeal
      }
    }

    await ensureUniqueDeal(actor, payload)
    const createdDeal = await baseService.create(actor, enhancedBody)

    if (isConvertedAccountPayload(createdDeal)) {
      const convertedDeal = await convertedDealRepository.syncFromDeal(createdDeal)
      emitConvertedDealRealtime('created', convertedDeal, actor)
    }

    return createdDeal
  },
  update: async (actor, id, body = {}) => {
    const existing = await baseService.get(actor, id)
    if (shouldCheckDuplicateOnUpdate(existing, body)) {
      await ensureUniqueDeal(actor, buildPayload(body, actor, existing), existing.id)
    }
    
    // Auto-generate deal number for existing deals if they don't have one
    const enhancedBody = { ...body }
    const existingDealNumber = existing.dealNumber || (existing.data?.dealNumber)
    if (!existingDealNumber && !enhancedBody.dealNumber) {
      try {
        const seq = await dealRepository.getNextDealSequence(actor?.companyId ?? null)
        enhancedBody.dealNumber = `DL${String(seq).padStart(5, '0')}`
      } catch (err) {
        // If sequence generation fails, continue without blocking update
      }
    }
    const updatedDeal = await baseService.update(actor, id, enhancedBody)

    if (isConvertedAccountPayload(updatedDeal) || isConvertedAccountPayload(existing)) {
      const convertedDeal = await convertedDealRepository.syncFromDeal(updatedDeal)
      emitConvertedDealRealtime('updated', convertedDeal, actor)
    }

    return updatedDeal
  },
}
