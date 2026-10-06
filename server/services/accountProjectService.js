const leadService = require('./leadService')
const dealService = require('./dealService')
const customerService = require('./customerService')
const { AppError } = require('../utils/appError')

const SOURCE_TYPES = new Set(['lead', 'deal', 'customer'])

const text = (...values) => {
  const value = values.find((entry) => entry !== undefined && entry !== null && String(entry).trim())
  return String(value || '').trim()
}

const numberValue = (...values) => {
  const value = values.find((entry) => entry !== undefined && entry !== null && String(entry).trim() !== '')
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const getRecordId = (record = {}) => String(record.id || record._id || record.legacyId || '')

const getData = (record = {}) => (
  record.data && typeof record.data === 'object' ? record.data : {}
)

const getFormData = (record = {}) => (
  record.formData && typeof record.formData === 'object' ? record.formData : {}
)

const normalizeSourceRecord = (sourceType, record = {}) => {
  const data = getData(record)
  const formData = getFormData(record)
  const contact = Array.isArray(record.contacts) ? record.contacts[0] || {} : {}

  const customerName = text(
    record.customerName,
    record.accountName,
    record.name,
    record.companyName,
    record.company,
    data.customerName,
    data.accountName,
    data.name,
    formData.customerName,
    formData.accountName,
    formData.name
  )
  const projectName = text(record.projectName, record.dealName, record.title, record.name, data.projectName, data.dealName, formData.projectName)
  const ownerName = text(record.accountOwner, record.accountOwnerName, record.customerOwner, record.dealOwner, record.ownerName, data.accountOwner, data.dealOwner, formData.accountOwner)

  return {
    id: `${sourceType}-${getRecordId(record)}`,
    sourceType,
    sourceId: getRecordId(record),
    accountId: record.accountId || record.id || '',
    dealId: sourceType === 'deal' ? getRecordId(record) : '',
    customerId: sourceType === 'customer' ? getRecordId(record) : '',
    customerName,
    accountName: text(record.accountName, customerName),
    customerNumber: text(record.customerNumber, record.accountNumber, record.accountNo, record.dealNumber, formData.accountNumber, formData.accountNo),
    customerOwner: ownerName,
    customerOwnerDisplay: ownerName,
    customerCategory: text(record.customerCategory, record.accountCategory, record.dealType, data.customerCategory, data.accountCategory, formData.accountCategory),
    customerStatus: text(record.customerStatus, record.accountStatus, record.accountState, record.status, data.status, formData.accountState),
    address: text(record.address, data.address, formData.address),
    state: text(record.state, data.state, formData.state),
    gstin: text(record.gstin, data.gstin, formData.gstin),
    industryType: text(record.industryType, record.industry, data.industryType, formData.industryType, formData.industry),
    consultantName: text(record.consultantName, data.consultantName, formData.consultantName),
    architectName: text(record.architectName, data.architectName, formData.architectName),
    pmcName: text(record.pmcName, data.pmcName, formData.pmcName),
    projectName,
    productCategory: text(record.productCategory, data.productCategory, formData.productCategory),
    customerRefNo: text(record.customerRefNo, record.customerReferenceNumber, data.customerRefNo, data.customerReferenceNumber, formData.customerRefNo),
    customerRefDate: text(record.customerRefDate, record.customerReferenceDate, data.customerRefDate, data.customerReferenceDate, formData.customerRefDate),
    jobNo: text(record.jobNo, data.jobNo, formData.jobNo),
    poValue: numberValue(record.poValue, data.poValue, formData.poValue),
    dealValue: numberValue(record.dealValue, record.value, record.amount, data.dealValue, data.value, formData.dealValue, formData.projectValue),
    contacts: [{
      contactPerson: text(record.contactPerson, record.contactName, contact.contactPerson, contact.name, data.contactPerson, formData.contactPerson),
      phone: text(record.contactPhone, record.phone, contact.phone, data.contactPhone, formData.contactPhone),
      mobile: text(record.contactMobile, record.mobile, record.phone, contact.mobile, contact.phone, data.contactMobile, formData.contactMobile),
      email: text(record.contactEmail, record.email, contact.email, data.contactEmail, formData.contactEmail),
      designation: text(record.contactDesignation, contact.designation, data.contactDesignation, formData.contactDesignation),
    }],
  }
}

const matchesSearch = (record = {}, searchValue) => {
  const haystack = [
    record.customerName,
    record.accountName,
    record.customerNumber,
    record.customerOwner,
    record.customerCategory,
    record.customerStatus,
    record.projectName,
    record.address,
    record.gstin,
    record.contacts?.[0]?.email,
    record.contacts?.[0]?.mobile,
    record.contacts?.[0]?.phone,
    record.contacts?.[0]?.contactPerson,
  ].join(' ').toLowerCase()

  return haystack.includes(searchValue)
}

const searchSources = async (actor, query = {}) => {
  const searchValue = String(query.q || query.search || '').trim().toLowerCase()
  if (!searchValue) return []

  const [leads, deals, customers] = await Promise.all([
    leadService.listLeads(actor, { accountName: searchValue, limit: 100000 }).catch(() => []),
    dealService.list(actor, { q: searchValue, limit: 100000 }).catch(() => []),
    customerService.list(actor, { q: searchValue, limit: 100000 }).catch(() => []),
  ])

  const normalized = [
    ...leads.map((record) => normalizeSourceRecord('lead', record)),
    ...deals.map((record) => normalizeSourceRecord('deal', record)),
    ...customers.map((record) => normalizeSourceRecord('customer', record)),
  ].filter((record) => record.customerName && matchesSearch(record, searchValue))

  const seen = new Set()
  return normalized.filter((record) => {
    const key = `${record.sourceType}:${record.sourceId || record.customerName}:${record.projectName}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 20)
}

const findSourceRecord = async (actor, sourceType, sourceId) => {
  if (!SOURCE_TYPES.has(sourceType)) {
    throw new AppError('Selected source type is invalid.', 400)
  }

  if (!sourceId) {
    throw new AppError('Selected source record is required.', 400)
  }

  if (sourceType === 'lead') {
    let leadRecord = null
    try {
      leadRecord = await leadService.getLeadById(actor, sourceId)
    } catch {
      try {
        leadRecord = await leadService.getLeadById(actor, sourceId, { includeGroupScope: false })
      } catch {
        const leadRepo = require('../repositories/leadRepository')
        leadRecord = await leadRepo.findLeadById(Number(sourceId))
      }
    }
    return normalizeSourceRecord('lead', leadRecord || {})
  }

  if (sourceType === 'deal') {
    let dealRecord = null
    try {
      dealRecord = await dealService.get(actor, sourceId)
    } catch {
      const dealRepo = require('../repositories/dealRepository')
      dealRecord = (await dealRepo.findDealById(Number(sourceId))) || (await dealRepo.findDealById(sourceId))
    }
    return normalizeSourceRecord('deal', dealRecord || {})
  }

  return normalizeSourceRecord('customer', await customerService.get(actor, sourceId).catch(() => ({})))
}

const buildSharedPayload = (source, formData = {}, actor = {}) => {
  const primaryContact = {
    name: text(formData.contactPerson, source.contacts?.[0]?.contactPerson),
    designation: text(formData.contactDesignation, source.contacts?.[0]?.designation),
    email: text(formData.contactEmail, source.contacts?.[0]?.email),
    phone: text(formData.contactPhone, source.contacts?.[0]?.phone),
    mobile: text(formData.contactMobile, source.contacts?.[0]?.mobile),
  }
  const accountName = text(source.customerName, formData.accountName, formData.customerName)
  const projectName = text(formData.projectName, formData.dealName, source.projectName, accountName)
  const dealName = text(formData.dealName, projectName, `${accountName} Deal`)
  const ownerName = text(formData.dealOwner, formData.accountOwner, source.customerOwner, actor.name, actor.username)

  return {
    accountName,
    customerName: accountName,
    customerNumber: source.customerNumber,
    accountOwner: ownerName,
    dealOwner: ownerName,
    ownerName,
    accountOwnerCode: text(formData.accountOwnerCode, source.accountOwnerCode, actor.ownerCode),
    source: text(formData.accountSource, formData.dealSource, source.sourceType),
    accountSource: text(formData.accountSource, formData.dealSource, source.sourceType),
    accountCategory: text(formData.accountCategory, source.customerCategory, formData.dealType),
    customerType: text(formData.customerType, source.customerCategory),
    state: text(formData.state, source.state),
    address: text(formData.address, source.address),
    gstin: text(formData.gstin, source.gstin),
    industryType: text(formData.industryType, source.industryType),
    consultantName: text(formData.consultantName, source.consultantName),
    architectName: text(formData.architectName, source.architectName),
    pmcName: text(formData.pmcName, source.pmcName),
    projectName,
    dealName,
    dealDescription: text(formData.dealDescription, formData.projectDescription),
    productCategory: text(formData.productCategory, source.productCategory),
    customerRefNo: text(formData.customerRefNo, source.customerRefNo),
    customerRefDate: text(formData.customerRefDate, source.customerRefDate),
    jobNo: text(formData.jobNo, source.jobNo),
    poValue: numberValue(formData.poValue, source.poValue),
    dealValue: numberValue(formData.dealValue, formData.projectValue, source.dealValue),
    dealDate: text(formData.dealDate, new Date().toISOString().slice(0, 10)),
    dealType: text(formData.dealType, source.customerCategory, formData.accountCategory),
    dealSource: text(formData.dealSource, formData.accountSource, source.sourceType),
    dealCity: text(formData.dealCity, formData.projectLocation, source.city),
    expectedClosureDate: text(formData.expectedClosureDate),
    probability: numberValue(formData.probability, 1),
    valueCurrency: text(formData.valueCurrency, 'INR'),
    customerQuotationStatus: text(formData.customerQuotationStatus),
    customerOrderStatus: text(formData.customerOrderStatus),
    contactPerson: primaryContact.name,
    contactDesignation: primaryContact.designation,
    contactEmail: primaryContact.email,
    contactPhone: primaryContact.phone,
    contactMobile: primaryContact.mobile,
    contacts: [primaryContact],
    selectedSourceType: source.sourceType,
    selectedSourceId: source.sourceId,
    linkedSourceType: source.sourceType,
    linkedSourceId: source.sourceId,
    linkedAccountName: source.accountName || accountName,
    linkedAccountNumber: source.customerNumber || '',
    status: 'new',
    stage: 'new',
  }
}

const createExistingSourceProject = async (actor, body = {}) => {
  const source = await findSourceRecord(actor, body.sourceType, body.sourceId)
  const payload = buildSharedPayload(source, body.formData || {}, actor)

  if (!payload.projectName && !payload.dealName) {
    throw new AppError('Project Name is required to create a new project deal.', 400)
  }

  // Resolve dynamic owner record if owner is changed or present
  const { getCrmOwnerRecord } = require('../features/crmUserDirectory')
  const ownerRecord = await getCrmOwnerRecord(payload.ownerName || actor.ownerCode || actor.name)
  const finalOwnerCode = ownerRecord?.ownerCode || payload.accountOwnerCode || actor.ownerCode || null

  const lead = await leadService.createLead(actor, {
    ...payload,
    accountOwner: payload.ownerName,
    dealOwner: payload.ownerName,
    accountOwnerCode: finalOwnerCode,
    ownerCode: finalOwnerCode,
    status: 'new',
    stage: 'new',
    accountState: 'new',
    accountStatus: 'new',
    formType: 'account',
    creationMode: 'existing-source-project',
  })

  const deal = await dealService.create(actor, {
    ...payload,
    name: payload.dealName || payload.projectName,
    title: payload.dealName || payload.projectName,
    description: payload.dealDescription,
    amount: payload.dealValue,
    value: payload.dealValue,
    dealValue: payload.dealValue,
    currency: payload.valueCurrency,
    dealOwner: payload.ownerName,
    accountOwner: payload.ownerName,
    accountOwnerCode: finalOwnerCode,
    ownerCode: finalOwnerCode,
    stage: 'new',
    status: 'new',
    accountId: lead.id,
    accountName: lead.accountName || payload.accountName,
    accountNumber: lead.accountNumber || lead.accountNo || payload.customerNumber,
    data: {
      ...payload,
      accountId: lead.id,
      sourceLeadId: lead.id,
      creationMode: 'existing-source-project',
      status: 'new',
      stage: 'new',
    },
  })

  return { lead, deal, source }
}

module.exports = {
  searchSources,
  createExistingSourceProject,
}
