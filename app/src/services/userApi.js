import apiClient from './apiClient'

const unwrapData = (response, fallback) => (
  response?.data?.data ?? response?.data ?? fallback
)

const assertManagedUserId = (id) => {
  if (!/^\d+$/.test(String(id || ''))) {
    const error = new Error('Only normal managed users can be approved from this screen.')
    error.isLocalValidationError = true
    throw error
  }
}

export const userApi = {
  async listUsers(params = {}) {
    const response = await apiClient.get('/users', { params })
    return unwrapData(response, [])
  },

  async listDirectory() {
    const response = await apiClient.get('/users/directory')
    return unwrapData(response, [])
  },

  async createUser(payload) {
    const response = await apiClient.post('/users', payload)
    return unwrapData(response, null)
  },

  async updateUser(id, payload) {
    const response = await apiClient.patch(`/users/${encodeURIComponent(id)}`, payload)
    return unwrapData(response, null)
  },

  async approveUser(id) {
    assertManagedUserId(id)
    const response = await apiClient.patch(`/users/${encodeURIComponent(id)}/approve`)
    return unwrapData(response, null)
  },

  async rejectUser(id) {
    assertManagedUserId(id)
    const response = await apiClient.patch(`/users/${encodeURIComponent(id)}/reject`)
    return unwrapData(response, null)
  },

  async disableUser(id) {
    assertManagedUserId(id)
    const response = await apiClient.patch(`/users/${encodeURIComponent(id)}/disable`)
    return unwrapData(response, null)
  },

  async deleteUser(id) {
    const response = await apiClient.delete(`/users/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },
}
