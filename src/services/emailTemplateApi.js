import apiClient from './apiClient'

const unwrap = (response, fallback) => response?.data ?? fallback

export const emailTemplateApi = {
  async list(params = {}) {
    const response = await apiClient.get('/email-templates', { params })
    return unwrap(response, [])
  },

  async available(params = {}) {
    const response = await apiClient.get('/email-templates/available', { params })
    return unwrap(response, [])
  },

  async variables() {
    const response = await apiClient.get('/email-templates/variables')
    return unwrap(response, {})
  },

  async settings() {
    const response = await apiClient.get('/email-templates/settings')
    return unwrap(response, {})
  },

  async uploadSignatureImage(payload) {
    const response = await apiClient.post('/email-templates/settings/signature-image', payload)
    return unwrap(response, {})
  },

  async resolve(payload = {}) {
    const response = await apiClient.post('/email-templates/resolve', payload)
    return unwrap(response, {})
  },

  async create(payload) {
    const response = await apiClient.post('/email-templates', payload)
    return unwrap(response, {})
  },

  async update(id, payload) {
    const response = await apiClient.put(`/email-templates/${id}`, payload)
    return unwrap(response, {})
  },

  async updateStatus(id, payload) {
    const response = await apiClient.patch(`/email-templates/${id}/status`, payload)
    return unwrap(response, {})
  },

  async remove(id) {
    const response = await apiClient.delete(`/email-templates/${id}`)
    return unwrap(response, {})
  },
}

export default emailTemplateApi
