import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaCopy,
  FaDownload,
  FaEdit,
  FaEye,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaPlay,
  FaPlus,
  FaPrint,
  FaSave,
  FaSearch,
  FaSort,
  FaTrash,
} from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { customerService } from '../../../services/customerService'
import { generateId, slugify } from '../../../utils/helpers'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../../utils/excelExport'
import {
  CUSTOM_REPORT_CONTEXTS,
  CUSTOM_REPORT_FILTER_OPERATORS,
  CUSTOM_REPORT_VISIBILITY_OPTIONS,
  getCustomReportContext,
  getCustomReportFieldLabel,
  getCustomReportFields,
  getGroupedCustomReportFields,
} from '../../../features/adminReports/customReportDefinitions'
import {
  canUserEditReportTemplate,
  deleteAdminReportTemplate,
  getAdminReportTemplateById,
  getAdminReportTemplates,
  saveAdminReportTemplate,
  subscribeAdminReportTemplates,
} from '../../../features/adminReports/reportTemplateStorage'
import './CustomReportBuilderPage.css'

const emptyFilter = (connector = 'AND') => ({
  id: generateId('FLT'),
  connector,
  field: '',
  operator: 'equals',
  value: '',
  valueTo: '',
})

const emptySortLevel = () => ({
  id: generateId('SRT'),
  field: '',
  direction: 'asc',
})

const buildDraft = (user, overrides = {}) => {
  const context = overrides.reportContext || 'account'
  const fields = getCustomReportFields(context)

  return {
    id: overrides.id || '',
    reportContext: context,
    entityType: getCustomReportContext(context).label,
    categoryKey: getCustomReportContext(context).categoryKey,
    typeLabel: getCustomReportContext(context).label,
    timePeriodEnabled: Boolean(overrides.timePeriodEnabled || overrides.runtimePeriodEnabled),
    includeSystemRemarks: Boolean(overrides.includeSystemRemarks),
    reportName: overrides.reportName || `${getCustomReportContext(context).label} Custom Report`,
    description: overrides.description || '',
    visibility: overrides.visibility || 'Visible to Me Only',
    customUsers: Array.isArray(overrides.customUsers) ? overrides.customUsers : [],
    groupBy: overrides.groupBy || '',
    sortLevels: Array.isArray(overrides.sortLevels) && overrides.sortLevels.length > 0
      ? overrides.sortLevels
      : [{ ...emptySortLevel(), field: overrides.orderBy || '', direction: overrides.sortDirection || 'asc' }],
    filters: Array.isArray(overrides.filters) && overrides.filters.length > 0 ? overrides.filters : [emptyFilter()],
    selectedFields: Array.isArray(overrides.selectedFields) && overrides.selectedFields.length > 0
      ? overrides.selectedFields
      : fields.slice(0, Math.min(fields.length, 8)).map((field) => field.key),
    createdBy: overrides.createdBy || user?.name || user?.username || 'Current User',
    createdById: overrides.createdById || user?.id || user?.userId || '',
    createdByGroup: overrides.createdByGroup || user?.userGroup || user?.group || user?.role || '',
    createdOn: overrides.createdOn || new Date().toISOString(),
    updatedAt: overrides.updatedAt || new Date().toISOString(),
  }
}

const normalizeText = (value) => String(value ?? '').trim().toLowerCase()

const formatCell = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return Number.isFinite(value) ? value : '-'
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString('en-IN')
  }
  return String(value)
}

const readFieldValue = (record, fieldKey) => {
  const aliases = {
    accountName: ['accountName', 'customerName', 'name'],
    accountNumber: ['accountNumber', 'customerNumber', 'leadNumber', 'number'],
    accountDate: ['accountDate', 'dateAdded', 'createdAt', 'addedDate'],
    accountOwner: ['accountOwner', 'ownerName', 'owner', 'assignedToName'],
    accountStatus: ['accountStatus', 'status', 'stage'],
    accountCategory: ['accountCategory', 'category'],
    accountSource: ['accountSource', 'source'],
    dealName: ['dealName', 'name', 'title'],
    dealStatus: ['dealStatus', 'status'],
    dealValue: ['dealValue', 'value', 'amount'],
    dealDate: ['dealDate', 'createdAt', 'date'],
    dealOwner: ['dealOwner', 'ownerName', 'owner'],
    dealNumber: ['dealNumber', 'number'],
    srNumber: ['srNumber', 'supportRequestNumber', 'ticketNumber', 'number'],
    requestDate: ['requestDate', 'createdAt', 'date'],
    requestType: ['requestType', 'type'],
    owner: ['owner', 'ownerName', 'accountOwner', 'customerOwner', 'dealOwner', 'assignedToName'],
    title: ['title', 'name', 'taskName'],
    quotationNumber: ['quotationNumber', 'num', 'number'],
    quotationDate: ['quotationDate', 'date', 'createdAt'],
    quotationStatus: ['quotationStatus', 'status'],
    projectNumber: ['projectNumber', 'number'],
    addedOn: ['addedOn', 'createdAt'],
    addedDate: ['addedDate', 'dateAdded', 'createdAt'],
    lastUpdated: ['lastUpdated', 'updatedAt'],
  }

  const candidates = aliases[fieldKey] || [fieldKey]
  const match = candidates.find((key) => record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '')
  return match ? record[match] : ''
}

const matchesFilter = (record, filter) => {
  if (!filter.field) return true

  const rawValue = readFieldValue(record, filter.field)
  const left = normalizeText(rawValue)
  const right = normalizeText(filter.value)
  const rightTo = normalizeText(filter.valueTo)
  const numericLeft = Number(rawValue)
  const numericRight = Number(filter.value)
  const numericRightTo = Number(filter.valueTo)

  switch (filter.operator) {
    case 'not_equals':
      return left !== right
    case 'contains':
      return left.includes(right)
    case 'starts_with':
      return left.startsWith(right)
    case 'ends_with':
      return left.endsWith(right)
    case 'greater_than':
      return Number.isFinite(numericLeft) && Number.isFinite(numericRight) && numericLeft > numericRight
    case 'less_than':
      return Number.isFinite(numericLeft) && Number.isFinite(numericRight) && numericLeft < numericRight
    case 'between':
      if (Number.isFinite(numericLeft) && Number.isFinite(numericRight) && Number.isFinite(numericRightTo)) {
        return numericLeft >= numericRight && numericLeft <= numericRightTo
      }
      return left >= right && left <= rightTo
    case 'is_empty':
      return left === ''
    case 'is_not_empty':
      return left !== ''
    case 'equals':
    default:
      return left === right
  }
}

const applyFilters = (records, filters) => {
  const activeFilters = filters.filter((filter) => filter.field && filter.operator)
  if (activeFilters.length === 0) return records

  return records.filter((record) => (
    activeFilters.reduce((result, filter, index) => {
      const currentMatch = matchesFilter(record, filter)
      if (index === 0) return currentMatch
      return filter.connector === 'OR' ? result || currentMatch : result && currentMatch
    }, true)
  ))
}

const applySort = (records, sortLevels) => {
  const activeSorts = sortLevels.filter((sortLevel) => sortLevel.field)
  if (activeSorts.length === 0) return records

  return [...records].sort((left, right) => {
    for (const sortLevel of activeSorts) {
      const leftValue = readFieldValue(left, sortLevel.field)
      const rightValue = readFieldValue(right, sortLevel.field)
      const comparison = String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      if (comparison !== 0) {
        return sortLevel.direction === 'desc' ? -comparison : comparison
      }
    }
    return 0
  })
}

const toOutputRows = (records, selectedFields, contextKey) => (
  records.map((record) => (
    selectedFields.reduce((row, fieldKey) => {
      row[getCustomReportFieldLabel(contextKey, fieldKey)] = formatCell(readFieldValue(record, fieldKey))
      return row
    }, {})
  ))
)

const getExportUserName = (user) => (
  user?.name || user?.username || user?.email || 'System'
)

const getOperatorLabel = (operatorValue) => (
  CUSTOM_REPORT_FILTER_OPERATORS.find((operator) => operator.value === operatorValue)?.label
  || operatorValue
  || '-'
)

const buildFilterSummary = (draft) => {
  const filters = Array.isArray(draft.filters) ? draft.filters : []
  const activeFilters = filters.filter((filter) => filter.field)
  if (activeFilters.length === 0) return 'No filters'

  return activeFilters.map((filter, index) => {
    const fieldLabel = getCustomReportFieldLabel(draft.reportContext, filter.field)
    const connector = index > 0 ? `${filter.connector || 'AND'} ` : ''
    const value = filter.operator === 'between'
      ? `${filter.value || '-'} to ${filter.valueTo || '-'}`
      : filter.value || '-'

    if (filter.operator === 'is_empty' || filter.operator === 'is_not_empty') {
      return `${connector}${fieldLabel} ${getOperatorLabel(filter.operator)}`
    }

    return `${connector}${fieldLabel} ${getOperatorLabel(filter.operator)} ${value}`
  }).join('; ')
}

const buildSortSummary = (draft) => {
  const sortLevels = Array.isArray(draft.sortLevels) ? draft.sortLevels : []
  const activeSorts = sortLevels.filter((sortLevel) => sortLevel.field)
  if (activeSorts.length === 0) return 'No sorting'

  return activeSorts.map((sortLevel) => (
    `${getCustomReportFieldLabel(draft.reportContext, sortLevel.field)} (${sortLevel.direction === 'desc' ? 'Descending' : 'Ascending'})`
  )).join('; ')
}

const parseExportNumber = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const cleaned = value.trim().replace(/,/g, '')
  if (!cleaned || cleaned === '-') return null
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

const inferColumnType = (label, rows) => {
  const sampleValues = rows
    .map((row) => row[label])
    .filter((value) => value !== undefined && value !== null && value !== '' && value !== '-')
    .slice(0, 20)

  if (sampleValues.length > 0 && sampleValues.every((value) => parseExportNumber(value) !== null)) {
    return /count|records|qty|quantity|number$/i.test(label) ? 'integer' : 'number'
  }

  return 'text'
}

const buildExportColumns = (draft, rows) => [
  { key: '__serialNumber', label: 'Sr No', type: 'integer', align: 'center', width: 9 },
  ...draft.selectedFields.map((fieldKey) => {
    const label = getCustomReportFieldLabel(draft.reportContext, fieldKey)
    const type = inferColumnType(label, rows)

    return {
      key: label,
      label,
      type,
      align: type === 'text' ? 'left' : 'right',
      width: Math.min(34, Math.max(14, String(label).length + 4)),
    }
  }),
]

const buildExportMetadata = (draft, user, rows) => {
  const context = getCustomReportContext(draft.reportContext)
  return [
    { label: 'Report Context', value: context.label },
    { label: 'Report Name', value: draft.reportName || context.label },
    { label: 'Description', value: draft.description || '-' },
    { label: 'Visibility', value: draft.visibility || '-' },
    { label: 'Group By', value: draft.groupBy ? getCustomReportFieldLabel(draft.reportContext, draft.groupBy) : 'No grouping' },
    { label: 'Sorting', value: buildSortSummary(draft) },
    { label: 'Filters', value: buildFilterSummary(draft) },
    { label: 'Selected Fields', value: draft.selectedFields.map((fieldKey) => getCustomReportFieldLabel(draft.reportContext, fieldKey)).join(', ') || '-' },
    { label: 'Total Records', value: String(rows.length) },
    { label: 'Generated By', value: getExportUserName(user) },
    { label: 'Generated On', value: new Date().toLocaleString('en-IN') },
  ]
}

const buildOwnerWiseRows = (collections) => {
  const buckets = {}
  const addRecord = (module, record) => {
    const owner = formatCell(readFieldValue(record, 'owner'))
    const key = `${module}-${owner}`
    if (!buckets[key]) {
      buckets[key] = { owner, module, totalRecords: 0, openRecords: 0, closedRecords: 0 }
    }

    buckets[key].totalRecords += 1
    const status = normalizeText(readFieldValue(record, 'status') || readFieldValue(record, 'accountStatus') || readFieldValue(record, 'dealStatus'))
    if (status.includes('closed') || status.includes('converted') || status.includes('won')) {
      buckets[key].closedRecords += 1
    } else {
      buckets[key].openRecords += 1
    }
  }

  collections.accounts.forEach((record) => addRecord('Account', record))
  collections.customers.forEach((record) => addRecord('Customer', record))
  collections.deals.forEach((record) => addRecord('Deal', record))
  collections.supportRequests.forEach((record) => addRecord('SR', record))
  return Object.values(buckets)
}

const getSourceRecords = (contextKey, collections) => {
  if (contextKey === 'customer') return collections.customers
  if (contextKey === 'deal') return collections.deals
  if (contextKey === 'converted_deal') return collections.convertedDeals
  if (contextKey === 'project') return collections.projects
  if (contextKey === 'sr') return collections.supportRequests.filter((record) => !normalizeText(record.status).includes('closed'))
  if (contextKey === 'closed_sr') return collections.supportRequests.filter((record) => normalizeText(record.status).includes('closed'))
  if (contextKey === 'quotation') return collections.quotations
  if (contextKey === 'task' || contextKey === 'follow_up') return collections.tasks
  if (contextKey === 'activity') return collections.activities
  if (contextKey === 'contact') return collections.customers
  if (contextKey === 'converted_account') {
    return collections.accounts.filter((record) => normalizeText(record.status || record.accountStatus || record.stage).includes('converted'))
  }
  if (contextKey === 'owner_wise_reports') return buildOwnerWiseRows(collections)
  return collections.accounts
}

const canViewTemplate = (template, user) => {
  if (user?.role === 'admin') return true
  if (canUserEditReportTemplate(template, user)) return true
  if (template.visibility === 'Visible to All' || template.visibility === 'All') return true
  if (template.visibility === 'Visible to My Group') {
    return template.createdByGroup && template.createdByGroup === (user?.userGroup || user?.group || user?.role)
  }
  if (template.visibility === 'Visible to Custom Users') {
    const userId = String(user?.id || user?.userId || '')
    const userName = String(user?.name || user?.username || '')
    return template.customUsers?.includes(userId) || template.customUsers?.includes(userName)
  }
  return false
}

const getReportBucket = (template, user) => {
  if (canUserEditReportTemplate(template, user)) return 'my'
  return 'shared'
}

const buildPrintableTable = (title, rows) => {
  const headers = rows[0] ? Object.keys(rows[0]) : []
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[char]))

  return `<!doctype html><html><head><title>${escapeHtml(title)}</title><style>
    body{font-family:Arial,sans-serif;margin:24px;color:#1f2933}
    h1{font-size:18px;margin:0 0 14px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{border:1px solid #ccd6e0;padding:7px;text-align:left;vertical-align:top}
    th{background:#f0f4f8}
  </style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${headers.map((header) => `<td>${escapeHtml(row[header])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
}

const ReportsTable = ({ reports, activeId, user, onView, onEdit, onDuplicate, onDelete, onRun, isAdmin }) => (
  <div className="cr-manage-table-wrap">
    <table className="cr-manage-table">
      <thead>
        <tr>
          <th>Report Name</th>
          <th>Module</th>
          <th>Created By</th>
          <th>Visibility</th>
          <th>Last Modified</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {reports.length === 0 ? (
          <tr>
            <td colSpan="6" className="cr-empty-cell">No reports available.</td>
          </tr>
        ) : reports.map((report) => {
          const canEdit = canUserEditReportTemplate(report, user)
          return (
            <tr key={report.id} className={activeId === report.id ? 'cr-manage-row-active' : ''}>
              <td>{report.reportName}</td>
              <td>{getCustomReportContext(report.reportContext).label}</td>
              <td>{report.createdBy}</td>
              <td>{report.visibility === 'All' ? 'Visible to All' : report.visibility}</td>
              <td>{new Date(report.updatedAt || report.createdOn).toLocaleString('en-IN')}</td>
              <td>
                <div className="cr-row-actions">
                  <button type="button" title="View" onClick={() => onView(report)}><FaEye /></button>
                  <button type="button" title="Run" onClick={() => onRun(report)}><FaPlay /></button>
                  <button type="button" title="Edit" disabled={!canEdit} onClick={() => onEdit(report)}><FaEdit /></button>
                  <button type="button" title="Duplicate" onClick={() => onDuplicate(report)}><FaCopy /></button>
                  <button type="button" title="Delete" disabled={!canEdit && !isAdmin} onClick={() => onDelete(report)}><FaTrash /></button>
                </div>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  </div>
)

const CustomReportBuilderPage = ({ basePath }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const data = useData()
  const reportListPath = basePath || (location.pathname.startsWith('/admin') ? '/admin/reports' : '/reports')
  const customReportListPath = `${reportListPath}/custom`
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const requestedContext = searchParams.get('context') || ''
  const requestedReportId = searchParams.get('id') || ''
  const duplicateRequested = searchParams.get('duplicate') === '1'
  const isAdmin = user?.role === 'admin'
  const [templates, setTemplates] = useState(() => getAdminReportTemplates())
  const [draft, setDraft] = useState(() => {
    const selectedTemplate = getAdminReportTemplateById(requestedReportId)
    if (selectedTemplate) {
      return buildDraft(user, {
        ...selectedTemplate,
        id: duplicateRequested ? '' : selectedTemplate.id,
        reportName: duplicateRequested ? `${selectedTemplate.reportName} Copy` : selectedTemplate.reportName,
        createdBy: duplicateRequested ? user?.name || user?.username || 'Current User' : selectedTemplate.createdBy,
        createdById: duplicateRequested ? user?.id || user?.userId || '' : selectedTemplate.createdById,
      })
    }
    return buildDraft(user, requestedContext ? { reportContext: requestedContext } : {})
  })
  const [activeReportId, setActiveReportId] = useState('')
  const [activeManagementTab, setActiveManagementTab] = useState('my')
  const [availableSearch, setAvailableSearch] = useState('')
  const [selectedFieldKey, setSelectedFieldKey] = useState('')
  const [availableFieldKey, setAvailableFieldKey] = useState('')
  const [previewRows, setPreviewRows] = useState([])
  const [outputSort, setOutputSort] = useState({ field: '', direction: 'asc' })
  const [hasRun, setHasRun] = useState(false)
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const reportOutputRef = useRef(null)

  useEffect(() => {
    const selectedTemplate = getAdminReportTemplateById(requestedReportId)
    if (selectedTemplate) {
      setDraft(buildDraft(user, {
        ...selectedTemplate,
        id: duplicateRequested ? '' : selectedTemplate.id,
        reportName: duplicateRequested ? `${selectedTemplate.reportName} Copy` : selectedTemplate.reportName,
        createdBy: duplicateRequested ? user?.name || user?.username || 'Current User' : selectedTemplate.createdBy,
        createdById: duplicateRequested ? user?.id || user?.userId || '' : selectedTemplate.createdById,
      }))
      setActiveReportId(duplicateRequested ? '' : selectedTemplate.id)
      setHasRun(false)
      return
    }

    setDraft((current) => buildDraft(user, requestedContext ? { ...current, reportContext: requestedContext } : current))
  }, [duplicateRequested, requestedContext, requestedReportId, user])

  useEffect(() => subscribeAdminReportTemplates(() => setTemplates(getAdminReportTemplates())), [])

  const customers = useMemo(() => customerService.getCustomers(), [])
  const collections = useMemo(() => ({
    accounts: data.accounts || [],
    customers,
    deals: data.deals || [],
    convertedDeals: data.convertedDeals || [],
    supportRequests: data.supportRequests || [],
    tasks: data.tasks || [],
    quotations: data.quotations || [],
    projects: data.projects || [],
    activities: data.activities || [],
  }), [customers, data])

  const visibleTemplates = useMemo(() => templates.filter((template) => canViewTemplate(template, user)), [templates, user])
  const myReports = useMemo(() => visibleTemplates.filter((template) => getReportBucket(template, user) === 'my'), [user, visibleTemplates])
  const sharedReports = useMemo(() => visibleTemplates.filter((template) => getReportBucket(template, user) === 'shared'), [user, visibleTemplates])
  const allReports = isAdmin ? templates : visibleTemplates
  const managementReports = activeManagementTab === 'shared'
    ? sharedReports
    : activeManagementTab === 'all'
      ? allReports
      : myReports

  const contextFields = useMemo(() => getCustomReportFields(draft.reportContext), [draft.reportContext])
  const groupedFields = useMemo(() => getGroupedCustomReportFields(draft.reportContext), [draft.reportContext])
  const availableFields = useMemo(() => {
    const selected = new Set(draft.selectedFields)
    const query = normalizeText(availableSearch)
    return Object.entries(groupedFields).map(([group, fields]) => ({
      group,
      fields: fields.filter((field) => (
        !selected.has(field.key)
        && (!query || normalizeText(`${field.label} ${group}`).includes(query))
      )),
    })).filter((group) => group.fields.length > 0)
  }, [availableSearch, draft.selectedFields, groupedFields])

  const runReport = (reportDraft = draft) => {
    const source = getSourceRecords(reportDraft.reportContext, collections)
    const filtered = applyFilters(source, reportDraft.filters || [])
    const sorted = applySort(filtered, reportDraft.sortLevels || [])
    const rows = toOutputRows(sorted, reportDraft.selectedFields || [], reportDraft.reportContext)
    setPreviewRows(rows)
    setOutputSort({ field: '', direction: 'asc' })
    setHasRun(true)
    setPage(1)
    setMessage(`Report ready: ${rows.length} row(s).`)
    return rows
  }

  const handlePreviewReport = () => {
    runReport()
    window.requestAnimationFrame(() => {
      reportOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const updateDraft = (updates) => {
    setDraft((current) => {
      const next = typeof updates === 'function' ? updates(current) : { ...current, ...updates }
      if (next.reportContext !== current.reportContext) {
        return buildDraft(user, {
          ...next,
          id: current.id,
          selectedFields: getCustomReportFields(next.reportContext).slice(0, 8).map((field) => field.key),
          filters: [emptyFilter()],
          sortLevels: [emptySortLevel()],
          groupBy: '',
          reportName: `${getCustomReportContext(next.reportContext).label} Custom Report`,
        })
      }
      return next
    })
  }

  const handleSave = (saveAs = false) => {
    if (!draft.reportName.trim()) {
      setMessage('Report name is required.')
      return
    }
    if (draft.selectedFields.length === 0) {
      setMessage('Select at least one report field.')
      return
    }

    const context = getCustomReportContext(draft.reportContext)
    const saved = saveAdminReportTemplate({
      ...draft,
      id: saveAs || !draft.id ? generateId('RPT') : draft.id,
      entityType: context.label,
      typeLabel: context.label,
      categoryKey: context.categoryKey,
      selectedFields: draft.selectedFields,
      orderBy: draft.sortLevels.find((sortLevel) => sortLevel.field)?.field || '',
      sortDirection: draft.sortLevels.find((sortLevel) => sortLevel.field)?.direction || 'asc',
      createdBy: saveAs || !draft.createdBy ? user?.name || user?.username || 'Current User' : draft.createdBy,
      createdById: saveAs || !draft.createdById ? user?.id || user?.userId || '' : draft.createdById,
      createdByGroup: user?.userGroup || user?.group || user?.role || draft.createdByGroup || '',
    })
    setDraft(buildDraft(user, saved))
    setActiveReportId(saved.id)
    setTemplates(getAdminReportTemplates())
    setMessage(saveAs ? 'Report saved as a new copy.' : 'Report saved.')
  }

  const handleView = (report) => {
    setDraft(buildDraft(user, report))
    setActiveReportId(report.id)
    runReport(report)
  }

  const handleEdit = (report) => {
    setDraft(buildDraft(user, report))
    setActiveReportId(report.id)
    setHasRun(false)
    setMessage('Report loaded for editing.')
  }

  const handleDuplicate = (report) => {
    const copy = buildDraft(user, {
      ...report,
      id: '',
      reportName: `${report.reportName} Copy`,
      createdBy: user?.name || user?.username || 'Current User',
      createdById: user?.id || user?.userId || '',
    })
    setDraft(copy)
    setActiveReportId('')
    setActiveManagementTab('my')
    setHasRun(false)
    setMessage('Report duplicated. Save it when ready.')
  }

  const handleDelete = (report) => {
    if (!canUserEditReportTemplate(report, user) && !isAdmin) return
    if (!window.confirm(`Delete report "${report.reportName}"?`)) return
    deleteAdminReportTemplate(report.id)
    setTemplates(getAdminReportTemplates())
    if (activeReportId === report.id) {
      setDraft(buildDraft(user))
      setActiveReportId('')
      setPreviewRows([])
      setHasRun(false)
    }
    setMessage('Report deleted.')
  }

  const addAvailableField = (fieldKey = availableFieldKey) => {
    if (!fieldKey || draft.selectedFields.includes(fieldKey)) return
    updateDraft((current) => ({ ...current, selectedFields: [...current.selectedFields, fieldKey] }))
    setAvailableFieldKey('')
  }

  const removeSelectedField = (fieldKey = selectedFieldKey) => {
    if (!fieldKey) return
    updateDraft((current) => ({ ...current, selectedFields: current.selectedFields.filter((entry) => entry !== fieldKey) }))
    setSelectedFieldKey('')
  }

  const moveSelectedField = (fieldKey, direction) => {
    updateDraft((current) => {
      const index = current.selectedFields.indexOf(fieldKey)
      const targetIndex = index + direction
      if (index < 0 || targetIndex < 0 || targetIndex >= current.selectedFields.length) return current
      const nextFields = [...current.selectedFields]
      const [item] = nextFields.splice(index, 1)
      nextFields.splice(targetIndex, 0, item)
      return { ...current, selectedFields: nextFields }
    })
  }

  const updateFilter = (filterId, updates) => {
    updateDraft((current) => ({
      ...current,
      filters: current.filters.map((filter) => (filter.id === filterId ? { ...filter, ...updates } : filter)),
    }))
  }

  const updateSortLevel = (sortId, updates) => {
    updateDraft((current) => ({
      ...current,
      sortLevels: current.sortLevels.map((sortLevel) => (sortLevel.id === sortId ? { ...sortLevel, ...updates } : sortLevel)),
    }))
  }

  const exportRows = (format) => {
    const rows = sortedPreviewRows.length > 0 ? sortedPreviewRows : runReport()
    const fileBase = slugify(draft.reportName || 'custom-report')
    const exportOptions = {
      filename: `${fileBase}.${format === 'csv' ? 'csv' : 'xlsx'}`,
      title: draft.reportName || 'Custom Report',
      subtitle: `${getCustomReportContext(draft.reportContext).label} custom report`,
      sheetName: 'Custom Report',
      metadata: buildExportMetadata(draft, user, rows),
      columns: buildExportColumns(draft, rows),
      rows,
      generatedBy: getExportUserName(user),
      summary: [
        { label: 'Total Records', value: rows.length, type: 'integer' },
      ],
    }

    if (format === 'csv') {
      exportCsvWorkbook(exportOptions)
      return
    }

    if (format === 'excel') {
      exportExcelWorkbook(exportOptions)
      return
    }

    if (format === 'pdf' || format === 'print') {
      const frame = document.createElement('iframe')
      frame.style.position = 'fixed'
      frame.style.right = '0'
      frame.style.bottom = '0'
      frame.style.width = '0'
      frame.style.height = '0'
      frame.style.border = '0'
      document.body.appendChild(frame)
      frame.srcdoc = buildPrintableTable(draft.reportName, rows)
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => document.body.removeChild(frame), 1500)
      }
    }
  }

  const sortedPreviewRows = useMemo(() => {
    if (!outputSort.field) return previewRows
    return [...previewRows].sort((left, right) => {
      const comparison = String(left[outputSort.field] ?? '').localeCompare(String(right[outputSort.field] ?? ''), undefined, {
        numeric: true,
        sensitivity: 'base',
      })
      return outputSort.direction === 'desc' ? -comparison : comparison
    })
  }, [outputSort, previewRows])

  const handleOutputSort = (fieldName) => {
    setOutputSort((current) => (
      current.field === fieldName
        ? { field: fieldName, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { field: fieldName, direction: 'asc' }
    ))
    setPage(1)
  }

  const pagedRows = useMemo(() => sortedPreviewRows.slice((page - 1) * 25, page * 25), [page, sortedPreviewRows])
  const pageCount = Math.max(1, Math.ceil(previewRows.length / 25))

  return (
    <div className="cr-page">
      <div className="cr-topbar">
        <div>
          <h1 className="cr-topbar-title">Custom Reports</h1>
          <p className="cr-topbar-subtitle">Create, save, share, run, and export custom CRM reports.</p>
        </div>
        <div className="cr-topbar-actions">
          <button type="button" className="cr-btn cr-btn-light" onClick={() => navigate(customReportListPath)}>
            Back to Reports
          </button>
          <button type="button" className="cr-btn cr-btn-light" onClick={() => { setDraft(buildDraft(user)); setActiveReportId(''); setHasRun(false) }}>
            <FaPlus /> New
          </button>
          <button type="button" className="cr-btn cr-btn-blue" onClick={() => handleSave(false)}>
            <FaSave /> Save Report
          </button>
          <button type="button" className="cr-btn cr-btn-light" onClick={() => handleSave(true)}>
            <FaCopy /> Save As
          </button>
          <button type="button" className="cr-btn cr-btn-green" onClick={handlePreviewReport}>
            <FaPlay /> Run Report
          </button>
        </div>
      </div>

      {message && <div className="cr-message">{message}</div>}

      <div className="cr-layout">
        <main className="cr-builder">
          <section className="cr-section">
            <div className="cr-section-heading">
              <h2>Report Configuration</h2>
            </div>
            <div className="cr-config-grid">
              <label>
                <span>Report Context</span>
                <select value={draft.reportContext} onChange={(event) => updateDraft({ reportContext: event.target.value })}>
                  {CUSTOM_REPORT_CONTEXTS.map((context) => (
                    <option key={context.key} value={context.key}>{context.label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Report Name</span>
                <input value={draft.reportName} onChange={(event) => updateDraft({ reportName: event.target.value })} />
              </label>
              <label>
                <span>Visibility</span>
                <select value={draft.visibility} onChange={(event) => updateDraft({ visibility: event.target.value })}>
                  {CUSTOM_REPORT_VISIBILITY_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                </select>
              </label>
              {draft.visibility === 'Visible to Custom Users' && (
                <label>
                  <span>Custom Users</span>
                  <input
                    value={draft.customUsers.join(', ')}
                    onChange={(event) => updateDraft({
                      customUsers: event.target.value
                        .split(',')
                        .map((entry) => entry.trim())
                        .filter(Boolean),
                    })}
                    placeholder="User names or IDs, comma separated"
                  />
                </label>
              )}
              <label className="cr-field-wide">
                <span>Report Description</span>
                <textarea value={draft.description} onChange={(event) => updateDraft({ description: event.target.value })} />
              </label>
              <label className="cr-toggle">
                <input type="checkbox" checked={draft.timePeriodEnabled} onChange={(event) => updateDraft({ timePeriodEnabled: event.target.checked, runtimePeriodEnabled: event.target.checked })} />
                <span>For Time Period?</span>
              </label>
              <label className="cr-toggle">
                <input type="checkbox" checked={draft.includeSystemRemarks} onChange={(event) => updateDraft({ includeSystemRemarks: event.target.checked })} />
                <span>Include System Remarks?</span>
              </label>
            </div>
          </section>

          <section className="cr-section">
            <div className="cr-section-heading">
              <h2><FaSort /> Grouping & Sorting</h2>
              <button type="button" className="cr-mini-btn" onClick={() => updateDraft((current) => ({ ...current, sortLevels: [...current.sortLevels, emptySortLevel()] }))}>+ Sort</button>
            </div>
            <div className="cr-sort-grid">
              <label>
                <span>Group By</span>
                <select value={draft.groupBy} onChange={(event) => updateDraft({ groupBy: event.target.value })}>
                  <option value="">Select</option>
                  {contextFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                </select>
              </label>
              {draft.sortLevels.map((sortLevel) => (
                <div className="cr-sort-row" key={sortLevel.id}>
                  <label>
                    <span>Order By</span>
                    <select value={sortLevel.field} onChange={(event) => updateSortLevel(sortLevel.id, { field: event.target.value })}>
                      <option value="">Select</option>
                      {contextFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Direction</span>
                    <select value={sortLevel.direction} onChange={(event) => updateSortLevel(sortLevel.id, { direction: event.target.value })}>
                      <option value="asc">Ascending</option>
                      <option value="desc">Descending</option>
                    </select>
                  </label>
                  <button type="button" className="cr-icon-danger" onClick={() => updateDraft((current) => ({ ...current, sortLevels: current.sortLevels.filter((entry) => entry.id !== sortLevel.id) }))}><FaTrash /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="cr-section">
            <div className="cr-section-heading">
              <h2><FaFilter /> Report Filters</h2>
              <button type="button" className="cr-mini-btn" onClick={() => updateDraft((current) => ({ ...current, filters: [...current.filters, emptyFilter()] }))}>+ Filter</button>
            </div>
            <div className="cr-filter-list">
              {draft.filters.map((filter, index) => (
                <div className="cr-filter-row" key={filter.id}>
                  <select value={filter.connector} disabled={index === 0} onChange={(event) => updateFilter(filter.id, { connector: event.target.value })}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <select value={filter.field} onChange={(event) => updateFilter(filter.id, { field: event.target.value })}>
                    <option value="">Select field</option>
                    {contextFields.map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}
                  </select>
                  <select value={filter.operator} onChange={(event) => updateFilter(filter.id, { operator: event.target.value })}>
                    {CUSTOM_REPORT_FILTER_OPERATORS.map((operator) => <option key={operator.value} value={operator.value}>{operator.label}</option>)}
                  </select>
                  <input value={filter.value} disabled={filter.operator === 'is_empty' || filter.operator === 'is_not_empty'} onChange={(event) => updateFilter(filter.id, { value: event.target.value })} />
                  {filter.operator === 'between' && <input value={filter.valueTo} onChange={(event) => updateFilter(filter.id, { valueTo: event.target.value })} />}
                  <button type="button" className="cr-icon-danger" onClick={() => updateDraft((current) => ({ ...current, filters: current.filters.filter((entry) => entry.id !== filter.id) }))}><FaTrash /></button>
                </div>
              ))}
            </div>
          </section>

          <section className="cr-section">
            <div className="cr-section-heading">
              <h2>Report Fields Selection</h2>
            </div>
            <div className="cr-field-picker">
              <div className="cr-field-box">
                <div className="cr-field-box-head">
                  <strong>Available Fields</strong>
                  <div className="cr-field-search">
                    <FaSearch />
                    <input value={availableSearch} onChange={(event) => setAvailableSearch(event.target.value)} placeholder="Search fields" />
                  </div>
                </div>
                <div className="cr-field-list">
                  {availableFields.map(({ group, fields }) => (
                    <div className="cr-field-group" key={group}>
                      <div className="cr-field-group-title">{group}</div>
                      {fields.map((field) => (
                        <button
                          type="button"
                          key={field.key}
                          className={availableFieldKey === field.key ? 'active' : ''}
                          draggable
                          onDragStart={(event) => event.dataTransfer.setData('text/plain', field.key)}
                          onDoubleClick={() => addAvailableField(field.key)}
                          onClick={() => setAvailableFieldKey(field.key)}
                        >
                          {field.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="cr-field-transfer">
                <button type="button" onClick={() => addAvailableField()}>&gt;</button>
                <button type="button" onClick={() => removeSelectedField()}>&lt;</button>
              </div>

              <div className="cr-field-box">
                <div className="cr-field-box-head">
                  <strong>Selected Fields</strong>
                  <span>{draft.selectedFields.length}</span>
                </div>
                <div
                  className="cr-field-list cr-field-list-selected"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault()
                    addAvailableField(event.dataTransfer.getData('text/plain'))
                  }}
                >
                  {draft.selectedFields.map((fieldKey) => (
                    <button type="button" key={fieldKey} className={selectedFieldKey === fieldKey ? 'active' : ''} onClick={() => setSelectedFieldKey(fieldKey)}>
                      <span>{getCustomReportFieldLabel(draft.reportContext, fieldKey)}</span>
                      <span className="cr-selected-actions">
                        <span onClick={(event) => { event.stopPropagation(); moveSelectedField(fieldKey, -1) }}>Up</span>
                        <span onClick={(event) => { event.stopPropagation(); moveSelectedField(fieldKey, 1) }}>Down</span>
                        <span onClick={(event) => { event.stopPropagation(); removeSelectedField(fieldKey) }}>Remove</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="cr-section cr-output-section" ref={reportOutputRef}>
            <div className="cr-section-heading cr-section-heading--output">
              <h2>Report</h2>
              <div className="cr-output-actions">
                <button type="button" className="cr-output-action cr-output-action--preview" onClick={handlePreviewReport}><FaEye /> Preview Report</button>
                <button type="button" className="cr-output-action cr-output-action--excel" onClick={() => exportRows('excel')}><FaFileExcel /> Export Excel</button>
                <button type="button" className="cr-output-action cr-output-action--csv" onClick={() => exportRows('csv')}><FaFileCsv /> Export CSV</button>
                <button type="button" className="cr-output-action cr-output-action--pdf" onClick={() => exportRows('pdf')}><FaFilePdf /> Export PDF</button>
                <button type="button" className="cr-output-action cr-output-action--print" onClick={() => exportRows('print')}><FaPrint /> Print</button>
                <button type="button" className="cr-output-action cr-output-action--download" onClick={() => exportRows('excel')}><FaDownload /> Export</button>
              </div>
            </div>
            <div className="cr-output-wrap">
              {!hasRun ? (
                <div className="cr-output-empty">Run or preview the report to see rows here.</div>
              ) : previewRows.length === 0 ? (
                <div className="cr-output-empty">No records match this report.</div>
              ) : (
                <>
                  <table className="cr-output-table">
                    <thead>
                      <tr>{Object.keys(previewRows[0]).map((header) => (
                        <th key={header}>
                          <button type="button" className="cr-output-sort-btn" onClick={() => handleOutputSort(header)}>
                            {header}
                            {outputSort.field === header ? <span>{outputSort.direction === 'asc' ? 'Asc' : 'Desc'}</span> : null}
                          </button>
                        </th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, rowIndex) => (
                        <tr key={`${page}-${rowIndex}`}>
                          {Object.keys(previewRows[0]).map((header) => <td key={header}>{row[header]}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="cr-pagination">
                    <span>{previewRows.length} row(s)</span>
                    <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                    <span>Page {page} of {pageCount}</span>
                    <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
                  </div>
                </>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

export default CustomReportBuilderPage
