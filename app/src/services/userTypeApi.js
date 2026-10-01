import apiClient from './apiClient'

const unwrapData = (response, fallback) => (
  response?.data ?? fallback
)

export const userTypeApi = {
  async list(params = {}) {
    const response = await apiClient.get('/user-types', { params })
    return unwrapData(response, [])
  },

  async getById(id) {
    const response = await apiClient.get(`/user-types/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },

  async getPermissions() {
    const response = await apiClient.get('/user-types/permissions')
    return unwrapData(response, null)
  },

  async create(payload) {
    const response = await apiClient.post('/user-types', payload)
    return unwrapData(response, null)
  },

  async update(id, payload) {
    const response = await apiClient.put(`/user-types/${encodeURIComponent(id)}`, payload)
    return unwrapData(response, null)
  },

  async remove(id) {
    const response = await apiClient.delete(`/user-types/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },
}
