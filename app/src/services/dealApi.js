import apiClient from './apiClient'
import { getCanonicalCrmUserName, getCrmOwnerCode, getCrmOwnerDisplay } from '../features/users/crmUserDirectory'
import { normalizeOptionalIntegerInput, normalizeOptionalNumberInput } from '../features/adminDeals/config/dealUtils'

const firstPresent = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null) return value
  }
  return undefined
}

export const normalizeDealRecord = (deal = {}) => {
  const data = deal.data && typeof deal.data === 'object' ? deal.data : {}
  const dealOwner = getCanonicalCrmUserName(data.dealOwner || data.ownerName || deal.dealOwner || deal.ownerName) || String(data.dealOwner || data.ownerName || deal.dealOwner || deal.ownerName || '').trim()
  const customerOwner = getCanonicalCrmUserName(data.customerOwner || deal.customerOwner) || String(data.customerOwner || deal.customerOwner || '').trim()
  const resolvedAmount = firstPresent(data.amount, data.value, data.dealValue, deal.amount, deal.value, deal.dealValue)

  return {
    ...data,
    ...deal,
    id: deal.id,
    dealNumber: deal.dealNumber || data.dealNumber || '',
    name: data.name || data.dealName || deal.name || deal.title || '',
    title: data.name || data.dealName || deal.name || deal.title || '',
    value: resolvedAmount ?? null,
    amount: resolvedAmount ?? null,
    dealValue: resolvedAmount ?? null,
    stage: deal.stage || data.stage || 'new',
    status: deal.status || data.status || deal.stage || data.stage || 'new',
    accountId: deal.accountId ?? data.accountId ?? '',
    linkedAccountName: deal.linkedAccountName || data.linkedAccountName || '',
    linkedAccountNumber: deal.linkedAccountNumber || data.linkedAccountNumber || '',
    accountName: deal.linkedAccountName || deal.accountName || data.accountName || '',
    accountNumber: deal.linkedAccountNumber || deal.accountNumber || data.accountNumber || '',
    customerName: deal.customerName || data.customerName || '',
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
    actualClosureDate: data.actualClosureDate || deal.actualClosureDate || '',
    dealDate: data.dealDate || deal.dealDate || '',
    dealType: data.dealType || deal.dealType || data.customerCategory || deal.customerCategory || '',
    dealSource: data.dealSource || data.source || deal.dealSource || deal.source || '',
    source: data.source || data.dealSource || deal.source || deal.dealSource || '',
    dealSubsource: data.dealSubsource || data.subsource || deal.dealSubsource || deal.subsource || '',
    subsource: data.subsource || data.dealSubsource || deal.subsource || deal.dealSubsource || '',
    projectName: data.projectName || deal.projectName || '',
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

const normalizeDealPayload = (deal = {}) => ({
  ...deal,
  title: deal.title || deal.name || null,
  accountId: normalizeOptionalIntegerInput(deal.accountId ?? deal.customerId),
  amount: normalizeOptionalNumberInput(deal.amount ?? deal.value ?? deal.dealValue),
  value: normalizeOptionalNumberInput(deal.value ?? deal.amount ?? deal.dealValue),
  probability: normalizeOptionalIntegerInput(deal.probability),
  expectedCloseDate: deal.expectedCloseDate || deal.expectedClosureDate || deal.closeDate || null,
  assignedTo: normalizeOptionalIntegerInput(deal.assignedTo || deal.assignedUserId || deal.ownerUserId),
  ownerUserId: normalizeOptionalIntegerInput(deal.ownerUserId || deal.ownerId || deal.assignedTo),
})

export const dealApi = {
  async getDeals(params = {}) {
    const response = await apiClient.get('/deals', { params })
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
    return normalizeDealRecord(response.data)
  },

  async updateDeal(id, payload) {
    const response = await apiClient.put(`/deals/${encodeURIComponent(id)}`, normalizeDealPayload(payload))
    return normalizeDealRecord(response.data)
  },

  async deleteDeal(id) {
    const response = await apiClient.delete(`/deals/${encodeURIComponent(id)}`)
    return response.data
  },
}
