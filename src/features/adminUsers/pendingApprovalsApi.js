import apiClient from '../../services/apiClient'

export const fetchAllRegisteredUsers = async () => {
  const result = await apiClient.get('/users')
  return result?.data || []
}

export const fetchUsersByStatus = async (status) => {
  const result = await apiClient.get('/users', { params: { status } })
  return result?.data || []
}

export const approveUser = async (id) => {
  const result = await apiClient.patch(`/users/${id}/approve`)
  return result?.data
}

export const rejectUser = async (id) => {
  const result = await apiClient.patch(`/users/${id}/reject`)
  return result?.data
}

export const disableUser = async (id) => {
  const result = await apiClient.patch(`/users/${id}/disable`)
  return result?.data
}

export const enableUser = async (id) => {
  const result = await apiClient.patch(`/users/${id}/enable`)
  return result?.data
}
