import api from './apiClient'

export const productApi = {
  // Settings
  getSettings: () => api.get('/products/settings').then(res => res.data.data),
  updateSettings: (payload) => api.put('/products/settings', payload).then(res => res.data.data),

  // Products
  getProducts: (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.search) params.append('search', filters.search)
    if (filters.productGroup) params.append('productGroup', filters.productGroup)
    if (filters.active !== undefined) params.append('active', filters.active)
    return api.get(`/products?${params.toString()}`).then(res => res.data.data)
  },
  getProductById: (id) => api.get(`/products/${id}`).then(res => res.data.data),
  createProduct: (payload) => api.post('/products', payload).then(res => res.data.data),
  updateProduct: (id, payload) => api.put(`/products/${id}`, payload).then(res => res.data.data),
  deleteProduct: (id) => api.delete(`/products/${id}`).then(res => res.data.data),
}

export default productApi
