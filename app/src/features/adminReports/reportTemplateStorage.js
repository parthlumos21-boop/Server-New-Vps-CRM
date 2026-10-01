import { format } from 'date-fns'
import { generateId, storage } from '../../utils/helpers'
import { getCustomReportContext, getCustomReportFieldLabel } from './customReportDefinitions'

export const ADMIN_REPORT_TEMPLATES_STORAGE_KEY = 'crm_admin_report_templates'
const ADMIN_REPORT_TEMPLATES_EVENT = 'crm-admin-report-templates:changed'

const normalizeFilter = (filter = {}) => ({
  id: String(filter.id || generateId('RTF')),
  connector: String(filter.connector || 'AND'),
  field: String(filter.field || ''),
  operator: String(filter.operator || 'equals'),
  value: String(filter.value || ''),
  valueTo: String(filter.valueTo || ''),
})

const normalizeSortLevel = (sortLevel = {}) => ({
  id: String(sortLevel.id || generateId('RTS')),
  field: String(sortLevel.field || ''),
  direction: String(sortLevel.direction || 'asc'),
})

const normalizeTemplate = (template = {}) => ({
  id: String(template.id || generateId('RPT')),
  entityType: String(template.entityType || 'Account'),
  typeLabel: String(template.typeLabel || template.entityType || 'Account'),
  categoryKey: String(template.categoryKey || ''),
  templateVariant: String(template.templateVariant || ''),
  reportContext: String(template.reportContext || '').trim() || String(template.categoryKey || template.entityType || 'account').toLowerCase().replace(/\s+/g, '_'),
  reportName: String(template.reportName || 'Untitled Report').trim(),
  description: String(template.description || '').trim(),
  visibility: String(template.visibility || 'Visible to Me Only'),
  customUsers: Array.isArray(template.customUsers) ? template.customUsers.map(String) : [],
  runtimePeriodEnabled: Boolean(template.runtimePeriodEnabled),
  includeSystemRemarks: Boolean(template.includeSystemRemarks),
  timePeriodEnabled: Boolean(template.timePeriodEnabled || template.runtimePeriodEnabled),
  groupBy: String(template.groupBy || ''),
  orderBy: String(template.orderBy || ''),
  sortDirection: String(template.sortDirection || 'asc'),
  sortLevels: Array.isArray(template.sortLevels) ? template.sortLevels.map(normalizeSortLevel) : [],
  aggregate: String(template.aggregate || ''),
  filters: Array.isArray(template.filters) ? template.filters.map(normalizeFilter) : [],
  selectedFields: Array.isArray(template.selectedFields) ? template.selectedFields.map(String) : [],
  layoutOrder: Array.isArray(template.layoutOrder) ? template.layoutOrder.map(String) : [],
  createdBy: String(template.createdBy || 'System Administrator'),
  createdById: String(template.createdById || template.userId || ''),
  createdByGroup: String(template.createdByGroup || template.userGroup || ''),
  createdOn: template.createdOn || new Date().toISOString(),
  updatedAt: template.updatedAt || template.createdOn || new Date().toISOString(),
})

const deriveTemplateCategoryKey = (template) => {
  if (template.categoryKey) {
    return template.categoryKey
  }

  if (template.templateVariant === 'closed' && template.entityType === 'SR') {
    return 'closed_sr'
  }

  return getCustomReportContext(template.reportContext).categoryKey
}

const broadcastTemplatesChanged = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_REPORT_TEMPLATES_EVENT))
  }
}

const formatStoredDate = (value) => {
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return '-'
  }

  return format(parsedDate, 'dd-MM-yyyy h:mm a')
}

const buildTemplateSummary = (template) => ({
  id: template.id,
  categoryKey: deriveTemplateCategoryKey(template),
  type: template.typeLabel || template.entityType,
  title: template.reportName,
  fields: template.selectedFields
    .map((fieldKey) => getCustomReportFieldLabel(template.reportContext, fieldKey))
    .join(', ') || '-',
  filters: template.filters.length > 0
    ? template.filters
      .map((filter, index) => [
        index > 0 ? filter.connector : '',
        getCustomReportFieldLabel(template.reportContext, filter.field),
        filter.operator,
        filter.value,
        filter.operator === 'between' ? filter.valueTo : '',
      ].filter(Boolean).join(' '))
      .join('; ')
    : '',
  description: template.description || `${template.entityType} Report Template`,
  createdBy: template.createdBy,
  createdOn: formatStoredDate(template.createdOn),
  lastModified: formatStoredDate(template.updatedAt),
  visibility: template.visibility === 'Visible to Me Only' ? 'Self' : template.visibility,
  systemReport: false,
  userDefined: true,
  rawTemplate: template,
})

export const getAdminReportTemplates = () => {
  const storedTemplates = storage.get(ADMIN_REPORT_TEMPLATES_STORAGE_KEY, [])

  return (Array.isArray(storedTemplates) ? storedTemplates : [])
    .map(normalizeTemplate)
    .sort((left, right) => new Date(right.createdOn).getTime() - new Date(left.createdOn).getTime())
}

export const getAdminReportTemplateSummaries = () =>
  getAdminReportTemplates().map(buildTemplateSummary)

export const getAdminReportTemplateById = (templateId) => (
  getAdminReportTemplates().find((template) => template.id === String(templateId || '')) || null
)

export const canUserEditReportTemplate = (template, user = {}) => {
  if (!template) return false
  if (user?.role === 'admin') return true

  const currentUserId = String(user?.id || user?.userId || '')
  const currentUserName = String(user?.name || user?.username || '')
  return Boolean(
    (template.createdById && currentUserId && template.createdById === currentUserId)
    || (template.createdBy && currentUserName && template.createdBy === currentUserName)
  )
}

export const canUserViewReportTemplate = (template, user = {}) => {
  if (!template) return false
  if (canUserEditReportTemplate(template, user)) return true
  if (template.visibility === 'Visible to All' || template.visibility === 'All') return true

  const currentGroup = String(user?.userGroup || user?.group || user?.role || '')
  if (template.visibility === 'Visible to My Group' && template.createdByGroup && currentGroup) {
    return template.createdByGroup === currentGroup
  }

  const currentUserId = String(user?.id || user?.userId || '')
  const currentUserName = String(user?.name || user?.username || '')
  if (template.visibility === 'Visible to Custom Users') {
    return template.customUsers.some((entry) => entry === currentUserId || entry === currentUserName)
  }

  return false
}

export const getVisibleAdminReportTemplates = (user = {}) => (
  getAdminReportTemplates().filter((template) => canUserViewReportTemplate(template, user))
)

export const saveAdminReportTemplate = (templateDefinition) => {
  const normalizedTemplate = normalizeTemplate(templateDefinition)
  const existingTemplates = getAdminReportTemplates()
  const previousTemplate = existingTemplates.find((template) => template.id === normalizedTemplate.id)
  const templateToSave = {
    ...normalizedTemplate,
    createdOn: previousTemplate?.createdOn || normalizedTemplate.createdOn,
    updatedAt: new Date().toISOString(),
  }
  const nextTemplates = [
    templateToSave,
    ...existingTemplates.filter((template) => template.id !== templateToSave.id),
  ]

  storage.set(ADMIN_REPORT_TEMPLATES_STORAGE_KEY, nextTemplates)
  broadcastTemplatesChanged()
  return templateToSave
}

export const deleteAdminReportTemplate = (templateId) => {
  const existingTemplates = getAdminReportTemplates()
  const nextTemplates = existingTemplates.filter((template) => template.id !== String(templateId || ''))
  storage.set(ADMIN_REPORT_TEMPLATES_STORAGE_KEY, nextTemplates)
  broadcastTemplatesChanged()
}

export const subscribeAdminReportTemplates = (callback) => {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleStorage = (event) => {
    if (event.key && event.key !== ADMIN_REPORT_TEMPLATES_STORAGE_KEY) {
      return
    }

    callback(getAdminReportTemplateSummaries())
  }

  const handleLocalEvent = () => {
    callback(getAdminReportTemplateSummaries())
  }

  window.addEventListener('storage', handleStorage)
  window.addEventListener(ADMIN_REPORT_TEMPLATES_EVENT, handleLocalEvent)

  return () => {
    window.removeEventListener('storage', handleStorage)
    window.removeEventListener(ADMIN_REPORT_TEMPLATES_EVENT, handleLocalEvent)
  }
}

export const buildAddAccountReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/account/new`
export const buildAddCustomerReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/customer/new`
export const buildAddDailyStatusReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/daily-status/new`
export const buildAddDealReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/deal/new`
export const buildAddGeoTrackingReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/geo-tracking/new`
export const buildAddQuotationReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/quotation/new`
export const buildAddRemarkReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/remark/new`
export const buildAddSupportRequestReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/sr/new`
export const buildAddClosedSupportRequestReportTemplateUrl = (basePath = '/admin/reports') => `${basePath}/templates/closed-sr/new`
