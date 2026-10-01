import apiClient from './apiClient'

const buildAutoSupportRequestNumber = (value) => {
  const parsedValue = Number.parseInt(String(value || '').replace(/\D/g, ''), 10)
  if (!Number.isFinite(parsedValue) || parsedValue <= 0) return ''
  return `SR${String(parsedValue).padStart(6, '0')}`
}

const normalizeSupportRequestRecord = (sr = {}) => {
  const data = sr.data && typeof sr.data === 'object' ? sr.data : {}
  const srNumber = sr.srNumber || data.srNumber || buildAutoSupportRequestNumber(sr.id || sr.legacyId || data.id)
  const customerNumber = sr.customerNumber || data.customerNumber || sr.customerNo || data.customerNo || ''
  const customerNo = sr.customerNo || data.customerNo || sr.customerNumber || data.customerNumber || ''

  const innerData = data.data && typeof data.data === 'object' ? data.data : {}
  const closedOn = sr.closedAt || data.closedAt || innerData.closedAt || sr.closedOn || data.closedOn || innerData.closedOn || null
  const closedBy = sr.closedBy || data.closedBy || innerData.closedBy || null

  return {
    ...data,
    ...sr,
    id: sr.id,
    srNumber,
    title: sr.subject || data.title || sr.title || '',
    subject: sr.subject || data.title || sr.title || '',
    description: sr.description || data.description || '',
    priority: sr.priority || data.priority || 'normal',
    status: sr.status || data.status || 'open',
    category: sr.category || data.category || '',
    closedOn,
    closedBy,
    customerNumber,
    customerNo,
    customerName: sr.customerName || data.customerName || '',
    customerEmail: sr.customerEmail || data.customerEmail || '',
    ownerId: String(sr.assignedTo || data.ownerId || ''),
    ownerName: data.ownerName || data.addedByName || '',
    addedByName: data.addedByName || data.ownerName || '',
    userId: String(sr.createdBy || data.userId || ''),
    createdBy: String(sr.createdBy || ''),
    createdAt: sr.createdAt || '',
    updatedAt: sr.updatedAt || '',
  }
}

const normalizeSupportRequestPayload = (supportRequest = {}) => ({
  ...supportRequest,
  subject: supportRequest.subject || supportRequest.title,
})

export const supportRequestApi = {
  async getSupportRequests(params = {}) {
    const response = await apiClient.get('/support-requests', { params })
    return (response.data || []).map(normalizeSupportRequestRecord)
  },

  async getSupportRequestById(id) {
    const response = await apiClient.get(`/support-requests/${encodeURIComponent(id)}`)
    return normalizeSupportRequestRecord(response.data)
  },

  async createSupportRequest(payload) {
    const response = await apiClient.post('/support-requests', normalizeSupportRequestPayload(payload))
    return normalizeSupportRequestRecord(response)
  },

  async updateSupportRequest(id, payload) {
    let finalPayload = { ...payload }
    if (!finalPayload.subject && !finalPayload.title) {
      try {
        const existing = await apiClient.get(`/support-requests/${encodeURIComponent(id)}`)
        const existingData = existing.data?.data || existing.data || {}
        finalPayload.subject = existingData.subject || existingData.title || 'Update'
      } catch (e) { }
    }
    const response = await apiClient.put(`/support-requests/${encodeURIComponent(id)}`, normalizeSupportRequestPayload(finalPayload))
    return normalizeSupportRequestRecord(response)
  },

  async deleteSupportRequest(id) {
    const response = await apiClient.delete(`/support-requests/${encodeURIComponent(id)}`)
    return response.data
  },

  async addReply(id, message) {
    const response = await apiClient.post(`/support-requests/${encodeURIComponent(id)}/reply`, { message })
    return normalizeSupportRequestRecord(response.data)
  },

  async closeTicket(id) {
    const response = await apiClient.post(`/support-requests/${encodeURIComponent(id)}/close`)
    return normalizeSupportRequestRecord(response.data)
  }
}
