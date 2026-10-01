import apiClient from './apiClient'

const CACHE_TTL_MS = {
  status: 60 * 1000,
  downloads: 10 * 60 * 1000,
}

const cache = {
  status: { value: null, expiresAt: 0, pending: null },
  downloads: { value: null, expiresAt: 0, pending: null },
}

const getCached = async (key, loader) => {
  const entry = cache[key]
  const now = Date.now()

  if (entry.value && entry.expiresAt > now) {
    return entry.value
  }

  if (entry.pending) {
    return entry.pending
  }

  entry.pending = loader()
    .then((value) => {
      entry.value = value
      entry.expiresAt = Date.now() + CACHE_TTL_MS[key]
      return value
    })
    .catch((error) => {
      if (entry.value && error?.response?.status === 429) {
        return entry.value
      }
      throw error
    })
    .finally(() => {
      entry.pending = null
    })

  return entry.pending
}

const clearStatusCache = () => {
  cache.status.value = null
  cache.status.expiresAt = 0
  cache.status.pending = null
}

export const integrationApi = {
  async getStatus(options = {}) {
    if (options.force) clearStatusCache()
    return getCached('status', async () => {
      const response = await apiClient.get('/integrations/status')
      return response?.data || {}
    })
  },

  async getDownloads() {
    return getCached('downloads', async () => {
      const response = await apiClient.get('/integrations/downloads')
      return response?.data || {}
    })
  },

  // WhatsApp Cloud API
  async connectWhatsappCloud(payload = {}) {
    const response = await apiClient.post('/integrations/whatsapp/connect', payload)
    return response?.data || {}
  },

  async connectWhatsappCloudManual(payload) {
    const response = await apiClient.post('/integrations/whatsapp/connect-manual', payload)
    clearStatusCache()
    return response?.data || {}
  },

  async disconnectWhatsappCloud() {
    const response = await apiClient.post('/integrations/whatsapp/disconnect')
    clearStatusCache()
    return response?.data || {}
  },

  async getWhatsappCloudStatus() {
    const response = await apiClient.get('/integrations/whatsapp/status')
    return response?.data || {}
  },

  async sendWhatsappCloud(payload) {
    const response = await apiClient.post('/integrations/whatsapp/send', payload)
    return response?.data || {}
  },

  async getWhatsappCloudChats() {
    const response = await apiClient.get('/integrations/whatsapp/chats')
    return Array.isArray(response?.data) ? response.data : []
  },

  async getWhatsappCloudMessages(chatId) {
    const response = await apiClient.get(`/integrations/whatsapp/chats/${chatId}/messages`)
    return Array.isArray(response?.data) ? response.data : []
  },

  async connectOutlook(payload = {}) {
    const response = await apiClient.post('/integrations/outlook/connect', payload)
    clearStatusCache()
    return response?.data || {}
  },

  async getOutlookStatus() {
    const response = await apiClient.get('/integrations/outlook/status')
    return response?.data || {}
  },

  async getOutlookQr(payload = {}) {
    try {
      const response = await apiClient.post('/integrations/outlook/qr', payload)
      return response?.data || {}
    } catch (error) {
      if (error?.response?.status !== 404) {
        throw error
      }

      const fallbackResponse = await apiClient.post('/integrations/outlook/connect', payload)
      const authUrl = fallbackResponse?.data?.authUrl || ''
      return {
        authUrl,
        qrImageUrl: authUrl
          ? `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=12&data=${encodeURIComponent(authUrl)}`
          : '',
        fallback: true,
      }
    }
  },

  async startOutlookDeviceCode() {
    const response = await apiClient.post('/integrations/outlook/device-code/start')
    return response?.data || {}
  },

  async completeOutlookDeviceCode() {
    const response = await apiClient.post('/integrations/outlook/device-code/complete')
    clearStatusCache()
    return response?.data || {}
  },

  async disconnectOutlook() {
    const response = await apiClient.post('/integrations/outlook/disconnect')
    clearStatusCache()
    return response?.data || {}
  },

  async sendOutlookEmail(payload) {
    const response = await apiClient.post('/integrations/outlook/send-email', payload)
    return response?.data || {}
  },

  async sendOutlookTestEmail(payload = {}) {
    const response = await apiClient.post('/integrations/outlook/send-test-email', payload)
    return response?.data || {}
  },

  async getOutlookMessages(params = {}) {
    const response = await apiClient.get('/integrations/outlook/messages', { params })
    return response?.data || {}
  },

  async getOutlookProfile() {
    const response = await apiClient.get('/integrations/outlook/profile')
    return response?.data || {}
  },

  async testOutlookConnection() {
    const response = await apiClient.post('/integrations/outlook/test-connection')
    return response?.data || {}
  },

  async connectMicrosoft365(payload = {}) {
    const response = await apiClient.post('/integrations/microsoft365/connect', payload)
    clearStatusCache()
    return response?.data || {}
  },

  async disconnectMicrosoft365() {
    const response = await apiClient.post('/integrations/microsoft365/disconnect')
    clearStatusCache()
    return response?.data || {}
  },

  async testMicrosoft365Connection() {
    const response = await apiClient.post('/integrations/microsoft365/test')
    return response?.data || {}
  },

  async getCommunicationLogs(params = {}) {
    const response = await apiClient.get('/integrations/communication-logs', { params })
    return Array.isArray(response?.data) ? response.data : []
  },
}

export default integrationApi
