import apiClient from './apiClient'
import { getCanonicalCrmUserName, getCrmOwnerCode } from '../features/users/crmUserDirectory'
import { normalizeDealRecord } from './dealApi'
import { normalizeConvertedDealRecord } from './convertedDealApi'

const getPayload = (response) => response?.data ?? response ?? null

const normalizeLeadRecord = (lead = {}) => {
  const rawAccountOwner = lead.accountOwner || lead.ownerName || lead.owner_user_name || ''
  const accountOwner = getCanonicalCrmUserName(rawAccountOwner) || String(rawAccountOwner || '').trim()
  const accountOwnerCode = getCrmOwnerCode(accountOwner)
  const accountNumber = lead.accountNumber || lead.accountNo || lead.account_no || accountOwnerCode || ''
  const accountName = lead.accountName || lead.customerName || lead.name || ''
  const phone = lead.phone || lead.mobile || lead.contactMobile || lead.contactPhone || ''
  const email = lead.email || lead.alternateEmail || lead.contactEmail || ''

  return {
    ...lead,
    id: lead.id,
    name: lead.name || accountName,
    phone,
    email,
    accountNo: accountNumber,
    accountNumber,
    accountName,
    accountOwner,
    accountOwnerName: accountOwner,
    accountOwnerCode,
    accountOwnerDisplay: accountOwner,
    ownerName: lead.ownerName || accountOwner,
    accountState: lead.accountState || lead.status || 'pending',
    alternateEmail: lead.alternateEmail || email || '',
    alternatePhone: lead.alternatePhone || lead.mobile || phone || '',
    projectName: lead.projectName || lead.company || '',
    isConverted: Boolean(lead.isConverted || lead.convertedFromAccount || lead.dealId),
    convertedAt: lead.convertedAt || '',
    convertedBy: lead.convertedBy || '',
    dealId: lead.dealId || '',
    convertedDealId: lead.convertedDealId || '',
    assignedUserId: lead.assignedUserId || lead.assignedTo || lead.ownerId || null,
    ownerId: lead.ownerId || lead.assignedTo || null,
  }
}

export const leadApi = {
  async getLeads(params = {}) {
    const response = await apiClient.get('/leads', { params })
    return (getPayload(response) || []).map(normalizeLeadRecord)
  },

  async getLeadById(id) {
    const response = await apiClient.get(`/leads/${encodeURIComponent(id)}`)
    return normalizeLeadRecord(getPayload(response))
  },

  async createLead(payload) {
    const response = await apiClient.post('/leads', payload)
    return normalizeLeadRecord(getPayload(response))
  },

  async updateLead(id, payload) {
    const response = await apiClient.put(`/leads/${encodeURIComponent(id)}`, payload)
    return normalizeLeadRecord(getPayload(response))
  },

  async deleteLead(id) {
    const response = await apiClient.delete(`/leads/${encodeURIComponent(id)}`)
    return getPayload(response)
  },

  async convertToDeal(id) {
    const response = await apiClient.post(`/leads/${encodeURIComponent(id)}/convert-to-deal`)
    const payload = getPayload(response) || {}
    return {
      account: payload.account ? normalizeLeadRecord(payload.account) : null,
      deal: payload.deal ? normalizeDealRecord(payload.deal) : null,
      convertedDeal: payload.convertedDeal ? normalizeConvertedDealRecord(payload.convertedDeal) : null,
    }
  },

  async bulkAddRemarks(payload) {
    const response = await apiClient.post('/leads/bulk/remarks', payload)
    return getPayload(response)
  },

  async bulkReassign(payload) {
    const response = await apiClient.post('/leads/bulk/reassign', payload)
    return getPayload(response)
  },
}
