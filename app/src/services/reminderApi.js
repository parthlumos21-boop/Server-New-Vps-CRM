import apiClient from './apiClient'

const unwrapData = (response, fallback) => response?.data?.data ?? response?.data ?? fallback

export const reminderApi = {
  normalizeReminder(reminder = {}) {
    const reminderDate = reminder.reminderDate || String(reminder.remindAt || '').slice(0, 10)
    const reminderTime = reminder.reminderTime || String(reminder.remindAt || '').slice(11, 16) || '09:00'

    return {
      ...reminder,
      id: String(reminder.id || ''),
      title: reminder.title || 'Reminder',
      message: reminder.message || reminder.note || '',
      note: reminder.note || reminder.message || '',
      status: ['closed', 'completed', 'done'].includes(String(reminder.status || '').toLowerCase()) ? 'closed' : 'active',
      reminderDate,
      reminderTime,
      reminderMode: reminder.reminderMode || reminder.recurrence || 'Follow Up',
      remindAt: reminder.remindAt || (reminderDate ? `${reminderDate}T${reminderTime || '09:00'}:00` : ''),
      assignedTo: reminder.assignedTo != null ? String(reminder.assignedTo) : '',
      createdBy: reminder.createdBy != null ? String(reminder.createdBy) : '',
    }
  },
  async getReminders() {
    const response = await apiClient.get('/reminders')
    return unwrapData(response, []).map((entry) => reminderApi.normalizeReminder(entry))
  },
  async createReminder(payload) {
    const response = await apiClient.post('/reminders', payload)
    return reminderApi.normalizeReminder(unwrapData(response, null))
  },
  async updateReminder(id, payload) {
    const response = await apiClient.put(`/reminders/${encodeURIComponent(id)}`, payload)
    return reminderApi.normalizeReminder(unwrapData(response, null))
  },
  async deleteReminder(id) {
    const response = await apiClient.delete(`/reminders/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },
}
