import apiClient from './apiClient'

export const userGroupApi = {
  createGroup: async (groupData) => {
    const response = await apiClient.post('/user-groups', groupData)
    return response.data
  },
  listGroups: async () => {
    const response = await apiClient.get('/user-groups')
    return response.data
  },
  listGroupMembers: async (id) => {
    const response = await apiClient.get(`/user-groups/${encodeURIComponent(id)}/members`)
    return response.data
  },
  deleteGroup: async (id) => {
    const response = await apiClient.delete(`/user-groups/${id}`)
    return response.data
  }
}
