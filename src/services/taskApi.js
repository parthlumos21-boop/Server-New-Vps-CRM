import apiClient from './apiClient'

const normalizeTaskRecord = (task = {}) => {
  const data = task.data && typeof task.data === 'object' ? task.data : {}
  return {
    ...data,
    ...task,
    id: task.id,
    title: task.title || data.title || '',
    description: task.description || data.description || '',
    status: task.status || data.status || 'open',
    priority: task.priority || data.priority || 'medium',
    dueDate: task.dueDate || data.dueDate || '',
    relatedEntityType: task.relatedEntityType || data.relatedEntityType || '',
    relatedEntityId: task.relatedEntityId || data.relatedEntityId || '',
    assignedTo: String(task.assignedTo || data.assignedTo || ''),
    userId: String(task.createdBy || data.userId || ''),
    createdBy: String(task.createdBy || ''),
    createdAt: task.createdAt || '',
    updatedAt: task.updatedAt || '',
  }
}

export const taskApi = {
  async getTasks(params = {}) {
    const response = await apiClient.get('/tasks', { params })
    return (response.data || []).map(normalizeTaskRecord)
  },

  async getTaskById(id) {
    const response = await apiClient.get(`/tasks/${encodeURIComponent(id)}`)
    return normalizeTaskRecord(response.data)
  },

  async createTask(payload) {
    const response = await apiClient.post('/tasks', payload)
    return normalizeTaskRecord(response.data)
  },

  async updateTask(id, payload) {
    const response = await apiClient.put(`/tasks/${encodeURIComponent(id)}`, payload)
    return normalizeTaskRecord(response.data)
  },

  async deleteTask(id) {
    const response = await apiClient.delete(`/tasks/${encodeURIComponent(id)}`)
    return response.data
  },
}
