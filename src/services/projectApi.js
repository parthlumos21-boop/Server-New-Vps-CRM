import apiClient from './apiClient'

export const normalizeProjectRecord = (project = {}) => ({
  ...project,
  id: project.id || project.projectId,
  projectId: project.projectId || project.id,
  projectCode: project.projectCode || project.project_code || '',
  projectName: project.projectName || project.project_name || '',
  projectDescription: project.projectDescription || project.project_description || '',
  accountId: project.accountId || project.account_id || '',
  customerId: project.customerId || project.customer_id || '',
  consultantName: project.consultantName || project.consultant_name || '',
  architectName: project.architectName || project.architect_name || '',
  pmcName: project.pmcName || project.pmc_name || '',
  projectType: project.projectType || project.project_type || '',
  projectStatus: project.projectStatus || project.project_status || 'Active',
  projectLocation: project.projectLocation || project.project_location || '',
  projectValue: project.projectValue ?? project.project_value ?? '',
  startDate: project.startDate || project.start_date || '',
  endDate: project.endDate || project.end_date || '',
  accountName: project.accountName || project.account_name || '',
  customerName: project.customerName || project.customer_name || '',
})

export const projectApi = {
  async getProjects() {
    const response = await apiClient.get('/projects')
    return (response.data || []).map(normalizeProjectRecord)
  },

  async getProjectById(id) {
    const response = await apiClient.get(`/projects/${encodeURIComponent(id)}`)
    return normalizeProjectRecord(response.data)
  },

  async createProject(payload) {
    const response = await apiClient.post('/projects', payload)
    return normalizeProjectRecord(response.data)
  },

  async updateProject(id, payload) {
    const response = await apiClient.put(`/projects/${encodeURIComponent(id)}`, payload)
    return normalizeProjectRecord(response.data)
  },

  async deleteProject(id) {
    const response = await apiClient.delete(`/projects/${encodeURIComponent(id)}`)
    return response.data
  },
}
