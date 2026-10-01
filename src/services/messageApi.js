import apiClient from './apiClient'

const toArray = (value) => {
  if (Array.isArray(value)) return value
  if (value === null || value === undefined || value === '') return []
  return [value]
}

const normalizeMessage = (message = {}) => {
  const recipientUserIds = toArray(message.recipientUserIds || message.receiverId).map((value) => String(value || '')).filter(Boolean)
  const recipientUserNames = toArray(message.recipientUserNames || message.receiverName).map((value) => String(value || '')).filter(Boolean)
  const targetNames = toArray(message.targetNames).length > 0
    ? toArray(message.targetNames).map((value) => String(value || '')).filter(Boolean)
    : recipientUserNames

  return {
    id: message.id,
    senderId: String(message.senderId || ''),
    senderName: message.senderName || '',
    receiverId: String(message.receiverId || ''),
    receiverName: message.receiverName || '',
    targetNames,
    recipientUserIds,
    recipientUserNames,
    recipientCount: message.recipientCount ?? recipientUserIds.length,
    body: message.body || message.message || '',
    message: message.message || message.body || '',
    createdAt: message.createdAt || new Date().toISOString(),
  }
}

export const messageApi = {
  async getMessages() {
    const response = await apiClient.get('/messages')
    return (response.data || []).map(normalizeMessage)
  },

  async sendMessage(payload) {
    const response = await apiClient.post('/messages', payload)
    const rawData = response.data

    if (Array.isArray(rawData)) {
      return rawData.map(normalizeMessage)
    }

    return [normalizeMessage(rawData)]
  },
}
