import { generateId, storage } from '../../../utils/helpers'
import { getDefaultSupportRequestVisibleFields } from './supportRequestCustomViewConfig'

export const ADMIN_SUPPORT_REQUEST_CUSTOM_VIEW_NEW_ROUTE = '/admin/support-requests/custom-views/new'
export const ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_STORAGE_KEY = 'crm_admin_support_request_custom_views'
const ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_EVENT = 'crm-admin-support-request-custom-views:changed'

const normalizeArray = (value) => Array.isArray(value) ? value : []

const normalizeFilters = (filters = {}) => ({
  ownerIn: normalizeArray(filters.ownerIn),
  statusIn: normalizeArray(filters.statusIn),
  priorityIn: normalizeArray(filters.priorityIn),
  requestTypeIn: normalizeArray(filters.requestTypeIn),
  cityIn: normalizeArray(filters.cityIn),
  stateIn: normalizeArray(filters.stateIn),
  addedByIn: normalizeArray(filters.addedByIn),
  hasContactEmail: Boolean(filters.hasContactEmail),
  hasContactMobile: Boolean(filters.hasContactMobile),
  hasOnSiteRequirements: Boolean(filters.hasOnSiteRequirements),
  customerNameContains: String(filters.customerNameContains || ''),
  titleContains: String(filters.titleContains || ''),
  contactPersonContains: String(filters.contactPersonContains || ''),
  referenceNumberContains: String(filters.referenceNumberContains || ''),
})

const normalizeSupportRequestCustomView = (view = {}) => ({
  id: String(view.id || generateId('SRCV')),
  name: String(view.name || 'Untitled Support Request View').trim(),
  context: 'supportRequest',
  viewType: view.viewType === 'grid' ? 'grid' : 'tabular',
  classification: String(view.classification || 'all_requests'),
  filters: normalizeFilters(view.filters),
  visibleFields: normalizeArray(view.visibleFields).length > 0
    ? normalizeArray(view.visibleFields)
    : getDefaultSupportRequestVisibleFields(view.viewType),
  addToHomePage: Boolean(view.addToHomePage),
  createdAt: view.createdAt || new Date().toISOString(),
  updatedAt: view.updatedAt || view.createdAt || new Date().toISOString(),
})

const broadcastSupportRequestCustomViewsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_EVENT))
  }
}

export const buildAdminSupportRequestCustomViewUrl = (viewId) =>
  `/admin/support-requests/custom-views/${encodeURIComponent(viewId)}`

export const getAdminSupportRequestCustomViews = () => {
  const storedViews = storage.get(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_STORAGE_KEY, [])
  const normalizedViews = Array.isArray(storedViews) ? storedViews.map(normalizeSupportRequestCustomView) : []

  return normalizedViews.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export const getAdminSupportRequestCustomViewById = (viewId) =>
  getAdminSupportRequestCustomViews().find((view) => view.id === String(viewId || '')) || null

export const saveAdminSupportRequestCustomView = (viewDefinition) => {
  const normalizedView = normalizeSupportRequestCustomView(viewDefinition)
  const existingViews = getAdminSupportRequestCustomViews()
  const nextViews = [
    normalizedView,
    ...existingViews.filter((view) => view.id !== normalizedView.id),
  ]

  storage.set(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_STORAGE_KEY, nextViews)
  broadcastSupportRequestCustomViewsChanged()
  return normalizedView
}

export const subscribeAdminSupportRequestCustomViews = (callback) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_STORAGE_KEY) {
      return
    }

    callback(getAdminSupportRequestCustomViews())
  }

  const handleLocalEvent = () => {
    callback(getAdminSupportRequestCustomViews())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_EVENT, handleLocalEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ADMIN_SUPPORT_REQUEST_CUSTOM_VIEWS_EVENT, handleLocalEvent)
  }
}
