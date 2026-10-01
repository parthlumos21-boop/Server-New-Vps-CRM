import api from './apiClient'

export const quotationService = {
  approve: (id: string) =>
    api.put(`/quotations/${id}/approve`),

  reject: (id: string) =>
    api.put(`/quotations/${id}/reject`),

  clone: (id: string) =>
    api.post(`/quotations/${id}/clone`),
};