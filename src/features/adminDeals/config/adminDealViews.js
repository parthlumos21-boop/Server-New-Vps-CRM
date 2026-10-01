export const ADMIN_DEAL_VIEW_DEFINITIONS = [
  { key: 'add', label: 'Add Deal', route: '/admin/deals/add', mode: 'add' },
  { key: 'view', label: 'View Deal', route: '/admin/deals/view', mode: 'view' },
  { key: 'search', label: 'Search Deal', route: '/admin/deals/search', mode: 'search' },
  { key: 'projectDetails', label: 'Project Details', route: '/admin/deals/project-details', mode: 'projectDetails' },
]

export const ADMIN_DEAL_CUSTOM_VIEW_NEW_ROUTE = '/admin/deals/custom-views/new'

export const buildAdminDealCustomViewUrl = (viewId) =>
  `/admin/deals/custom-views/${encodeURIComponent(viewId)}`

export const buildAdminDealDetailUrl = (dealId) =>
  `/admin/deals/view/${encodeURIComponent(dealId)}`

export const buildAdminManageDealUrl = (dealId) =>
  `/admin/deals/manage/${encodeURIComponent(dealId)}`

export const ADMIN_DEAL_BASE_VIEW_OPTIONS = [
  { value: 'view', label: 'View Deal' },
  { value: 'search', label: 'Search Deal' },
  { value: 'projectDetails', label: 'Project Details' },
]

export const ADMIN_DEAL_VIEW_MAP = ADMIN_DEAL_VIEW_DEFINITIONS.reduce((lookup, view) => {
  lookup[view.key] = view
  return lookup
}, {})
