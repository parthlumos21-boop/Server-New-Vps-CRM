import apiClient from './apiClient'

const normalizeCustomView = (view = {}) => ({
  id: view.id,
  userId: view.userId ?? view.user_id,
  companyId: view.companyId ?? view.company_id,
  entityType: view.entityType ?? view.entity_type ?? '',
  name: view.name ?? '',
  columns: Array.isArray(view.columns) ? view.columns : [],
  filters: view.filters && typeof view.filters === 'object' ? view.filters : {},
  sort: view.sort && typeof view.sort === 'object' ? view.sort : {},
  isDefault: Boolean(view.isDefault ?? view.is_default),
  isShared: Boolean(view.isShared ?? view.is_shared),
})

export const customViewApi = {
  async listCustomViews(entityType) {
    const response = await apiClient.get('/custom-views', { params: entityType ? { entityType } : {} })
    const records = Array.isArray(response?.data) ? response.data : []
    return records.map(normalizeCustomView)
  },

  async createCustomView(payload) {
    const response = await apiClient.post('/custom-views', payload)
    return normalizeCustomView(response?.data || {})
  },

  async updateCustomView(id, payload) {
    const response = await apiClient.put(`/custom-views/${encodeURIComponent(id)}`, payload)
    return normalizeCustomView(response?.data || {})
  },

  async upsertCustomViewByName(payload) {
    const entityType = payload?.entityType || ''
    const name = String(payload?.name || '').trim()
    const existingViews = await this.listCustomViews(entityType)
    const existingView = existingViews.find((view) => String(view.name || '').trim() === name) || null

    if (existingView?.id) {
      return this.updateCustomView(existingView.id, payload)
    }

    return this.createCustomView(payload)
  },
}
