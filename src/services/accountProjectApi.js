import apiClient from './apiClient'

const getPayload = (response) => response?.data ?? response ?? null

export const accountProjectApi = {
  async searchSources(query) {
    const response = await apiClient.get('/account-projects/sources/search', {
      params: { q: query },
    })
    return getPayload(response) || []
  },

  async createExistingSourceProject(payload) {
    const response = await apiClient.post('/account-projects/existing-source-project', payload)
    return getPayload(response)
  },
}
