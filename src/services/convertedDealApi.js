import apiClient from './apiClient'
import { getCanonicalCrmUserName, getCrmOwnerDisplay } from '../features/users/crmUserDirectory'
import { normalizeOptionalIntegerInput, normalizeOptionalNumberInput } from '../features/adminDeals/config/dealUtils'

const unwrapData = (response, fallback) => (
  response?.data?.data ?? response?.data ?? fallback
)

const normalizeDealCityForFilter = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  if (normalizedValue === 'ahmedabad' || normalizedValue === 'ahmadabad') return 'ahmadabad'
  if (normalizedValue === 'baroda' || normalizedValue === 'vadodara') return 'vadodara'
  return String(value || '').trim()
}

export const normalizeConvertedDealRecord = (record = {}) => {
  const data = record.data && typeof record.data === 'object' ? record.data : {}
  const ownerName = getCanonicalCrmUserName(record.ownerName || data.ownerName || data.dealOwner)
    || String(record.ownerName || data.ownerName || data.dealOwner || '').trim()
  const resolvedTitle = record.title || data.title || data.name || ''
  const resolvedCity = record.city || record.location || data.city || data.location || data.branchLocation || data.projectLocation || ''

  return {
    ...data,
    ...record,
    id: record.id,
    title: resolvedTitle,
    name: resolvedTitle,
    dealNumber: record.dealNumber || data.dealNumber || '',
    accountId: record.accountId ?? data.accountId ?? '',
    dealId: record.dealId ?? record.sourceDealId ?? data.dealId ?? data.sourceDealId ?? '',
    sourceDealId: record.sourceDealId ?? data.sourceDealId ?? '',
    customerId: record.customerId ?? data.customerId ?? '',
    accountName: record.accountName || data.accountName || '',
    accountNumber: record.accountNumber || record.linkedAccountNumber || data.accountNumber || data.linkedAccountNumber || '',
    linkedAccountName: record.linkedAccountName || record.accountName || data.linkedAccountName || data.accountName || '',
    linkedAccountNumber: record.linkedAccountNumber || record.accountNumber || data.linkedAccountNumber || data.accountNumber || '',
    customerName: record.customerName || data.customerName || '',
    customerNumber: record.customerNumber || data.customerNumber || '',
    companyName: record.companyName || data.companyName || record.accountName || data.accountName || record.customerName || data.customerName || '',
    companyProfile: record.companyProfile || data.companyProfile || data.company || '',
    companyLogo: record.companyLogo || data.companyLogo || '',
    amount: record.amount ?? data.amount ?? data.value ?? null,
    value: record.amount ?? data.amount ?? data.value ?? null,
    currency: record.currency || 'INR',
    stage: record.stage || data.stage || 'converted',
    status: record.status || data.status || 'converted',
    ownerName,
    ownerDisplay: getCrmOwnerDisplay(ownerName),
    ownerUserId: String(record.ownerUserId || record.assignedTo || data.ownerUserId || ''),
    assignedTo: String(record.assignedTo || record.ownerUserId || data.assignedTo || data.ownerUserId || ''),
    projectName: record.projectName || data.projectName || data.project_name || resolvedTitle,
    city: normalizeDealCityForFilter(resolvedCity),
    location: resolvedCity,
    contactPerson: record.contactPerson || data.contactPerson || data.contactName || '',
    contactName: record.contactName || data.contactName || data.contactPerson || '',
    contactMobile: record.contactMobile || record.phone || data.contactMobile || data.phone || '',
    contactPhone: record.contactPhone || record.phone || data.contactPhone || data.phone || '',
    phone: record.phone || record.contactMobile || record.contactPhone || data.phone || data.contactMobile || data.contactPhone || '',
    contactEmail: record.contactEmail || record.email || data.contactEmail || data.email || '',
    email: record.email || record.contactEmail || data.email || data.contactEmail || '',
    address: record.address || data.address || '',
    convertedAt: record.convertedAt || record.createdAt || '',
    notes: record.notes || data.notes || '',
    createdAt: record.createdAt || '',
    updatedAt: record.updatedAt || '',
  }
}

export const convertedDealApi = {
  async getConvertedDeals(params = {}) {
    const response = await apiClient.get('/converted-deals', { params: { limit: 'all', ...params } })
    return (unwrapData(response, []) || []).map(normalizeConvertedDealRecord)
  },

  async getConvertedDealById(id) {
    const response = await apiClient.get(`/converted-deals/${encodeURIComponent(id)}`)
    return normalizeConvertedDealRecord(unwrapData(response, null))
  },

  async createConvertedDeal(payload) {
    const response = await apiClient.post('/converted-deals', {
      ...payload,
      accountId: normalizeOptionalIntegerInput(payload?.accountId),
      sourceDealId: normalizeOptionalIntegerInput(payload?.sourceDealId ?? payload?.dealId),
      amount: normalizeOptionalNumberInput(payload?.amount ?? payload?.value),
      assignedTo: normalizeOptionalIntegerInput(payload?.assignedTo ?? payload?.ownerUserId),
      ownerUserId: normalizeOptionalIntegerInput(payload?.ownerUserId ?? payload?.assignedTo),
    })
    return normalizeConvertedDealRecord(unwrapData(response, null))
  },

  async deleteConvertedDeal(id) {
    const response = await apiClient.delete(`/converted-deals/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },
}
