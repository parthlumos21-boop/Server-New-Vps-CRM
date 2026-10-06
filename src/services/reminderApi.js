import apiClient from './apiClient'

const unwrapData = (response, fallback) => response?.data?.data ?? response?.data ?? fallback

const normalizeReminderStatus = (status) => {
  const normalized = String(status || '').trim().toLowerCase()
  if (['closed', 'completed', 'done'].includes(normalized)) return 'closed'
  if (['activated', 'activate'].includes(normalized)) return 'activated'
  return 'active'
}

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
      status: normalizeReminderStatus(reminder.status),
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
    let finalPayload = { ...payload }
    if (!payload.title || !payload.remindAt) {
      try {
        const existingResponse = await apiClient.get(`/reminders/${encodeURIComponent(id)}`)
        const existing = unwrapData(existingResponse, null)
        if (existing) finalPayload = { ...existing, ...payload }
      } catch (e) {
        console.warn('Failed to fetch existing reminder for update', e)
      }
    }
    const response = await apiClient.put(`/reminders/${encodeURIComponent(id)}`, finalPayload)
    return reminderApi.normalizeReminder(unwrapData(response, null))
  },
  async deleteReminder(id) {
    const response = await apiClient.delete(`/reminders/${encodeURIComponent(id)}`)
    return unwrapData(response, null)
  },
}
