import apiClient from './apiClient'
import { getCanonicalCrmUserName, getCrmOwnerDisplay } from '../features/users/crmUserDirectory'
import { normalizeOptionalIntegerInput, normalizeOptionalNumberInput } from '../features/adminDeals/config/dealUtils'

const unwrapData = (response, fallback) => (
  response?.data?.data ?? response?.data ?? fallback
)

export const normalizeConvertedDealRecord = (record = {}) => {
  const data = record.data && typeof record.data === 'object' ? record.data : {}
  const ownerName = getCanonicalCrmUserName(record.ownerName || data.ownerName || data.dealOwner)
    || String(record.ownerName || data.ownerName || data.dealOwner || '').trim()

  return {
    ...data,
    ...record,
    id: record.id,
    title: record.title || data.title || data.name || '',
    name: record.title || data.title || data.name || '',
    dealNumber: record.dealNumber || data.dealNumber || '',
    accountId: record.accountId ?? data.accountId ?? '',
    dealId: record.dealId ?? record.sourceDealId ?? data.dealId ?? data.sourceDealId ?? '',
    sourceDealId: record.sourceDealId ?? data.sourceDealId ?? '',
    customerId: record.customerId ?? data.customerId ?? '',
    accountName: record.accountName || data.accountName || '',
    customerName: record.customerName || data.customerName || '',
    amount: record.amount ?? data.amount ?? data.value ?? null,
    value: record.amount ?? data.amount ?? data.value ?? null,
    currency: record.currency || 'INR',
    stage: record.stage || data.stage || 'converted',
    status: record.status || data.status || 'converted',
    ownerName,
    ownerDisplay: getCrmOwnerDisplay(ownerName),
    ownerUserId: String(record.ownerUserId || record.assignedTo || data.ownerUserId || ''),
    convertedAt: record.convertedAt || record.createdAt || '',
    notes: record.notes || data.notes || '',
    createdAt: record.createdAt || '',
    updatedAt: record.updatedAt || '',
  }
}

export const convertedDealApi = {
  async getConvertedDeals(params = {}) {
    const response = await apiClient.get('/converted-deals', { params })
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
