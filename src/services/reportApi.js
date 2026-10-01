import apiClient from './apiClient'

const extractList = (response, listKey) => {
  const data = response?.data ?? response
  const list = data?.data ?? data?.[listKey] ?? data
  return Array.isArray(list) ? list : []
}

export const reportApi = {
  // Report Templates (MongoDB reporttemplates collection)
  getReportTemplates: async () => {
    try {
      const response = await apiClient.get('/reports/templates')
      return extractList(response, 'templates')
    } catch (error) {
      console.error('Failed to fetch report templates:', error)
      return []
    }
  },

  createReportTemplate: async (payload) => {
    try {
      const response = await apiClient.post('/reports/templates', payload)
      return response?.data ?? response
    } catch (error) {
      console.error('Failed to create report template:', error)
      return null
    }
  },

  deleteReportTemplate: async (id) => {
    try {
      const response = await apiClient.delete(`/reports/templates/${encodeURIComponent(id)}`)
      return response?.data ?? response
    } catch (error) {
      console.error('Failed to delete report template:', error)
      return null
    }
  },

  // Generated Reports (MongoDB reports collection)
  getGeneratedReports: async () => {
    try {
      const response = await apiClient.get('/reports')
      return extractList(response, 'reports')
    } catch (error) {
      // Route /reports might not be defined on backend; fail gracefully without logging error
      return []
    }
  },

  saveGeneratedReport: async (payload) => {
    try {
      const response = await apiClient.post('/reports', payload)
      return response?.data ?? response
    } catch (error) {
      // Route /reports might not be defined on backend; fail gracefully without logging error
      return null
    }
  },
}

export default reportApi
