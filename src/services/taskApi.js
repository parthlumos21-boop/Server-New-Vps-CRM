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

  async getTaskById(id) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(id)}`)
    const record = response?.data || response
    return normalizeTaskRecord(record)
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
}

export default taskApi
