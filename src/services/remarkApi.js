import apiClient from './apiClient'

const normalizeRemark = (remark = {}) => ({
  ...remark,
  id: remark.id,
  accountId: remark.accountId || remark.account_id,
  dealId: remark.dealId || remark.deal_id,
  category: remark.category || 'general',
  content: remark.content || '',
  createdBy: remark.createdBy || remark.created_by,
  createdByName: remark.createdByName || remark.created_by_name || '',
  createdByEmail: remark.createdByEmail || remark.created_by_email || '',
  accountOwnerName: remark.accountOwnerName || remark.account_owner_name || '',
  accountOwnerEmail: remark.accountOwnerEmail || remark.account_owner_email || '',
  dealOwnerName: remark.dealOwnerName || remark.deal_owner_name || '',
  dealOwnerEmail: remark.dealOwnerEmail || remark.deal_owner_email || '',
  accountName: remark.accountName || remark.account_name || '',
  dealName: remark.dealName || remark.deal_name || '',
  createdAt: remark.createdAt || remark.created_at,
  updatedAt: remark.updatedAt || remark.updated_at,
  assignmentMode: remark.assignmentMode || remark.assignment_mode || '',
  assignedUserIds: remark.assignedUserIds || remark.assigned_user_ids || [],
  assignedUserTypes: remark.assignedUserTypes || remark.assigned_user_types || [],
  assignedUserGroups: remark.assignedUserGroups || remark.assigned_user_groups || [],
})

const normalizeRemarkReminder = (reminder = {}) => ({
  ...reminder,
  id: reminder.id,
  accountId: reminder.accountId || reminder.account_id || '',
  remarkId: reminder.remarkId || reminder.remark_id || '',
  reminderDate: reminder.reminderDate || reminder.reminder_date || '',
  reminderTime: reminder.reminderTime || reminder.reminder_time || '',
  assignedTo: reminder.assignedTo || reminder.assigned_to || '',
  assignedOwnerName: reminder.assignedOwnerName || reminder.assigned_owner_name || '',
  assignedOwnerCode: reminder.assignedOwnerCode || reminder.assigned_owner_code || '',
  reminderNote: reminder.reminderNote || reminder.reminder_note || '',
  isCompleted: Boolean(reminder.isCompleted || reminder.is_completed),
  ownerUserId: reminder.ownerUserId || reminder.owner_user_id || '',
  createdBy: reminder.createdBy || reminder.created_by || '',
  remarkContent: reminder.remarkContent || reminder.remark_content || '',
})

export const remarkApi = {
  async createRemark(payload) {
    const response = await apiClient.post('/remarks', payload)
    return normalizeRemark(response.data)
  },

  async getAccountRemarks(accountId, params = {}) {
    const response = await apiClient.get(`/remarks/account/${encodeURIComponent(accountId)}`, { params })
    const payload = response?.data?.data ?? response?.data ?? {}
    const remarks = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.remarks)
        ? payload.remarks
        : []

    return {
      remarks: remarks.map(normalizeRemark),
      total: Number(payload.total || remarks.length),
    }
  },

  async getDealRemarks(dealId, params = {}) {
    const response = await apiClient.get(`/remarks/deal/${encodeURIComponent(dealId)}`, { params })
    const payload = response?.data?.data ?? response?.data ?? {}
    const remarks = Array.isArray(payload)
      ? payload
      : Array.isArray(payload.remarks)
        ? payload.remarks
        : []

    return {
      remarks: remarks.map(normalizeRemark),
      total: Number(payload.total || remarks.length),
    }
  },

  async getAllRemarks(params = {}) {
    const response = await apiClient.get('/remarks', { params })
    const payload = response?.data?.data ?? response?.data ?? []
    const remarks = Array.isArray(payload) ? payload : Array.isArray(payload.remarks) ? payload.remarks : []
    return remarks.map(normalizeRemark)
  },

  async getRemarks(query = {}) {
    if (query?.relatedEntityType === 'account' || query?.accountId) {
      const targetId = query.accountId || query.relatedEntityId
      const res = await this.getAccountRemarks(targetId)
      return res.remarks || []
    }
    if (query?.relatedEntityType === 'deal' || query?.dealId) {
      const targetId = query.dealId || query.relatedEntityId
      const res = await this.getDealRemarks(targetId)
      return res.remarks || []
    }
    return this.getAllRemarks(query)
  },

  async getRemarkReminders() {
    const response = await apiClient.get('/remark-reminders')
    const data = response?.data?.data ?? response?.data ?? []
    return Array.isArray(data) ? data.map(normalizeRemarkReminder) : []
  },

  async updateRemarkReminder(reminderId, payload) {
    const response = await apiClient.put(`/remark-reminders/${encodeURIComponent(reminderId)}`, payload)
    const data = response?.data?.data ?? response?.data ?? null
    return normalizeRemarkReminder(data || {})
  },
}
