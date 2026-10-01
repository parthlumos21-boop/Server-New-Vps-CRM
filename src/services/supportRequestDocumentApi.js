import apiClient from './apiClient'

export const supportRequestDocumentApi = {
  uploadDocument: async (formData) => {
    const response = await apiClient.post('/support-request-documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  getDocuments: async () => {
    const response = await apiClient.get('/support-request-documents')
    return response.data
  },

  deleteDocument: async (id) => {
    const response = await apiClient.delete(`/support-request-documents/${id}`)
    return response.data
  }
}
