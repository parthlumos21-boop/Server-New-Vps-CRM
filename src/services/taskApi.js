import apiClient from './apiClient'

const normalizeTaskRecord = (task = {}) => {
  const data = task.data && typeof task.data === 'object' ? task.data : {}
  const rawAssigned = task.assignedToUserEmails || data.assignedToUserEmails
  const assignedToUserEmails = Array.isArray(rawAssigned)
    ? rawAssigned.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean)
    : (task.assignedTo || data.assignedTo ? [String(task.assignedTo || data.assignedTo).trim().toLowerCase()] : [])

  return {
    ...data,
    ...task,
    id: task.legacyId || task.id,
    title: task.title || data.title || '',
    description: task.description || data.description || '',
    status: task.status || data.status || 'open',
    priority: task.priority || data.priority || 'medium',
    dueDate: task.dueDate || data.dueDate || '',
    startDate: task.startDate || data.startDate || '',
    relatedEntityType: task.relatedEntityType || data.relatedEntityType || '',
    relatedEntityId: task.relatedEntityId || data.relatedEntityId || '',
    assignedTo: String(task.assignedTo || data.assignedTo || assignedToUserEmails[0] || ''),
    assignedToUserEmails,
    userId: String(task.createdBy || data.userId || ''),
    createdBy: String(task.createdBy || data.createdBy || ''),
    createdByEmail: String(task.createdByEmail || data.createdByEmail || task.createdBy || ''),
    createdByName: String(task.createdByName || data.createdByName || ''),
    projectId: task.projectId || data.projectId || null,
    dealId: task.dealId || data.dealId || null,
    accountId: task.accountId || data.accountId || null,
    quotationId: task.quotationId || data.quotationId || null,
    customerId: task.customerId || data.customerId || null,
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : (Array.isArray(data.subtasks) ? data.subtasks : []),
    progress: typeof task.progress === 'number' ? task.progress : (typeof data.progress === 'number' ? data.progress : 0),
    followers: Array.isArray(task.followers) ? task.followers : (Array.isArray(data.followers) ? data.followers : []),
    slaStatus: task.slaStatus || data.slaStatus || 'compliant',
    slaDeadline: task.slaDeadline || data.slaDeadline || null,
    tags: Array.isArray(task.tags) ? task.tags : (Array.isArray(data.tags) ? data.tags : []),
    createdAt: task.createdAt || '',
    updatedAt: task.updatedAt || '',
  }
}

export const taskApi = {
  async getTasks(params = {}) {
    const response = await apiClient.get('/tasks', { params })
    const list = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : [])
    return list.map(normalizeTaskRecord)
  },

  async getTasksCreatedByMe() {
    const response = await apiClient.get('/tasks/created-by-me')
    const list = Array.isArray(response) ? response : (Array.isArray(response?.data) ? response.data : [])
    return list.map(normalizeTaskRecord)
  },

  async getTaskById(id) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(id)}`)
    const record = response?.data || response
    return normalizeTaskRecord(record)
  },

  async getTaskDetails(id) {
    try {
      const response = await apiClient.get(`/tasks/${encodeURIComponent(id)}/details`)
      const record = response?.data || response
      return normalizeTaskRecord(record)
    } catch (e) {
      return this.getTaskById(id)
    }
  },

  async createTask(payload) {
    const response = await apiClient.post('/tasks', payload)
    const record = response?.data || response
    return normalizeTaskRecord(record)
  },

  async updateTask(id, payload) {
    const response = await apiClient.put(`/tasks/${encodeURIComponent(id)}`, payload)
    const record = response?.data || response
    return normalizeTaskRecord(record)
  },

  async deleteTask(id) {
    const response = await apiClient.delete(`/tasks/${encodeURIComponent(id)}`)
    return response?.data || response
  },

  async getComments(taskId) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(taskId)}/comments`)
    const list = response?.data || response
    return Array.isArray(list) ? list : []
  },

  async addComment(taskId, payload) {
    const response = await apiClient.post(`/tasks/${encodeURIComponent(taskId)}/comments`, payload)
    return response?.data || response
  },

  async editComment(taskId, commentId, payload) {
    const response = await apiClient.patch(
      `/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`,
      payload
    )
    return response?.data || response
  },

  async deleteComment(taskId, commentId) {
    const response = await apiClient.delete(
      `/tasks/${encodeURIComponent(taskId)}/comments/${encodeURIComponent(commentId)}`
    )
    return response?.data || response
  },

  async getActivity(taskId) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(taskId)}/activity`)
    const list = response?.data || response
    return Array.isArray(list) ? list : []
  },

  async getTimeEntries(taskId) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(taskId)}/time-entries`)
    const list = response?.data || response
    return Array.isArray(list) ? list : []
  },

  async addTimeEntry(taskId, payload) {
    const response = await apiClient.post(`/tasks/${encodeURIComponent(taskId)}/time-entries`, payload)
    return response?.data || response
  },

  async getReaders(taskId) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(taskId)}/readers`)
    return response?.data || response || { readers: [], readCount: 0, totalCount: 8 }
  },

  async markAsRead(taskId) {
    const response = await apiClient.post(`/tasks/${encodeURIComponent(taskId)}/read`)
    return response?.data || response
  },

  async getAttachments(taskId) {
    const response = await apiClient.get('/attachments', {
      params: { entityType: 'task', entityId: String(taskId) },
    })
    const list = response?.data || response
    return Array.isArray(list) ? list : []
  },

  async uploadAttachment(formData) {
    const response = await apiClient.post('/attachments', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return response?.data || response
  },

  async deleteAttachment(attachmentId) {
    const response = await apiClient.delete(`/attachments/${encodeURIComponent(attachmentId)}`)
    return response?.data || response
  },

  async getCrmWorkflowLinks() {
    const response = await apiClient.get('/tasks/crm-workflow-links')
    return response?.data || response
  },
}

export default taskApi
