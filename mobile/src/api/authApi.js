import apiClient from './client'

const unwrapData = (response, fallback) => (
  response?.data?.data ?? response?.data ?? fallback
)

export const authApi = {
  async login({ username, password, role = 'user', rememberMe = true }) {
    const response = await apiClient.post('/auth/login', {
      username,
      password,
      role,
      rememberMe,
      clientType: 'mobile',
      includeToken: true,
    })
    return unwrapData(response, null)
  },

  async me(token) {
    const response = await apiClient.get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    return unwrapData(response, null)
  },

  async refresh(refreshToken) {
    const response = await apiClient.post('/auth/refresh', {
      refreshToken,
      clientType: 'mobile',
      includeToken: true,
    })
    return unwrapData(response, null)
  },

  async logout({ token, refreshToken }) {
    const response = await apiClient.post('/auth/logout', { refreshToken }, { headers: { Authorization: `Bearer ${token}` } })
    return unwrapData(response, null)
  },
}
