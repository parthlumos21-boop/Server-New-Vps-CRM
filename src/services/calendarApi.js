import apiClient from './apiClient'

const unwrapData = (response, fallback) => response?.data?.data ?? response?.data ?? fallback

export const calendarApi = {
  async listEvents() {
    const response = await apiClient.get('/calendar')
    return unwrapData(response, [])
  },

  async createEvent(payload) {
    const response = await apiClient.post('/calendar', payload)
    return unwrapData(response, null)
  },
}
