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
    customerNumber: asTrimmedStringOrNull(pickFirstDefined(body.customerNumber, existing?.customerNumber, existing?.data?.customerNumber)),
    accountId: asOptionalInteger(pickFirstDefined(body.accountId, body.account_id, existing?.accountId)),
    accountName: asTrimmedStringOrNull(pickFirstDefined(body.accountName, existing?.accountName, existing?.data?.accountName)),
    accountNumber: asTrimmedStringOrNull(pickFirstDefined(body.accountNumber, existing?.accountNumber, existing?.data?.accountNumber)),
    linkedAccountName: asTrimmedStringOrNull(pickFirstDefined(body.linkedAccountName, body.accountName, existing?.linkedAccountName, existing?.accountName, existing?.data?.linkedAccountName, existing?.data?.accountName)),
    linkedAccountNumber: asTrimmedStringOrNull(pickFirstDefined(body.linkedAccountNumber, body.accountNumber, existing?.linkedAccountNumber, existing?.accountNumber, existing?.data?.linkedAccountNumber, existing?.data?.accountNumber)),
    companyName: asTrimmedStringOrNull(pickFirstDefined(body.companyName, existing?.companyName, existing?.data?.companyName)),
    companyProfile: asTrimmedStringOrNull(pickFirstDefined(body.companyProfile, existing?.companyProfile, existing?.data?.companyProfile)),
    companyLogo: asTrimmedStringOrNull(pickFirstDefined(body.companyLogo, existing?.companyLogo, existing?.data?.companyLogo)),
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
    city: asTrimmedStringOrNull(pickFirstDefined(body.city, body.location, existing?.city, existing?.location, existing?.data?.city, existing?.data?.location)),
    location: asTrimmedStringOrNull(pickFirstDefined(body.location, body.city, existing?.location, existing?.city, existing?.data?.location, existing?.data?.city)),
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

const isConvertedDealRecord = (deal = {}) => {
  if (!deal) return false
  const data = deal.data && typeof deal.data === 'object' ? deal.data : {}
  return Boolean(
    isConvertedAccountPayload(deal)
    || deal.status === 'converted'
    || deal.stage === 'converted'
    || data.status === 'converted'
    || data.stage === 'converted'
  )
}

const { isPrivilegedRole } = require('../security/accessScope')

const baseService = createCrudService({
  repository: dealRepository,
  entityLabel: 'Deal',
  entityType: 'deal',
  buildPayload,
  customScopeBypass: (actor) => {
    return isPrivilegedRole(actor.role) || (actor.email && actor.email.toLowerCase() === 'keval@swatiswitchgears.com')
  }
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

const applyStrictIsolation = (actor) => {
  const email = String(actor?.email || '').toLowerCase().trim()
  if (email === 'keval@swatiswitchgears.com') return { ...actor, role: 'admin' }
  return { ...actor, role: 'user' }
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
  get: (actor, id) => baseService.get(actor, id),
  search: (actor, query) => baseService.search(actor, query),
  validation: {
    create: dealCreate,
    update: dealUpdate,
  },
  list: async (actor, filters = {}) => {
    const scope = await resolveCrmGroupScope(actor)
    return dealRepository.listWithFilters(scope.actor, filters, { companyWide: true, ...scope.queryOptions })
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
    if (isConvertedDealRecord(payload)) {
      const scope = await resolveCrmGroupScope(actor)
      const existingConvertedDeal = await dealRepository.findConvertedFromAccount(payload.accountId, scope.actor, scope.queryOptions)
      if (existingConvertedDeal) {
        return existingConvertedDeal
      }
    }

    const createdDeal = await baseService.create(actor, enhancedBody)

    if (isConvertedDealRecord(createdDeal)) {
      const convertedDeal = await convertedDealRepository.syncFromDeal(createdDeal)
      emitConvertedDealRealtime('created', convertedDeal, actor)
    }

    // Multi-Collection Sync to MongoDB customers collection
    try {
      const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
      const Customer = getMongoModel('customers')
      const custName = createdDeal.customerName || createdDeal.accountName || createdDeal.title || ''
      if (custName || createdDeal.accountId) {
        const existingCust = await Customer.findOne({
          $or: [
            ...(createdDeal.accountId ? [{ accountId: createdDeal.accountId }, { accountId: String(createdDeal.accountId) }] : []),
            ...(custName ? [{ customerName: custName }, { name: custName }] : [])
          ]
        }).lean()

        const targetCustStatus = createdDeal.stage || createdDeal.status || 'staged'
        if (existingCust) {
          await Customer.updateOne(
            { _id: existingCust._id },
            {
              $set: {
                customerStatus: targetCustStatus,
                status: targetCustStatus,
                poValue: createdDeal.poValue || 0,
                gstin: createdDeal.gstin || '',
                jobNo: createdDeal.jobNo || '',
                updatedAt: new Date().toISOString(),
                'data.customerStatus': targetCustStatus,
                'data.poValue': createdDeal.poValue || 0,
                'data.gstin': createdDeal.gstin || '',
                'data.jobNo': createdDeal.jobNo || '',
              }
            }
          ).catch(() => {})
        } else {
          const custLegacyId = await getNextLegacyId('customers')
          await Customer.create({
            legacyId: custLegacyId,
            name: custName || 'Deal Customer',
            customerName: custName || 'Deal Customer',
            customerNumber: `CUST-${custLegacyId < 1001 ? custLegacyId + 1000 : custLegacyId}`,
            accountId: createdDeal.accountId || null,
            customerStatus: targetCustStatus,
            status: targetCustStatus,
            customerOwner: createdDeal.dealOwner || createdDeal.ownerName || actor.name || '',
            poValue: createdDeal.poValue || 0,
            gstin: createdDeal.gstin || '',
            jobNo: createdDeal.jobNo || '',
            createdBy: actor.id,
            companyId: actor.companyId || 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            data: {
              accountId: createdDeal.accountId || null,
              customerStatus: targetCustStatus,
              poValue: createdDeal.poValue || 0,
              gstin: createdDeal.gstin || '',
              jobNo: createdDeal.jobNo || '',
            }
          }).catch(() => {})
        }
      }
    } catch (err) {
      console.warn('Customer sync warning on deal creation:', err.message)
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

    if (isConvertedDealRecord(updatedDeal) || isConvertedDealRecord(existing)) {
      const convertedDeal = await convertedDealRepository.syncFromDeal(updatedDeal)
      emitConvertedDealRealtime('updated', convertedDeal, actor)
    }

    // Multi-Collection Sync to MongoDB customers collection
    try {
      const { getMongoModel } = require('../models/mongoModels')
      const Customer = getMongoModel('customers')
      const custName = updatedDeal.customerName || updatedDeal.accountName || updatedDeal.title || ''
      if (custName || updatedDeal.accountId) {
        const targetCustStatus = updatedDeal.stage || updatedDeal.status || 'staged'
        await Customer.updateMany(
          {
            $or: [
              ...(updatedDeal.accountId ? [{ accountId: updatedDeal.accountId }, { accountId: String(updatedDeal.accountId) }] : []),
              ...(custName ? [{ customerName: custName }, { name: custName }] : [])
            ]
          },
          {
            $set: {
              customerStatus: targetCustStatus,
              status: targetCustStatus,
              poValue: updatedDeal.poValue || 0,
              gstin: updatedDeal.gstin || '',
              jobNo: updatedDeal.jobNo || '',
              updatedAt: new Date().toISOString(),
              'data.customerStatus': targetCustStatus,
              'data.poValue': updatedDeal.poValue || 0,
              'data.gstin': updatedDeal.gstin || '',
              'data.jobNo': updatedDeal.jobNo || '',
            }
          }
        ).catch(() => {})
      }
    } catch (err) {
      console.warn('Customer sync warning on deal update:', err.message)
    }

    return updatedDeal
  },
  bulkImportDeals: async (actor, deals = []) => {
    if (!Array.isArray(deals) || deals.length === 0) {
      return { count: 0 }
    }

    const { getMongoModel, getNextLegacyId } = require('../models/mongoModels')
    const Deal = getMongoModel('deals')
    const User = getMongoModel('users')

    const allUsers = await User.find({ frontendDeleted: { $ne: true } }).lean()
    const userByOwnerCode = new Map()
    const userByName = new Map()

    allUsers.forEach((u) => {
      const code = String(u.ownerCode || u.owner_code || u.employeeId || '').trim()
      if (code) userByOwnerCode.set(code, u)
      const name = String(u.name || u.username || '').trim().toLowerCase()
      if (name) userByName.set(name, u)
    })

    const cleanStr = (val) => {
      if (val === null || val === undefined) return ''
      const str = String(val).trim()
      if (str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return ''
      return str
    }

    const cleanNum = (val) => {
      if (val === null || val === undefined) return 0
      const num = Number(String(val).replace(/[^0-9.-]+/g, ''))
      return isNaN(num) ? 0 : num
    }

    let count = 0
    let duplicateCount = 0
    const Lead = getMongoModel('leads')
    const Account = getMongoModel('accounts')
    const Customer = getMongoModel('customers')

    for (const row of deals) {
      const rawOwner = cleanStr(row.dealOwner || row.ownerName || row.accountOwner || row.ownerCode)
      const ownerCodeMatch = userByOwnerCode.get(rawOwner)
      const ownerNameMatch = userByName.get(rawOwner.toLowerCase())
      const resolvedUser = ownerCodeMatch || ownerNameMatch || (actor.id ? allUsers.find((u) => u.id === actor.id || u.legacyId === actor.id) : null) || { id: actor.id || 1, name: rawOwner || actor.name || 'Jay Pandya', ownerCode: '1004' }

      const resolvedUserId = resolvedUser.legacyId ?? resolvedUser.id ?? 1
      const resolvedUserName = resolvedUser.name || resolvedUser.username || rawOwner || 'Jay Pandya'

      const unifiedName = cleanStr(row.projectName || row.dealName || row.name || row.title || 'General Enquiry')
      const dealName = unifiedName
      const projectName = unifiedName
      const unifiedAccountCustomerName = cleanStr(row.accountName || row.customerName || row.companyName || row.company)
      const customerName = unifiedAccountCustomerName
      const accountName = unifiedAccountCustomerName
      const companyName = unifiedAccountCustomerName

      const targetColl = cleanStr(row.targetCollection || row.sheetName || 'deals').toLowerCase()

      const customerCategory = cleanStr(row.customerCategory || row.category)
      const coOwners = cleanStr(row.coOwners || row.dealCoOwners)
      const dealValue = cleanNum(row.dealValue || row.value || row.amount)
      const poValue = cleanNum(row.poValue)
      const probability = cleanNum(row.probability)
      const productCategory = cleanStr(row.productCategory) || 'MARKETING-SWATI'
      const consultantName = cleanStr(row.consultantName)
      const contactName = cleanStr(row.contactName || row.contactPerson)
      const gstin = cleanStr(row.gstin)
      const dealSource = cleanStr(row.dealSource || row.source) || 'MARKETING-SWATI'
      const dealDate = cleanStr(row.dealDate)
      const dealType = cleanStr(row.dealType || customerCategory || dealSource || 'SWATI')
      const phone = cleanStr(row.phone || row.contactPhone || row.mobile)
      const description = cleanStr(row.description || row.notes)
      const jobNo = cleanStr(row.jobNo)
      const isValidJobNo = jobNo && !['n/a', 'na', '-', 'none', '0', 'null', 'undefined'].includes(jobNo.toLowerCase())

      // Check target collection model for existing record
      let TargetModel = Deal
      let collectionName = 'deals'
      if (targetColl.includes('account')) {
        TargetModel = Account
        collectionName = 'accounts'
      } else if (targetColl.includes('customer')) {
        TargetModel = Customer
        collectionName = 'customers'
      } else if (targetColl.includes('lead')) {
        TargetModel = Lead
        collectionName = 'leads'
      }

      const dupCriteria = []
      if (isValidJobNo) dupCriteria.push({ jobNo })

      if (collectionName === 'accounts' || collectionName === 'customers') {
        if (unifiedAccountCustomerName) {
          dupCriteria.push({
            $or: [
              { customerName: unifiedAccountCustomerName },
              { accountName: unifiedAccountCustomerName },
              { companyName: unifiedAccountCustomerName }
            ]
          })
        }
      } else {
        if (unifiedAccountCustomerName && unifiedName && unifiedName.toLowerCase() !== 'general enquiry') {
          dupCriteria.push({
            $and: [
              { $or: [{ customerName: unifiedAccountCustomerName }, { accountName: unifiedAccountCustomerName }, { companyName: unifiedAccountCustomerName }] },
              { $or: [{ projectName: unifiedName }, { dealName: unifiedName }, { title: unifiedName }, { name: unifiedName }] }
            ]
          })
        }
      }

      let existingTargetDoc = null
      if (dupCriteria.length > 0) {
        existingTargetDoc = await TargetModel.findOne({
          frontendDeleted: { $ne: true },
          $or: dupCriteria
        }).lean()
      }

      const existingNum = cleanStr(row.dealNumber || row.accountNumber || row.customerNumber)
      const legacyId = await getNextLegacyId(collectionName)
      const seriesNum = legacyId < 1001 ? legacyId + 1000 : legacyId
      const recordNumber = existingNum || (collectionName === 'accounts' ? `ACC-${seriesNum}` : collectionName === 'customers' ? `CUST-${seriesNum}` : `DL-${seriesNum}`)

      const docPayload = {
        legacyId,
        title: unifiedName,
        name: unifiedName,
        dealName: unifiedName,
        projectName: unifiedName,
        dealNumber: recordNumber,
        accountNumber: recordNumber,
        customerNumber: recordNumber,
        customerName: unifiedAccountCustomerName,
        accountName: unifiedAccountCustomerName,
        companyName: unifiedAccountCustomerName,
        company: unifiedAccountCustomerName,
        accountId: null,
        amount: dealValue,
        value: dealValue,
        dealValue,
        currency: 'INR',
        stage: collectionName === 'leads' ? 'new' : 'converted',
        status: collectionName === 'leads' ? 'new' : 'converted',
        probability: probability || 0,
        expectedCloseDate: dealDate,
        expectedClosureDate: dealDate,
        closeDate: dealDate,
        actualClosureDate: dealDate,
        assignedTo: resolvedUserId,
        ownerUserId: resolvedUserId,
        createdBy: resolvedUserId,
        dealOwner: resolvedUserName,
        accountOwner: resolvedUserName,
        ownerName: resolvedUserName,
        coOwners,
        notes: description,
        dealDate,
        dealType,
        dealSource,
        source: dealSource,
        dealSubsource: 'E-MAIL',
        subsource: 'E-MAIL',
        projectStatus: 'In Progress',
        poValue,
        jobNo,
        gstin,
        contactPerson: contactName,
        contactName,
        contactMobile: phone,
        contactPhone: phone,
        phone,
        contactEmail: cleanStr(row.email),
        email: cleanStr(row.email),
        address: '',
        description,
        dealScore: 0,
        productCategory,
        consultantName,
        customerCategory,
        companyId: actor.companyId || 1,
        projectId: null,
        workflowId: null,
        frontendDeleted: false,
        data: {
          title: unifiedName,
          name: unifiedName,
          dealName: unifiedName,
          projectName: unifiedName,
          customerName: unifiedAccountCustomerName,
          accountName: unifiedAccountCustomerName,
          companyName: unifiedAccountCustomerName,
          company: unifiedAccountCustomerName,
          customerCategory,
          accountId: null,
          customerId: null,
          customerNumber: String(resolvedUser.ownerCode || '1004'),
          amount: dealValue,
          value: dealValue,
          dealValue,
          currency: 'INR',
          stage: collectionName === 'leads' ? 'new' : 'converted',
          status: collectionName === 'leads' ? 'new' : 'converted',
          statusLabel: collectionName === 'leads' ? 'New Lead' : 'Converted',
          assignedTo: resolvedUserId,
          ownerUserId: resolvedUserId,
          ownerName: resolvedUserName,
          dealOwner: resolvedUserName,
          accountOwner: resolvedUserName,
          coOwners,
          dealCoOwners: coOwners,
          assignedUserName: resolvedUserName,
          createdBy: resolvedUserId,
          convertedFromAccount: true,
          conversionSource: 'excel-import',
          convertedAt: new Date().toISOString(),
          convertedBy: resolvedUserId,
          consultantName,
          contactName,
          contactPerson: contactName,
          description,
          notes: description,
          companyId: actor.companyId || 1,
          organizationId: actor.companyId || 1,
          dealNumber: recordNumber,
          accountNumber: recordNumber,
          customerNumber: recordNumber,
          probability,
          expectedCloseDate: dealDate,
          expectedClosureDate: dealDate,
          closeDate: dealDate,
          actualClosureDate: dealDate,
          ownerId: resolvedUserId,
          dealDate,
          dealType,
          phone,
          dealSource,
          source: dealSource,
          dealSubsource: 'E-MAIL',
          subsource: 'E-MAIL',
          poValue,
          projectStatus: 'In Progress',
          productCategory,
          jobNo,
          gstin,
          assignedUserId: String(resolvedUserId),
          userId: String(resolvedUserId),
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await TargetModel.create(docPayload)

      // Multi-Collection Sync for Accounts & Customers: Sync into Customer, Account & Lead
      if (collectionName === 'accounts' || collectionName === 'customers') {
        if (Customer && collectionName !== 'customers') {
          const custLegacyId = await getNextLegacyId('customers')
          const custDoc = {
            ...docPayload,
            legacyId: custLegacyId,
            customerNumber: `CUST-${custLegacyId < 1001 ? custLegacyId + 1000 : custLegacyId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await Customer.create(custDoc)
        }

        if (Account && collectionName !== 'accounts') {
          const accLegacyId = await getNextLegacyId('accounts')
          const accDoc = {
            ...docPayload,
            legacyId: accLegacyId,
            accountNumber: `ACC-${accLegacyId < 1001 ? accLegacyId + 1000 : accLegacyId}`,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await Account.create(accDoc)
        }

        if (Lead) {
          const leadLegacyId = await getNextLegacyId('leads')
          const leadDoc = {
            ...docPayload,
            legacyId: leadLegacyId,
            stage: 'new',
            status: 'new',
            data: {
              ...docPayload.data,
              stage: 'new',
              status: 'new',
              statusLabel: 'New Lead',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await Lead.create(leadDoc)
        }
      } else {
        // Dual Ingestion into MongoDB `leads` collection for Deals import
        if (collectionName !== 'leads' && Lead) {
          const leadLegacyId = await getNextLegacyId('leads')
          const leadDoc = {
            ...docPayload,
            legacyId: leadLegacyId,
            stage: 'new',
            status: 'new',
            data: {
              ...docPayload.data,
              stage: 'new',
              status: 'new',
              statusLabel: 'New Lead',
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
          await Lead.create(leadDoc)
        }
      }

      count++
    }

    return {
      count,
      insertedCount: count,
      duplicateCount: 0,
      totalProcessed: deals.length,
    }
  },
}
