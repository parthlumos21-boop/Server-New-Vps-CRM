import apiClient from './apiClient'

export const chartApi = {
  listTemplates: async () => {
    const res = await apiClient.get('/charts/templates')
    return res.data || []
  },
  listCharts: async () => {
    const res = await apiClient.get('/charts')
    return res.data || []
  },
  getChartById: async (id) => {
    const res = await apiClient.get(`/charts/${encodeURIComponent(id)}`)
    return res.data
  },
  createChart: async (payload) => {
    const res = await apiClient.post('/charts', payload)
    return res.data
  },
  updateTemplate: async (id, payload) => {
    const res = await apiClient.put(`/charts/templates/${encodeURIComponent(id)}`, payload)
    return res.data
  },
  deleteTemplate: async (id) => {
    const res = await apiClient.delete(`/charts/templates/${encodeURIComponent(id)}`)
    return res.data
  },
  updateChart: async (id, payload) => {
    const res = await apiClient.put(`/charts/${encodeURIComponent(id)}`, payload)
    return res.data
  },
  deleteChart: async (id) => {
    const res = await apiClient.delete(`/charts/${encodeURIComponent(id)}`)
    return res.data
  },
  getChartData: async (id, params = {}) => {
    const res = await apiClient.get(`/charts/${encodeURIComponent(id)}/data`, { params })
    return res.data
  },
  listDashboardCharts: async (params = {}) => {
    const res = await apiClient.get('/dashboard/charts', { params })
    return res.data || []
  },
  patchDashboard: async (id, dashboardConfig) => {
    const res = await apiClient.patch(`/charts/${encodeURIComponent(id)}/dashboard`, dashboardConfig)
    return res.data
  },
  patchActive: async (id, active) => {
    const res = await apiClient.patch(`/charts/${encodeURIComponent(id)}/active`, { active })
    return res.data
  },
}
