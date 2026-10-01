import apiClient from './apiClient'

export const passwordResetApi = {
  async listRequests(status = 'pending') {
    return apiClient.get('/admin/password-reset-requests', {
      params: { status },
    })
  },

  async approveRequest(requestId) {
    return apiClient.post(`/admin/password-reset-requests/${encodeURIComponent(requestId)}/approve`)
  },

  async rejectRequest(requestId, comment = '') {
    return apiClient.post(`/admin/password-reset-requests/${encodeURIComponent(requestId)}/reject`, {
      comment,
    })
  },
}
