import apiClient from './apiClient'

export const setupApi = {
  async getPublicSetupStatus() {
    const response = await apiClient.get('/setup-status')
    return response.data
  },

  async getSetupStatus() {
    const response = await apiClient.get('/settings/setup-status')
    return response.data
  },
}
