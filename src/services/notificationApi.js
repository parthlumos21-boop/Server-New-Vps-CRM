import apiClient from './apiClient'

const normalizeNotification = (notification = {}) => ({
  id: notification.id,
  senderId: notification.senderId,
  receiverId: notification.receiverId,
  message: notification.message || '',
  title: notification.title || 'Notification',
  type: notification.type || 'info',
  isRead: notification.isRead || false,
  timestamp: notification.createdAt || notification.timestamp || new Date().toISOString(),
  createdAt: notification.createdAt || notification.timestamp || new Date().toISOString(),
})

export const notificationApi = {
  async getNotifications() {
    const response = await apiClient.get('/notifications')
    return (response.data || []).map(normalizeNotification)
  },

  async markAsRead(id) {
    const response = await apiClient.put(`/notifications/${encodeURIComponent(id)}/read`)
    return normalizeNotification(response.data)
  },

  normalizeNotification,
}
