import apiClient from './apiClient'

export const databaseApi = {
  getCollections: () => {
    return apiClient.get('/database/collections')
  },
  
  getCollectionData: (collectionName, params) => {
    return apiClient.get(`/database/collections/${collectionName}`, { params })
  },
  
  deleteDocument: (collectionName, documentId) => {
    return apiClient.delete(`/database/collections/${collectionName}/${documentId}`)
  },
}
