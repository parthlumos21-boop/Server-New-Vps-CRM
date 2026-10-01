import apiClient from './apiClient'
import { getCanonicalCrmUserName, getCrmOwnerCode, getCrmOwnerDisplay } from '../features/users/crmUserDirectory'
import { normalizeOptionalIntegerInput, normalizeOptionalNumberInput } from '../features/adminDeals/config/dealUtils'

const firstPresent = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

const normalizeDealCityForFilter = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  if (normalizedValue === 'ahmedabad' || normalizedValue === 'ahmadabad') return 'ahmadabad'
  if (normalizedValue === 'baroda' || normalizedValue === 'vadodara') return 'vadodara'
  return String(value || '').trim()
}

export const normalizeDealRecord = (deal = {}) => {
  const data = deal.data && typeof deal.data === 'object' ? deal.data : {}
  const dealOwner = getCanonicalCrmUserName(data.dealOwner || data.ownerName || deal.dealOwner || deal.ownerName) || String(data.dealOwner || data.ownerName || deal.dealOwner || deal.ownerName || '').trim()
  const customerOwner = getCanonicalCrmUserName(data.customerOwner || deal.customerOwner) || String(data.customerOwner || deal.customerOwner || '').trim()
  const resolvedAmount = firstPresent(data.amount, data.value, data.dealValue, data.deal_value, deal.amount, deal.value, deal.dealValue, deal.deal_value)
  const resolvedAccountName = deal.linkedAccountName || deal.accountName || deal.account_name || data.linkedAccountName || data.accountName || data.account_name || ''
  const resolvedAccountNumber = deal.linkedAccountNumber || deal.accountNumber || deal.account_number || data.linkedAccountNumber || data.accountNumber || data.account_number || data.accountNo || data.account_no || ''
  const resolvedCustomerName = deal.customerName || deal.customer_name || data.customerName || data.customer_name || resolvedAccountName || ''
  const resolvedCompanyName = deal.companyName || deal.company_name || data.companyName || data.company_name || data.company || resolvedAccountName || resolvedCustomerName || ''
  const resolvedTitle = data.name || data.dealName || data.deal_name || deal.name || deal.dealName || deal.deal_name || deal.title || ''
  const resolvedCity = data.city || data.location || data.branchLocation || data.projectLocation || deal.city || deal.location || deal.branchLocation || deal.projectLocation || ''
  const resolvedProjectName = data.projectName || data.project_name || deal.projectName || deal.project_name || resolvedTitle

  return {
    ...data,
    ...deal,
    id: deal.id,
    dealNumber: deal.dealNumber || deal.deal_number || data.dealNumber || data.deal_number || '',
    name: resolvedTitle,
    title: resolvedTitle,
    value: resolvedAmount ?? null,
    amount: resolvedAmount ?? null,
    dealValue: resolvedAmount ?? null,
    stage: deal.stage || data.stage || 'new',
    status: deal.status || data.status || deal.stage || data.stage || 'new',
    accountId: deal.accountId ?? data.accountId ?? '',
    linkedAccountName: resolvedAccountName,
    linkedAccountNumber: resolvedAccountNumber,
    accountName: resolvedAccountName,
    accountNumber: resolvedAccountNumber,
    customerName: resolvedCustomerName,
    customerNumber: deal.customerNumber || deal.customer_number || data.customerNumber || data.customer_number || data.customerNo || data.customer_no || resolvedAccountNumber || '',
    companyName: resolvedCompanyName,
    companyProfile: deal.companyProfile || deal.company_profile || data.companyProfile || data.company_profile || data.company || resolvedCompanyName || '',
    companyLogo: deal.companyLogo || deal.company_logo || data.companyLogo || data.company_logo || '',
    ownerUserId: String(deal.ownerUserId || deal.assignedTo || data.ownerUserId || ''),
    ownerId: String(deal.ownerUserId || deal.assignedTo || data.ownerId || ''),
    assignedTo: String(deal.assignedTo || deal.ownerUserId || ''),
    assignedUserId: String(deal.assignedTo || deal.ownerUserId || ''),
    createdBy: String(deal.createdBy || ''),
    userId: String(deal.createdBy || deal.ownerUserId || ''),
    ownerName: dealOwner,
    dealOwner,
    dealOwnerName: dealOwner,
    dealOwnerCode: getCrmOwnerCode(dealOwner),
    dealOwnerDisplay: getCrmOwnerDisplay(dealOwner),
    customerOwner,
    customerOwnerName: customerOwner,
    customerOwnerCode: getCrmOwnerCode(customerOwner),
    customerOwnerDisplay: getCrmOwnerDisplay(customerOwner),
    probability: data.probability ?? deal.probability ?? null,
    expectedClosureDate: data.expectedClosureDate || data.expectedCloseDate || data.closeDate || deal.expectedCloseDate || deal.expectedClosureDate || deal.closeDate || '',
    closeDate: data.closeDate || data.expectedCloseDate || deal.closeDate || deal.expectedCloseDate || '',
    actualClosureDate: data.actualClosureDate || data.actual_closure_date || deal.actualClosureDate || deal.actual_closure_date || '',
    dealDate: data.dealDate || data.deal_date || deal.dealDate || deal.deal_date || '',
    dealType: data.dealType || data.deal_type || deal.dealType || deal.deal_type || data.customerCategory || data.customer_category || deal.customerCategory || deal.customer_category || '',
    dealSource: data.dealSource || data.deal_source || data.source || deal.dealSource || deal.deal_source || deal.source || '',
    source: data.source || data.dealSource || deal.source || deal.dealSource || '',
    dealSubsource: data.dealSubsource || data.subsource || deal.dealSubsource || deal.subsource || '',
    subsource: data.subsource || data.dealSubsource || deal.subsource || deal.dealSubsource || '',
    city: normalizeDealCityForFilter(resolvedCity),
    location: resolvedCity,
    projectName: resolvedProjectName,
    projectStatus: data.projectStatus || deal.projectStatus || '',
    poValue: firstPresent(data.poValue, deal.poValue, ''),
    poValueJobNo: data.poValueJobNo || deal.poValueJobNo || '',
    jobNo: data.jobNo || deal.jobNo || '',
    convertToPo: data.convertToPo || deal.convertToPo || '',
    reasonForLostOrder: data.reasonForLostOrder || data.reasonForLost || deal.reasonForLostOrder || deal.reasonForLost || '',
    reasonForLost: data.reasonForLost || data.reasonForLostOrder || deal.reasonForLost || deal.reasonForLostOrder || '',
    quotationCustomerStatus: data.quotationCustomerStatus || deal.quotationCustomerStatus || '',
    orderCustomerStatus: data.orderCustomerStatus || deal.orderCustomerStatus || '',
    orderCustomerStatusOld: data.orderCustomerStatusOld || data.oldStatus || deal.orderCustomerStatusOld || deal.oldStatus || '',
    orderCustomerStatusNew: data.orderCustomerStatusNew || data.newStatus || deal.orderCustomerStatusNew || deal.newStatus || '',
    customerReferenceDate: data.customerReferenceDate || data.customerRefDate || deal.customerReferenceDate || deal.customerRefDate || '',
    customerReferenceNumber: data.customerReferenceNumber || data.customerRefNo || deal.customerReferenceNumber || deal.customerRefNo || '',
    customerRefDate: data.customerRefDate || data.customerReferenceDate || deal.customerRefDate || deal.customerReferenceDate || '',
    customerRefNo: data.customerRefNo || data.customerReferenceNumber || deal.customerRefNo || deal.customerReferenceNumber || '',
    productCategory: data.productCategory || deal.productCategory || '',
    consultantName: data.consultantName || deal.consultantName || '',
    gstin: data.gstin || deal.gstin || '',
    contactPerson: data.contactPerson || data.contactName || deal.contactPerson || deal.contactName || '',
    contactName: data.contactName || data.contactPerson || deal.contactName || deal.contactPerson || '',
    contactMobile: data.contactMobile || data.phone || deal.contactMobile || deal.phone || '',
    contactPhone: data.contactPhone || data.phone || deal.contactPhone || deal.phone || '',
    phone: data.phone || data.contactMobile || data.contactPhone || deal.phone || deal.contactMobile || deal.contactPhone || '',
    contactEmail: data.contactEmail || data.email || deal.contactEmail || deal.email || '',
    email: data.email || data.contactEmail || deal.email || deal.contactEmail || '',
    address: data.address || deal.address || '',
    description: data.description || deal.description || '',
    dealScore: firstPresent(data.dealScore, deal.dealScore, null),
    notes: data.notes || deal.notes || '',
    currency: deal.currency || 'INR',
    createdAt: deal.createdAt || '',
    updatedAt: deal.updatedAt || '',
  }
}

const normalizeDealPayload = (deal = {}) => {
  const normalized = { ...deal }

  if (deal.title !== undefined || deal.name !== undefined || deal.dealName !== undefined) {
    normalized.title = deal.title || deal.name || deal.dealName || null
  }
  if (deal.accountId !== undefined || deal.customerId !== undefined) {
    normalized.accountId = normalizeOptionalIntegerInput(deal.accountId ?? deal.customerId)
  }
  if (deal.amount !== undefined || deal.value !== undefined || deal.dealValue !== undefined) {
    const val = normalizeOptionalNumberInput(deal.amount ?? deal.value ?? deal.dealValue)
    normalized.amount = val
    normalized.value = val
  }
  if (deal.probability !== undefined) {
    normalized.probability = normalizeOptionalIntegerInput(deal.probability)
  }
  if (deal.expectedCloseDate !== undefined || deal.expectedClosureDate !== undefined || deal.closeDate !== undefined) {
    normalized.expectedCloseDate = deal.expectedCloseDate || deal.expectedClosureDate || deal.closeDate || null
  }
  if (deal.assignedTo !== undefined || deal.assignedUserId !== undefined || deal.ownerUserId !== undefined) {
    normalized.assignedTo = normalizeOptionalIntegerInput(deal.assignedTo || deal.assignedUserId || deal.ownerUserId)
  }
  if (deal.ownerUserId !== undefined || deal.ownerId !== undefined) {
    normalized.ownerUserId = normalizeOptionalIntegerInput(deal.ownerUserId || deal.ownerId || deal.assignedTo)
  }

  return normalized
}

export const dealApi = {
  async getDeals(params = {}) {
    const response = await apiClient.get('/deals', { params: { limit: 'all', ...params } })
    return (response.data || []).map(normalizeDealRecord)
  },

  async getDealById(id) {
    const response = await apiClient.get(`/deals/${encodeURIComponent(id)}`)
    return normalizeDealRecord(response.data)
  },

  async getConvertedDealForAccount(accountId) {
    const response = await apiClient.get(`/deals/converted-from-account/${encodeURIComponent(accountId)}`)
    return response.data ? normalizeDealRecord(response.data) : null
  },

  async createDeal(payload) {
    const response = await apiClient.post('/deals', normalizeDealPayload(payload))
    const responseData = response.data?.success ? response.data.data : response.data
    return normalizeDealRecord(responseData)
  },

  async updateDeal(id, payload) {
    const response = await apiClient.put(`/deals/${encodeURIComponent(id)}`, normalizeDealPayload(payload))
    const responseData = response.data?.success ? response.data.data : response.data
    return normalizeDealRecord(responseData)
  },

  async importDeals(deals) {
    const response = await apiClient.post('/deals/import', { deals })
    return response.data?.success ? response.data.data : response.data
  },
}
