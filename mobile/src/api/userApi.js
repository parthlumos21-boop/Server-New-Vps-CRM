import apiClient from './client'

const unwrapData = (response, fallback) => (
  response?.data?.data ?? response?.data ?? fallback
)

export const userApi = {
  async listUsers(token) {
    // If a specific token is needed, headers can be passed
    const response = await apiClient.get('/users', { headers: { Authorization: `Bearer ${token}` } })
    return unwrapData(response, [])
  },

  async listDirectory(token) {
    const response = await apiClient.get('/users/directory', { headers: { Authorization: `Bearer ${token}` } })
    return unwrapData(response, [])
  },
}
