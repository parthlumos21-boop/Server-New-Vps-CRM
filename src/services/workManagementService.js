import apiClient from './apiClient'

export const workManagementService = {
  getOverview: async () => {
    const response = await apiClient.get('/tasks/work/overview')
    return response.data || response
  },

  getProjects: async () => {
    const response = await apiClient.get('/tasks/work/projects')
    return response.data || response
  },

  createProject: async (projectData) => {
    const response = await apiClient.post('/tasks/work/projects', projectData)
    return response.data || response
  },

  updateProject: async (id, projectData) => {
    const response = await apiClient.put(`/tasks/work/projects/${id}`, projectData)
    return response.data || response
  },

  getWorkload: async () => {
    const response = await apiClient.get('/tasks/work/workload')
    return response.data || response
  },

  getApprovals: async () => {
    const response = await apiClient.get('/tasks/work/approvals')
    return response.data || response
  },

  decideApproval: async (id, decision, comments = '') => {
    const response = await apiClient.post(`/tasks/work/approvals/${id}/decide`, { decision, comments })
    return response.data || response
  },

  getWorkflows: async () => {
    const response = await apiClient.get('/tasks/work/workflows')
    return response.data || response
  },

  createWorkflow: async (workflowData) => {
    const response = await apiClient.post('/tasks/work/workflows', workflowData)
    return response.data || response
  },
}

export default workManagementService
