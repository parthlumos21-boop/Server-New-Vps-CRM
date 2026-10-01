import { generateId, storage } from '../../../utils/helpers'
import { getDefaultDealVisibleFields } from './dealCustomViewConfig'

export const ADMIN_DEAL_CUSTOM_VIEWS_STORAGE_KEY = 'crm_admin_deal_custom_views'
const ADMIN_DEAL_CUSTOM_VIEWS_EVENT = 'crm-admin-deal-custom-views:changed'

const normalizeArray = (value) => Array.isArray(value) ? value : []

const normalizeFilters = (filters = {}) => ({
  ownerIn: normalizeArray(filters.ownerIn),
  cityIn: normalizeArray(filters.cityIn),
  statusIn: normalizeArray(filters.statusIn),
  dealTypeIn: normalizeArray(filters.dealTypeIn),
  hasProjectName: Boolean(filters.hasProjectName),
  hasPoValue: Boolean(filters.hasPoValue),
  projectNameContains: String(filters.projectNameContains || ''),
  jobNoContains: String(filters.jobNoContains || ''),
  reasonForLostContains: String(filters.reasonForLostContains || ''),
})

const normalizeCustomView = (view = {}) => ({
  id: String(view.id || generateId('DCV')),
  name: String(view.name || 'Untitled Deal View').trim(),
  context: 'deal',
  viewType: view.viewType === 'grid' ? 'grid' : 'tabular',
  baseViewKey: String(view.baseViewKey || 'view'),
  filters: normalizeFilters(view.filters),
  visibleFields: normalizeArray(view.visibleFields).length > 0
    ? normalizeArray(view.visibleFields)
    : getDefaultDealVisibleFields(view.viewType),
  addToHomePage: Boolean(view.addToHomePage),
  createdAt: view.createdAt || new Date().toISOString(),
  updatedAt: view.updatedAt || view.createdAt || new Date().toISOString(),
})

const broadcastDealCustomViewsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_DEAL_CUSTOM_VIEWS_EVENT))
  }
}

export const getAdminDealCustomViews = () => {
  const storedViews = storage.get(ADMIN_DEAL_CUSTOM_VIEWS_STORAGE_KEY, [])
  const normalizedViews = Array.isArray(storedViews) ? storedViews.map(normalizeCustomView) : []

  return normalizedViews.sort((left, right) =>
    new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  )
}

export const getAdminDealCustomViewById = (viewId) =>
  getAdminDealCustomViews().find((view) => view.id === String(viewId || '')) || null

export const saveAdminDealCustomView = (viewDefinition) => {
  const normalizedView = normalizeCustomView(viewDefinition)
  const existingViews = getAdminDealCustomViews()
  const nextViews = [
    normalizedView,
    ...existingViews.filter((view) => view.id !== normalizedView.id),
  ]

  storage.set(ADMIN_DEAL_CUSTOM_VIEWS_STORAGE_KEY, nextViews)
  broadcastDealCustomViewsChanged()
  return normalizedView
}

export const subscribeAdminDealCustomViews = (callback) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== ADMIN_DEAL_CUSTOM_VIEWS_STORAGE_KEY) {
      return
    }

    callback(getAdminDealCustomViews())
  }

  const handleLocalEvent = () => {
    callback(getAdminDealCustomViews())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ADMIN_DEAL_CUSTOM_VIEWS_EVENT, handleLocalEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ADMIN_DEAL_CUSTOM_VIEWS_EVENT, handleLocalEvent)
  }
}
