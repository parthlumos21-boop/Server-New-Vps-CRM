import { generateId, storage } from '../../../utils/helpers'
import {
  CUSTOM_VIEW_FIELD_DEFINITIONS,
  DEFAULT_CUSTOM_VIEW_GROUP_BY,
  isValidCustomViewGroupByField,
} from './customViewConfig'

export const ADMIN_CUSTOM_VIEWS_STORAGE_KEY = 'crm_admin_custom_views'
const ADMIN_CUSTOM_VIEWS_EVENT = 'crm-admin-custom-views:changed'

const normalizeArray = (value) => Array.isArray(value) ? value : []
const normalizeVisibleColumns = (value) => normalizeArray(value)
  .filter((fieldKey) => typeof fieldKey === 'string' && CUSTOM_VIEW_FIELD_DEFINITIONS[fieldKey])

const normalizeFilters = (filters = {}) => ({
  stageIn: normalizeArray(filters.stageIn),
  accountSourceIn: normalizeArray(filters.accountSourceIn),
  accountStateIn: normalizeArray(filters.accountStateIn),
  accountOwnerIn: normalizeArray(filters.accountOwnerIn),
  statusIn: normalizeArray(filters.statusIn),
  hasEmail: Boolean(filters.hasEmail),
  hasPhone: Boolean(filters.hasPhone),
})

const normalizeCustomView = (view = {}) => ({
  id: String(view.id || generateId('CV')),
  name: String(view.name || 'Untitled Custom View').trim(),
  context: 'account',
  viewType: view.viewType === 'grid' ? 'grid' : 'tabular',
  classification: view.classification || 'all_accounts',
  groupByField: isValidCustomViewGroupByField(view.groupByField) ? view.groupByField : DEFAULT_CUSTOM_VIEW_GROUP_BY,
  filters: normalizeFilters(view.filters),
  visibleColumns: normalizeVisibleColumns(view.visibleColumns),
  addToHomePage: Boolean(view.addToHomePage),
  createdAt: view.createdAt || new Date().toISOString(),
  updatedAt: view.updatedAt || view.createdAt || new Date().toISOString(),
})

const broadcastCustomViewsChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_CUSTOM_VIEWS_EVENT))
  }
}

export const getAdminCustomViews = () => {
  const storedViews = storage.get(ADMIN_CUSTOM_VIEWS_STORAGE_KEY, [])
  return normalizeArray(storedViews)
    .map(normalizeCustomView)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
}

export const getAdminCustomViewById = (viewId) =>
  getAdminCustomViews().find((view) => view.id === String(viewId || '')) || null

export const saveAdminCustomView = (viewDefinition) => {
  const normalizedView = normalizeCustomView(viewDefinition)
  const existingViews = getAdminCustomViews()
  const nextViews = [
    normalizedView,
    ...existingViews.filter((view) => view.id !== normalizedView.id),
  ]

  storage.set(ADMIN_CUSTOM_VIEWS_STORAGE_KEY, nextViews)
  broadcastCustomViewsChanged()
  return normalizedView
}

export const subscribeAdminCustomViews = (callback) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== ADMIN_CUSTOM_VIEWS_STORAGE_KEY) {
      return
    }

    callback(getAdminCustomViews())
  }

  const handleLocalEvent = () => {
    callback(getAdminCustomViews())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ADMIN_CUSTOM_VIEWS_EVENT, handleLocalEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ADMIN_CUSTOM_VIEWS_EVENT, handleLocalEvent)
  }
}

export const buildAdminCustomViewUrl = (viewId, queryString = '') =>
  `/admin/accounts/custom-views/${encodeURIComponent(viewId)}${queryString}`
