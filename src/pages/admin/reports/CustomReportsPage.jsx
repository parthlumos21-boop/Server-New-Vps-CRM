import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaCog,
  FaCopy,
  FaCreditCard,
  FaDownload,
  FaEdit,
  FaEye,
  FaFilter,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaFileCode,
  FaObjectGroup,
  FaPlay,
  FaTable,
  FaTrash,
} from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { exportExcelWorkbook, exportCsvWorkbook } from '../../../utils/excelExport'
import apiClient from '../../../services/apiClient'
import reportApi from '../../../services/reportApi'
import { customerService } from '../../../services/customerService'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import {
  CUSTOM_REPORT_CONTEXTS,
  getCustomReportContext,
  getCustomReportFieldLabel,
} from '../../../features/adminReports/customReportDefinitions'
import {
  canUserEditReportTemplate,
  canUserViewReportTemplate,
  deleteAdminReportTemplate,
  getAdminReportTemplates,
  subscribeAdminReportTemplates,
} from '../../../features/adminReports/reportTemplateStorage'
import { ACCOUNT_REPORT_FIELD_OPTIONS } from '../../../features/adminReports/accountReportTemplateConfig'
import { DEAL_REPORT_FIELD_OPTIONS } from '../../../features/adminReports/dealReportTemplateConfig'
import { QUOTATION_REPORT_FIELD_OPTIONS } from '../../../features/adminReports/quotationReportTemplateConfig'
import { CUSTOMER_REPORT_FIELD_OPTIONS } from '../../../features/adminReports/customerReportTemplateConfig'
import './CustomReportsPage.css'

const resolveLabel = (type, key) => {
  const customLabel = getCustomReportFieldLabel(type, key)
  if (customLabel) return customLabel
  if (type === 'account') {
    return ACCOUNT_REPORT_FIELD_OPTIONS.find(f => f.key === key)?.label || key
  }
  if (type === 'deal') {
    return DEAL_REPORT_FIELD_OPTIONS.find(f => f.key === key)?.label || key
  }
  if (type === 'quotation') {
    return QUOTATION_REPORT_FIELD_OPTIONS.find(f => f.key === key)?.label || key
  }
  if (type === 'customer') {
    return CUSTOMER_REPORT_FIELD_OPTIONS.find(f => f.key === key)?.label || key
  }
  return key
}

const normalizeEntityKey = (value = 'account') => {
  const key = String(value || 'account').toLowerCase().trim()
  if (key === 'accounts' || key === 'lead' || key === 'leads') return 'account'
  if (key === 'customers') return 'customer'
  if (key === 'deals') return 'deal'
  if (key === 'quotations') return 'quotation'
  return key
}

const getReportDisplayFieldKeys = (report) => {
  if (Array.isArray(report.displayFields) && report.displayFields.length > 0) return report.displayFields
  if (Array.isArray(report.selectedFields) && report.selectedFields.length > 0) return report.selectedFields
  return []
}

const applyReportFilters = (data, filters) => {
  if (!filters || !Array.isArray(filters) || filters.length === 0) return data
  
  return data.filter(item => {
    let result = true
    for (let i = 0; i < filters.length; i++) {
      const filter = filters[i]
      if (!filter || (!filter.field && !filter.label)) continue
      
      const fieldKey = filter.field || filter.label
      const itemVal = item[fieldKey]
      const strVal = itemVal !== null && itemVal !== undefined ? String(itemVal).toLowerCase() : ''
      const targetVal = filter.value ? String(filter.value).toLowerCase() : ''
      
      let conditionMet = false
      switch (filter.operator) {
        case 'equals':
        case '=':
          conditionMet = strVal === targetVal
          break
        case 'not_equals':
        case '!=':
          conditionMet = strVal !== targetVal
          break
        case 'contains':
          conditionMet = strVal.includes(targetVal)
          break
        case 'not_contains':
          conditionMet = !strVal.includes(targetVal)
          break
        case 'starts_with':
          conditionMet = strVal.startsWith(targetVal)
          break
        case 'ends_with':
          conditionMet = strVal.endsWith(targetVal)
          break
        case 'greater_than':
        case '>':
          conditionMet = Number(itemVal) > Number(filter.value)
          break
        case 'less_than':
        case '<':
          conditionMet = Number(itemVal) < Number(filter.value)
          break
        case 'between':
          conditionMet = Number(itemVal) >= Number(filter.value) && Number(itemVal) <= Number(filter.valueTo)
          break
        case 'is_empty':
          conditionMet = strVal === ''
          break
        case 'is_not_empty':
          conditionMet = strVal !== ''
          break
        default:
          conditionMet = true
      }
      
      const connector = filter.connector || (i > 0 ? 'AND' : 'AND')
      if (i === 0) {
        result = conditionMet
      } else if (connector.toUpperCase() === 'OR') {
        result = result || conditionMet
      } else {
        result = result && conditionMet
      }
    }
    return result
  })
}

const TEMPLATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'account', label: 'Accounts' },
  { key: 'customer', label: 'Customers' },
  { key: 'deal', label: 'Deals' },
  { key: 'quotation', label: 'Quotations' },
  { key: 'custom', label: 'Custom' },
]

const ADD_TEMPLATE_CONTEXT_OPTIONS = [
  'account',
  'customer',
  'deal',
  'quotation',
]

const ADD_TEMPLATE_LABELS = {
  account: 'Account',
  customer: 'Customer',
  sr: 'SR',
  closed_sr: 'Closed SR',
  deal: 'Deal',
  quotation: 'Quotation',
  geo_tracking: 'Geo Tracking',
  remark: 'Remark',
  daily_status: 'Daily Status',
}

const SYSTEM_REPORTS = [
  {
    id: 'system-account-daily-status',
    categoryKey: 'account',
    group: 'Accounts',
    title: 'Daily Status Report',
    type: 'Account',
    fields: 'Account No., Account Name, Remark Date/Time, Remark Type, Remark Added By, Remarks',
    description: 'Daily Status Report',
    createdBy: 'Admin',
    createdOn: '04-11-2017 12:15 PM',
    visibility: 'All',
    systemReport: true,
  },
  {
    id: 'system-account-report',
    categoryKey: 'account',
    group: 'Accounts',
    title: 'Report',
    type: 'Account',
    fields: 'Account Name, Account Date, Account Owner, Contact Person, Phone, Email, Reason For Lost, Project Name, Location, Added By',
    filters: 'Reason For Lost is empty',
    description: 'Account Report Template',
    createdBy: 'Keval V Shah',
    createdOn: '28-07-2025 3:16 PM',
    visibility: 'Self',
  },
  {
    id: 'system-customer-daily-status',
    categoryKey: 'customer',
    group: 'Customers',
    title: 'Daily Status Report',
    fields: 'Customer No., Customer Name, Remark Date/Time, Remark Type, Remark Added By, Remarks',
    description: 'Daily Status Report',
    createdBy: 'Admin',
    createdOn: '04-11-2017 12:15 PM',
    visibility: 'All',
    systemReport: true,
  },
  {
    id: 'system-deal-report',
    categoryKey: 'deal',
    group: 'Deals',
    title: 'Deal Report',
    fields: 'Deal No., Deal Type, Deal Name, Deal Owner, Deal Status, Deal Value, Project Name, Consultant Name',
    filters: 'Customer Name is not empty',
    groupBy: 'Customer Name',
    description: 'Deal Report Template',
    createdBy: 'Keval V Shah',
    createdOn: '25-07-2025 4:14 PM',
    visibility: 'Self',
  },
  {
    id: 'system-remark-week',
    categoryKey: 'remark',
    group: 'Remark',
    title: 'Last 1 Week Update',
    type: 'Account',
    fields: 'Account No., Account Name, Account Date, Account Category, Account Owner, Account Status, Account Source, Remark Added By, Remark Added On, Remark Type, Remark Note',
    filters: 'Remark Added On is within last 1 week(s)',
    groupBy: 'Remark Added By',
    description: 'Custom Report Template',
    createdBy: 'Keval V Shah',
    createdOn: '16-07-2025 10:18 AM',
    visibility: 'Custom',
  },
]

const formatStoredDate = (value) => {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value || '-'
  return parsed.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const normalizeVisibility = (value) => {
  if (value === 'Visible to Me Only') return 'Self'
  if (value === 'Visible to All') return 'All'
  if (value === 'Visible to My Group') return 'My Group'
  if (value === 'Visible to Custom Users') return 'Custom'
  return value || 'Self'
}

const getReportGroupName = (report) => {
  if (report.group) return report.group
  const category = normalizeEntityKey(report.categoryKey || report.entityType || getCustomReportContext(report.reportContext).categoryKey)
  return TEMPLATE_FILTERS.find((entry) => entry.key === category)?.label || getCustomReportContext(report.reportContext).label
}

const getReportType = (report) => report.type || report.typeLabel || report.entityType || getCustomReportContext(report.reportContext).label

const getReportFields = (report) => {
  const contextKey = normalizeEntityKey(report.entityType || report.reportContext || 'account')
  const displayFields = getReportDisplayFieldKeys(report)
  if (displayFields.length > 0) {
    return displayFields
      .map((fieldKey) => resolveLabel(contextKey, fieldKey))
      .join(', ')
  }
  if (report.fields) {
    if (Array.isArray(report.fields)) {
      return report.fields.map(f => typeof f === 'object' ? f.label : f).join(', ')
    }
    return report.fields
  }
  return '-'
}

const getReportFilters = (report) => {
  if (report.filtersText || typeof report.filters === 'string') return report.filtersText || report.filters
  const contextKey = normalizeEntityKey(report.entityType || report.reportContext || 'account')
  const filters = Array.isArray(report.filters) ? report.filters : []
  if (filters.length === 0) return ''
  return filters
    .filter((filter) => filter && (filter.field || filter.label))
    .map((filter, index) => [
      index > 0 ? (filter.connector || 'AND') : '',
      getCustomReportFieldLabel(contextKey, filter.field) || filter.field || filter.label,
      filter.operator || '=',
      filter.value || '',
      filter.operator === 'between' ? (filter.valueTo || '') : '',
    ].filter(Boolean).join(' '))
    .join('; ')
}

const getReportGroupBy = (report) => (
  report.groupBy
    ? resolveLabel(normalizeEntityKey(report.entityType || report.reportContext || 'account'), report.groupBy)
    : ''
)

const ReportCard = ({ report, onViewWeb, onExport, isKevalOrAdmin }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handleOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  return (
    <article className="cr-list-card">
      <header className="cr-list-card-header">
        <div className="cr-list-card-title-row">
          <button type="button" className="cr-list-card-title" onClick={() => onViewWeb(report)}>
            {report.name || report.title || report.reportName}
          </button>
        </div>
        <div className="cr-list-actions" ref={menuRef} style={{ position: 'relative' }}>
          {getReportType(report) && <span className="cr-list-card-type">{getReportType(report)}</span>}
          <span className="cr-list-card-divider" style={{ color: '#d0d8e4', margin: '0 0.25rem' }}>|</span>
          {isKevalOrAdmin ? (
            <>
              <button 
                type="button" 
                title="Settings" 
                className="cr-settings-btn cr-cog-btn" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <FaCog />
              </button>
              
              {dropdownOpen && (
                <div className="cr-card-dropdown-menu" style={{ padding: '0', minWidth: '170px' }}>
                  <button type="button" className="cr-dropdown-item" onClick={() => { setDropdownOpen(false); onExport(report, 'csv') }}>
                    <FaFileCsv className="cr-dropdown-export-icon" />
                    <span className="cr-dropdown-export-label">Export to CSV</span>
                  </button>
                  <button type="button" className="cr-dropdown-item" onClick={() => { setDropdownOpen(false); onExport(report, 'excel') }}>
                    <FaFileExcel className="cr-dropdown-export-icon" />
                    <span className="cr-dropdown-export-label">Export to Excel</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <button 
              type="button" 
              title="View Report" 
              className="cr-settings-btn cr-eye-btn" 
              onClick={() => onViewWeb(report)}
            >
              <FaEye />
            </button>
          )}
        </div>
      </header>

      <div className="cr-list-card-body">
        <div className="cr-list-card-left">
          <div className="cr-list-row">
            <FaTable />
            <span><strong>Template Fields-</strong> {getReportFields(report)}</span>
          </div>
          {getReportFilters(report) && (
            <div className="cr-list-row">
              <FaFilter />
              <span><strong>Filters-</strong> {getReportFilters(report)}</span>
            </div>
          )}
          {getReportGroupBy(report) && (
            <div className="cr-list-row">
              <FaObjectGroup />
              <span><strong>Group By-</strong> {getReportGroupBy(report)}</span>
            </div>
          )}
        </div>

        <div className="cr-list-card-right">
          <div className="cr-list-row">
            <FaCreditCard />
            <span><strong>Description-</strong> {report.description || '-'}</span>
          </div>
          <div className="cr-list-row">
            <FaCalendarAlt />
            <span><strong>Created By-</strong> {report.creatorName || report.createdBy || 'Admin'} <strong>On-</strong> {formatStoredDate(report.createdAt || report.createdOn)}</span>
          </div>
          <div className="cr-list-row">
            <FaEye />
            <span>
              <strong>Visibility-</strong> {normalizeVisibility(report.visibility)}
              {normalizeVisibility(report.visibility) === 'Custom' && <span className="cr-list-visibility-badge">v</span>}
            </span>
          </div>
        </div>
      </div>
    </article>
  )
}

const WebReportModal = ({ report, onClose }) => {
  if (!report) return null

  const fields = getReportFields(report).split(',').map(f => f.trim())

  return (
    <div className="cr-web-modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem'
    }}>
      <div className="cr-web-modal" style={{
        background: '#fff', width: '100%', maxWidth: '1200px', height: '80vh',
        display: 'flex', flexDirection: 'column', borderRadius: '4px', overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
      }}>
        <header className="cr-web-modal-header" style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.75rem 1.25rem', borderBottom: '1px solid #ddd'
        }}>
          <h2 style={{ fontSize: '1rem', margin: 0, color: '#333' }}>Web Report (Total Records - 0)</h2>
          <button type="button" onClick={onClose} style={{
            background: 'transparent', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: '#555'
          }}>&#10006;</button>
        </header>
        <div className="cr-web-modal-subhead" style={{
          background: '#f9f9f9', padding: '0.75rem 1.25rem', borderBottom: '1px solid #eee'
        }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#333' }}>{report.title || report.reportName}</h3>
        </div>
        <div className="cr-web-modal-body" style={{ flex: 1, overflow: 'auto', padding: '1rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
            <thead>
              <tr>
                {fields.map((field, idx) => (
                  <th key={idx} style={{
                    background: '#f4f4f4', color: '#333', padding: '0.65rem 0.5rem', textAlign: 'left',
                    borderBottom: '2px solid #ccc', borderRight: '1px solid #ddd', fontSize: '0.85rem', fontWeight: 600
                  }}>{field}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Empty state for records */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

const SplitDropdown = ({ label, options, isOpen, buttonRef, onToggle, onSelect }) => (
  <div className="cr-list-split" ref={buttonRef}>
    <button type="button" className="cr-list-primary-btn btn-red-theme" onClick={() => onSelect(options[0].key)}>
      {label}
    </button>
    <button type="button" className="cr-list-caret-btn btn-red-theme" onClick={onToggle} aria-label={`Open ${label} menu`}>
      <span />
    </button>
    {isOpen && (
      <div className="cr-list-dropdown">
        {options.map((option) => (
          <button key={option.key} type="button" onClick={() => onSelect(option.key)}>
            {option.label}
          </button>
        ))}
      </div>
    )}
  </div>
)

const CustomReportsPage = ({ basePath = '/admin/reports' }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accounts = [], deals = [], convertedDeals = [], quotations = [] } = useData()
  const customers = useMemo(() => customerService.getCustomers() || [], [])
  const isAdmin = user?.role === 'admin'
  const normalizedIdentity = [
    user?.name,
    user?.username,
    user?.email,
  ].map((value) => String(value || '').trim().toLowerCase())
  const isKeval = normalizedIdentity.some((value) => (
    value === 'keval v shah'
    || value === 'keval v. shah'
    || value.startsWith('keval.v.shah@')
    || value.startsWith('kevalvshah@')
  ))
  const isSamirSheth = normalizedIdentity.some((value) => (
    value === 'samir sheth'
    || value === 'samir seth'
    || value.startsWith('samir.sheth@')
    || value.startsWith('samirsheth@')
    || value.startsWith('samir.seth@')
    || value.startsWith('samirseth@')
  ))
  const canCreateReportTemplate = isAdmin && (isKeval || isSamirSheth)
  const isKevalOrAdmin = isAdmin || isKeval
  const addRef = useRef(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeCustomSubFilter, setActiveCustomSubFilter] = useState('account')
  const [activeManagementTab, setActiveManagementTab] = useState(isAdmin ? 'all' : 'shared')
  const [addOpen, setAddOpen] = useState(false)
  const [templates, setTemplates] = useState(() => getAdminReportTemplates())
  const [backendTemplates, setBackendTemplates] = useState([])
  const [generatedReports, setGeneratedReports] = useState([])
  const [webReport, setWebReport] = useState(null)

  useEffect(() => subscribeAdminReportTemplates(() => setTemplates(getAdminReportTemplates())), [])

  const loadBackendReportsData = useCallback(async () => {
    try {
      const tplData = await reportApi.getReportTemplates()
      if (Array.isArray(tplData)) {
        setBackendTemplates(tplData.map(tpl => ({
          ...tpl,
          id: String(tpl._id || tpl.id),
          name: tpl.name || tpl.reportName || '-',
          title: tpl.name || tpl.reportName || '-',
          reportName: tpl.name || tpl.reportName || '-',
          entityType: tpl.entityType || 'Account',
          categoryKey: normalizeEntityKey(tpl.entityType || 'account'),
          reportContext: normalizeEntityKey(tpl.entityType || 'account'),
          displayFields: Array.isArray(tpl.displayFields) ? tpl.displayFields : (Array.isArray(tpl.selectedFields) ? tpl.selectedFields : []),
          filters: Array.isArray(tpl.filters) ? tpl.filters : [],
          description: tpl.description || '',
          createdBy: tpl.creatorName || tpl.createdBy || '-',
          creatorName: tpl.creatorName || tpl.createdBy || '-',
          createdOn: tpl.createdAt || tpl.createdOn,
          createdAt: tpl.createdAt || tpl.createdOn,
          visibility: tpl.visibility || 'All',
          isBackend: true,
          userDefined: true,
          systemReport: false,
        })))
      }
    } catch (error) {
      console.error('Failed to fetch backend templates:', error)
    }

    try {
      const rptData = await reportApi.getGeneratedReports()
      if (Array.isArray(rptData) && rptData.length > 0) {
        setGeneratedReports(rptData.map(rpt => ({
          ...rpt,
          id: String(rpt._id || rpt.id),
          name: rpt.reportName || rpt.name || '-',
          title: rpt.reportName || rpt.name || '-',
          reportName: rpt.reportName || rpt.name || '-',
          entityType: rpt.entityType || 'Account',
          categoryKey: normalizeEntityKey(rpt.entityType || 'account'),
          reportContext: normalizeEntityKey(rpt.entityType || 'account'),
          displayFields: Array.isArray(rpt.displayFields) ? rpt.displayFields : (Array.isArray(rpt.selectedFields) ? rpt.selectedFields : []),
          filters: Array.isArray(rpt.filters) ? rpt.filters : [],
          isGenerated: true,
          isBackend: true,
          createdBy: rpt.creatorName || rpt.createdBy || '-',
          creatorName: rpt.creatorName || rpt.createdBy || '-',
          createdOn: rpt.createdAt || rpt.createdOn,
          createdAt: rpt.createdAt || rpt.createdOn,
          visibility: rpt.visibility || 'All',
        })))
      }
    } catch (error) {
      // Ignore gracefully if generated reports route is not defined
    }
  }, [])

  useEffect(() => {
    loadBackendReportsData()
  }, [loadBackendReportsData])

  useEffect(() => {
    const handleOutside = (event) => {
      if (addRef.current && !addRef.current.contains(event.target)) setAddOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const addTemplateOptions = useMemo(() => ADD_TEMPLATE_CONTEXT_OPTIONS.map((key) => ({
    key,
    label: ADD_TEMPLATE_LABELS[key],
  })), [])

  const customReports = useMemo(() => {
    const combined = [
      ...templates.filter((report) => canUserViewReportTemplate(report, user)),
      ...backendTemplates,
      ...generatedReports,
    ]
    return combined.map((report) => {
      const entityKey = normalizeEntityKey(report.entityType || report.categoryKey || report.reportContext || 'account')
      const baseGroup = getReportGroupName(report)
      return {
        ...report,
        name: report.name || report.reportName || report.title || '-',
        categoryKey: entityKey,
        group: baseGroup,
        isCustom: true,
      }
    })
  }, [templates, backendTemplates, generatedReports, user])

  const customMongoReports = useMemo(() => {
    return [...backendTemplates, ...generatedReports].map((report) => {
      const entityKey = normalizeEntityKey(report.entityType || report.categoryKey || report.reportContext || 'account')
      return {
        ...report,
        name: report.name || report.reportName || report.title || '-',
        categoryKey: entityKey,
        group: getReportGroupName({ ...report, categoryKey: entityKey }),
        isCustom: true,
      }
    })
  }, [backendTemplates, generatedReports])

  const visibleReports = useMemo(() => {
    const baseReports = activeFilter === 'custom'
      ? customMongoReports
      : [
          ...SYSTEM_REPORTS.filter((report) => isAdmin || report.visibility === 'All'),
          ...customReports,
        ]

    return baseReports.filter((report) => {
      const catKey = normalizeEntityKey(report.categoryKey || report.entityType || '')

      if (activeFilter === 'custom') {
        if (report.systemReport) return false
        return normalizeEntityKey(catKey) === activeCustomSubFilter
      }

      if (activeFilter !== 'all' && catKey !== activeFilter) return false
      if (activeManagementTab === 'all') return isAdmin
      if (report.systemReport) return activeManagementTab === 'shared'

      const isOwn = canUserEditReportTemplate(report, user)
      if (activeManagementTab === 'my') return isOwn
      if (activeManagementTab === 'shared') return !isOwn
      return true
    })
  }, [activeFilter, activeCustomSubFilter, activeManagementTab, customReports, customMongoReports, isAdmin, user])

  const groupedReports = useMemo(() => visibleReports.reduce((groups, report) => {
    const groupName = getReportGroupName(report)
    if (!groups[groupName]) groups[groupName] = []
    groups[groupName].push(report)
    return groups
  }, {}), [visibleReports])

  const openBuilder = (contextKey, extra = '') => {
    setAddOpen(false)
    navigate(`${basePath}/custom/builder?context=${encodeURIComponent(contextKey)}${extra}`)
  }

  const handleAddTemplate = (contextKey) => {
    setAddOpen(false)
    navigate(`${basePath}/templates/account/new?context=${encodeURIComponent(contextKey)}`)
  }

  const handleView = (report) => {
    if (report.systemReport) {
      openBuilder(report.categoryKey === 'closed_sr' ? 'closed_sr' : report.categoryKey || 'account')
      return
    }
    navigate(`${basePath}/custom/builder?id=${encodeURIComponent(report.id)}`)
  }

  const handleEdit = (report) => {
    if (!canUserEditReportTemplate(report, user)) return
    navigate(`${basePath}/custom/builder?id=${encodeURIComponent(report.id)}`)
  }

  const handleDuplicate = (report) => {
    if (report.systemReport) {
      openBuilder(report.categoryKey === 'closed_sr' ? 'closed_sr' : report.categoryKey || 'account')
      return
    }
    navigate(`${basePath}/custom/builder?id=${encodeURIComponent(report.id)}&duplicate=1`)
  }

  const handleDelete = (report) => {
    if (report.systemReport || !canUserEditReportTemplate(report, user)) return
    if (!window.confirm(`Delete report "${report.reportName || report.title}"?`)) return
    deleteAdminReportTemplate(report.id)
    setTemplates(getAdminReportTemplates())
  }

  const handleViewWeb = useCallback(async (report) => {
    const reportName = report.reportName || report.title || report.name || 'Custom Report'
    const groupName = getReportGroupName(report)
    const isDailyStatus = groupName === 'Daily Status' || String(reportName).toLowerCase().includes('daily')
    const ctx = getCustomReportContext(report.reportContext) || {}
    const reportCat = normalizeEntityKey(report.categoryKey || report.entityType || ctx.categoryKey || '')
    const targetCategory = reportCat || (activeFilter === 'custom' ? 'all' : activeFilter) || 'all'

    // Open new window immediately to avoid popup blocker
    const newWindow = window.open('', '_blank')
    if (!newWindow) {
      alert('Please allow popups to view the report.')
      return
    }

    newWindow.document.write('<!DOCTYPE html><html><head><title>Loading...</title></head><body style="background:#525659;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;"><div>Loading Report Data...</div></body></html>')
    newWindow.document.close()

    const isToday = (dateString) => {
      if (!dateString) return false
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return false
      const today = new Date()
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    }

    const isCurrentUser = (ownerStr, assignedId, creatorId) => {
      if (assignedId && String(assignedId) === String(user?.id)) return true
      if (creatorId && String(creatorId) === String(user?.id)) return true
      if (!ownerStr) return false
      const lowerOwner = String(ownerStr).toLowerCase()
      return Boolean(
        (user?.name && lowerOwner.includes(user.name.toLowerCase())) ||
        (user?.username && lowerOwner.includes(user.username.toLowerCase())) ||
        (user?.ownerCode && lowerOwner.includes(String(user.ownerCode).toLowerCase()))
      )
    }

    let allDeals = []
    let allAccounts = []
    let allCustomers = []
    let allQuotations = []

    try {
      const fetchPromises = []
      if (targetCategory === 'all' || targetCategory === 'deal') {
        fetchPromises.push(apiClient.get('/deals', { params: { limit: 100000 } }).then(res => {
          allDeals = res?.data?.data || res?.data || []
        }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'account') {
        fetchPromises.push(apiClient.get('/leads', { params: { limit: 100000 } }).then(res => {
          allAccounts = res?.data?.data || res?.data || []
        }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'customer') {
        fetchPromises.push(apiClient.get('/customers', { params: { limit: 100000 } }).then(res => {
          allCustomers = res?.data?.data || res?.data || []
        }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'quotation') {
        fetchPromises.push(apiClient.get('/quotations', { params: { limit: 100000 } }).then(res => {
          allQuotations = res?.data?.data || res?.data || []
        }).catch(e => console.error(e)))
      }
      await Promise.all(fetchPromises)
    } catch (err) {
      console.error('Error fetching report data:', err)
    }

    const finalAccounts = allAccounts.length > 0 ? allAccounts : accounts
    const finalDeals = allDeals.length > 0 ? allDeals : deals
    const finalCustomers = allCustomers.length > 0 ? allCustomers : customers
    const finalQuotations = allQuotations.length > 0 ? allQuotations : quotations

    const reportOwner = String(report.accountOwner || report.owner || '').trim().toLowerCase()
    const reportFrom = report.generatedFrom ? new Date(`${report.generatedFrom}T00:00:00`) : null
    const reportTo = report.generatedTo ? new Date(`${report.generatedTo}T23:59:59`) : null
    const applyReportScope = (items, type) => items.filter((item) => {
      const owner = type === 'account'
        ? item.accountOwnerName || item.accountOwner || item.ownerName || item.owner
        : type === 'deal'
          ? item.dealOwnerName || item.dealOwner || item.ownerName || item.owner
          : item.ownerName || item.owner || item.accountOwner || item.customerOwner
      const dateValue = item.createdAt || item.updatedAt || item.accountDate || item.dealDate || item.quotationDate
      const date = dateValue ? new Date(dateValue) : null
      return (!reportOwner || String(owner || '').trim().toLowerCase() === reportOwner)
        && (!reportFrom || (date && date >= reportFrom))
        && (!reportTo || (date && date <= reportTo))
    })

    const scopedAccounts = applyReportScope(finalAccounts, 'account')
    const scopedDeals = applyReportScope(finalDeals, 'deal')
    const scopedCustomers = applyReportScope(finalCustomers, 'customer')
    const scopedQuotations = applyReportScope(finalQuotations, 'quotation')

    let columns = []
    let rows = []

    const mapItem = (item, type) => {
      const dateStr = (val) => {
        if (!val) return '-'
        const d = new Date(val)
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-GB')
      }

      if (type === 'account') {
        const rawOwner = item.accountOwnerName || item.accountOwner || item.ownerName || item.owner || item.raw?.accountOwner || '-'
        const rawName = item.name || item.customerName || item.accountName || '-'
        const rawStatus = item.status || item.accountStatus || '-'
        const rawNo = item.accountNumber || item.accountNo || item.id || '-'
        const rawDate = dateStr(item.accountDate || item.date || item.createdAt)
        const rawCategory = item.accountCategory || item.category || '-'
        const rawSource = item.accountSource || item.source || '-'

        return {
          ...item,
          accountNumber: rawNo,
          accountNo: rawNo,
          id: rawNo,
          name: rawName,
          accountName: rawName,
          customerName: item.customerName || rawName,
          accountDate: rawDate,
          date: rawDate,
          accountCategory: rawCategory,
          category: rawCategory,
          accountOwner: rawOwner,
          accountOwnerName: rawOwner,
          owner: rawOwner,
          status: rawStatus,
          accountStatus: rawStatus,
          accountSource: rawSource,
          source: rawSource,
          contactPerson: item.contactPerson || '-',
          phone: item.phone || item.mobile || '-',
          mobile: item.phone || item.mobile || '-',
          email: item.email || '-',
          projectName: item.projectName || item.project || '-',
          project: item.projectName || item.project || '-',
          location: item.location || item.city || '-',
          city: item.location || item.city || '-',
          reasonForLost: item.reasonForLost || '-',
          latestRemark: item.latestRemark || item.remarks || '-',
          remarks: item.latestRemark || item.remarks || '-',
          poValue: item.poValue || '-',
          jobNo: item.jobNo || '-',
          addedBy: item.addedBy || item.creatorName || item.createdBy || '-',
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'customer') {
        const rawNo = item.customerNumber || item.customerNo || item.id || '-'
        const rawName = item.name || item.customerName || '-'
        const rawOwner = item.assignedToName || item.ownerName || item.owner || '-'
        const rawPhone = item.phone || item.mobile || '-'

        return {
          ...item,
          customerNumber: rawNo,
          customerNo: rawNo,
          id: rawNo,
          name: rawName,
          customerName: rawName,
          company: item.company || item.companyName || '-',
          companyName: item.company || item.companyName || '-',
          city: item.city || item.location || '-',
          location: item.city || item.location || '-',
          phone: rawPhone,
          mobile: rawPhone,
          email: item.email || '-',
          status: item.status || '-',
          assignedTo: rawOwner,
          assignedToName: rawOwner,
          owner: rawOwner,
          ownerName: rawOwner,
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'deal') {
        const rawNo = item.dealNumber || item.id || '-'
        const rawName = item.dealName || item.name || item.title || '-'
        const rawOwner = item.dealOwnerName || item.dealOwner || item.ownerName || item.owner || '-'
        const rawDate = dateStr(item.dealDate || item.quotationDate || item.createdAt)
        const rawValue = item.dealValue || item.value || item.amount || '-'

        return {
          ...item,
          dealNumber: rawNo,
          id: rawNo,
          dealName: rawName,
          name: rawName,
          title: rawName,
          dealDate: rawDate,
          date: rawDate,
          dealOwner: rawOwner,
          dealOwnerName: rawOwner,
          owner: rawOwner,
          ownerName: rawOwner,
          dealType: item.dealType || item.stage || '-',
          stage: item.stage || item.dealType || '-',
          status: item.status || item.stage || '-',
          dealValue: rawValue,
          value: rawValue,
          amount: rawValue,
          projectName: item.projectName || item.project || '-',
          project: item.projectName || item.project || '-',
          consultantName: item.consultantName || '-',
          expectedCloseDate: dateStr(item.expectedCloseDate),
          addedOn: dateStr(item.addedOn),
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'quotation') {
        const rawNo = item.quotationNo || item.quotationNumber || item.id || '-'
        const rawDate = dateStr(item.date || item.quotationDate || item.createdAt)
        const rawAccount = item.accountName || item.customerName || item.name || '-'
        const rawDeal = item.dealName || item.title || '-'
        const rawTotal = item.grandTotal || item.total || item.amount || '-'

        return {
          ...item,
          quotationNo: rawNo,
          quotationNumber: rawNo,
          id: rawNo,
          date: rawDate,
          accountName: rawAccount,
          dealName: rawDeal,
          grandTotal: rawTotal,
          total: rawTotal,
          amount: rawTotal,
          status: item.status || '-',
          createdAt: dateStr(item.createdAt),
        }
      }

      return item
    }

    const fieldsList = getReportDisplayFieldKeys(report)

    if (targetCategory === 'account') {
      if (fieldsList.length > 0) {
        columns = fieldsList.map(key => ({ key, label: resolveLabel('account', key) }))
      } else {
        columns = [
          { key: 'accountNumber', label: 'Account No.' },
          { key: 'name', label: 'Account Name' },
          { key: 'accountDate', label: 'Account Date' },
          { key: 'accountCategory', label: 'Account Category' },
          { key: 'accountOwner', label: 'Account Owner' },
          { key: 'status', label: 'Account Status' },
          { key: 'accountSource', label: 'Account Source' },
          { key: 'contactPerson', label: 'Contact Person' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
        ]
      }
      let list = scopedAccounts
      if (isDailyStatus) {
        list = list.filter(item => isCurrentUser(item.accountOwnerName || item.accountOwner || item.ownerName || item.raw?.accountOwner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.accountDate || item.createdAt))
      }
      rows = list.map(item => mapItem(item, 'account'))
      rows = applyReportFilters(rows, report.filters)

    } else if (targetCategory === 'customer') {
      if (fieldsList.length > 0) {
        columns = fieldsList.map(key => ({ key, label: resolveLabel('customer', key) }))
      } else {
        columns = [
          { key: 'customerNumber', label: 'Customer No.' },
          { key: 'name', label: 'Customer Name' },
          { key: 'company', label: 'Company' },
          { key: 'city', label: 'City' },
          { key: 'phone', label: 'Phone' },
          { key: 'email', label: 'Email' },
          { key: 'status', label: 'Status' },
          { key: 'assignedTo', label: 'Assigned To' },
        ]
      }
      let list = scopedCustomers
      if (isDailyStatus) {
        list = list.filter(item => isCurrentUser(item.assignedToName || item.ownerName || item.owner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.createdAt || item.addedDate))
      }
      rows = list.map(item => mapItem(item, 'customer'))
      rows = applyReportFilters(rows, report.filters)

    } else if (targetCategory === 'deal') {
      if (fieldsList.length > 0) {
        columns = fieldsList.map(key => ({ key, label: resolveLabel('deal', key) }))
      } else {
        columns = [
          { key: 'dealNumber', label: 'Deal No.' },
          { key: 'dealName', label: 'Deal Name' },
          { key: 'dealDate', label: 'Deal Date' },
          { key: 'dealOwner', label: 'Deal Owner' },
          { key: 'dealType', label: 'Deal Type' },
          { key: 'status', label: 'Deal Status' },
          { key: 'dealValue', label: 'Deal Value' },
          { key: 'projectName', label: 'Project Name' },
          { key: 'consultantName', label: 'Consultant Name' },
        ]
      }
      let list = scopedDeals
      if (isDailyStatus) {
        list = list.filter(item => isCurrentUser(item.dealOwnerName || item.dealOwner || item.ownerName || item.owner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.dealDate || item.quotationDate || item.createdAt))
      }
      rows = list.map(item => mapItem(item, 'deal'))
      rows = applyReportFilters(rows, report.filters)

    } else if (targetCategory === 'quotation') {
      if (fieldsList.length > 0) {
        columns = fieldsList.map(key => ({ key, label: resolveLabel('quotation', key) }))
      } else {
        columns = [
          { key: 'quotationNo', label: 'Quotation No' },
          { key: 'date', label: 'Date' },
          { key: 'accountName', label: 'Account' },
          { key: 'dealName', label: 'Deal' },
          { key: 'grandTotal', label: 'Grand Total' },
          { key: 'status', label: 'Status' },
        ]
      }
      let list = scopedQuotations
      if (isDailyStatus) {
        list = list.filter(item => isCurrentUser(item.ownerName || item.owner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.date || item.createdAt))
      }
      rows = list.map(item => mapItem(item, 'quotation'))
      rows = applyReportFilters(rows, report.filters)

    } else {
      columns = [
        { key: 'type', label: 'Type' },
        { key: 'number', label: 'No.' },
        { key: 'name', label: 'Name / Title' },
        { key: 'owner', label: 'Owner / Assigned' },
        { key: 'date', label: 'Date' },
        { key: 'status', label: 'Status' },
        { key: 'details', label: 'Details' },
      ]
      let accountsList = scopedAccounts
      let dealsList = scopedDeals
      let customersList = scopedCustomers

      if (isDailyStatus) {
        accountsList = accountsList.filter(item => isCurrentUser(item.accountOwnerName || item.accountOwner || item.ownerName || item.raw?.accountOwner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.accountDate || item.createdAt))
        dealsList = dealsList.filter(item => isCurrentUser(item.dealOwnerName || item.dealOwner || item.ownerName || item.owner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.dealDate || item.quotationDate || item.createdAt))
        customersList = customersList.filter(item => isCurrentUser(item.assignedToName || item.ownerName || item.owner, item.assignedTo || item.ownerUserId, item.createdBy) && isToday(item.createdAt || item.addedDate))
      }

      rows = [
        ...accountsList.map(item => ({
          type: 'Account',
          number: item.accountNumber || item.accountNo || item.id || '-',
          name: item.name || item.customerName || '-',
          owner: item.accountOwnerName || item.accountOwner || item.raw?.accountOwner || '-',
          date: item.accountDate ? new Date(item.accountDate).toLocaleDateString('en-GB') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-'),
          status: item.status || '-',
          details: item.contactPerson || item.phone || item.email || '-',
        })),
        ...dealsList.map(item => ({
          type: 'Deal',
          number: item.dealNumber || item.id || '-',
          name: item.dealName || item.name || item.title || '-',
          owner: item.dealOwnerName || item.dealOwner || item.ownerName || item.owner || '-',
          date: item.dealDate ? new Date(item.dealDate).toLocaleDateString('en-GB') : (item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-'),
          status: item.status || item.stage || '-',
          details: item.projectName || (item.dealValue ? `₹${item.dealValue}` : '-'),
        })),
        ...customersList.map(item => ({
          type: 'Customer',
          number: item.customerNumber || item.customerNo || item.id || '-',
          name: item.name || item.customerName || '-',
          owner: item.assignedToName || item.ownerName || item.owner || '-',
          date: item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
          status: item.status || '-',
          details: item.company || item.city || item.phone || '-',
        })),
      ]
    }

    const html = `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>${reportName}</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
              padding: 40px; 
              background-color: #525659; 
              margin: 0;
              user-select: none;
              -webkit-user-select: none;
              transition: opacity 0.2s;
            }
            .pdf-page { 
              background-color: #fff; 
              padding: 60px; 
              margin: 0 auto; 
              max-width: 1100px; 
              box-shadow: 0 4px 15px rgba(0,0,0,0.2); 
              min-height: 800px;
              overflow-x: auto;
            }
            .table-responsive { overflow-x: auto; white-space: nowrap; }
            h2 { text-align: center; color: #1a1a1a; margin-top: 0; margin-bottom: 24px; font-size: 24px; }
            .report-meta-info { text-align: center; color: #6b7280; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th, td { border: 1px solid #d1d5db; padding: 10px 14px; text-align: left; color: #374151; }
            th { background-color: #f3f4f6; color: #111827; font-weight: 600; border-bottom: 2px solid #9ca3af; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .empty-text { text-align: center; padding: 30px; color: #6b7280; font-style: italic; }
            @media print {
              body { display: none !important; }
            }
          </style>
        </head>
        <body oncontextmenu="return false;">
          <div class="pdf-page">
            <h2>${reportName}</h2>
            <div class="report-meta-info">
              ${isDailyStatus ? "Today's Activity Report" : 'Consolidated Report'} | Total Records: ${rows.length}
            </div>
            <div class="table-responsive">
              <table>
                <thead>
                  <tr>
                    ${columns.map(col => `<th>${col.label}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${rows.length === 0 ? `<tr><td colspan="${columns.length}" class="empty-text">No records found matching report criteria</td></tr>` : rows.map(row => `
                    <tr>
                      ${columns.map(col => `<td>${row[col.key] != null ? row[col.key] : '-'}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
          <script>
            document.addEventListener('contextmenu', e => e.preventDefault());
            document.addEventListener('keydown', function(e) {
              if (
                e.key === 'PrintScreen' || 
                (e.ctrlKey && e.key === 'p') || 
                (e.ctrlKey && e.key === 's') || 
                (e.metaKey && e.shiftKey && (e.key === 's' || e.key === 'S' || e.key === '4'))
              ) {
                e.preventDefault();
                document.body.style.opacity = '0';
                alert('Screenshots and printing are disabled for security.');
                setTimeout(() => { document.body.style.opacity = '1'; }, 2000);
              }
            });
            window.addEventListener('blur', () => {
              document.body.style.opacity = '0';
            });
            window.addEventListener('focus', () => {
              document.body.style.opacity = '1';
            });
            document.addEventListener('selectstart', e => e.preventDefault());
          </script>
        </body>
      </html>
    `

    newWindow.document.open()
    newWindow.document.write(html)
    newWindow.document.close()

    // Store generated report in MongoDB reports collection if not already generated with identical template config
    const isDuplicate = generatedReports.some((gen) => {
      const genTplId = String(gen.templateId || gen.id || gen._id || '')
      const currTplId = String(report._id || report.id || '')
      const sameTemplate = genTplId === currTplId || (gen.reportName === reportName && gen.entityType === targetCategory)
      const sameFields = JSON.stringify((gen.selectedFields || gen.displayFields || []).slice().sort()) === JSON.stringify(columns.map((c) => c.key).slice().sort())
      const sameFilters = JSON.stringify(gen.filters || []) === JSON.stringify(report.filters || [])
      const templateUpdated = report.updatedAt && gen.createdAt && new Date(report.updatedAt) > new Date(gen.createdAt)
      return sameTemplate && sameFields && sameFilters && !templateUpdated
    })

    if (!isDuplicate) {
      try {
        await reportApi.saveGeneratedReport({
          templateId: report._id || report.id,
          reportName,
          entityType: targetCategory,
          selectedFields: columns.map((col) => col.key),
          displayFields: columns.map((col) => col.key),
          filters: Array.isArray(report.filters) ? report.filters : [],
          totalRecords: rows.length,
          createdBy: user?.name || user?.username || 'User',
          creatorName: user?.name || user?.username || 'User',
          visibility: report.visibility || 'All',
          createdAt: new Date().toISOString(),
        })
        loadBackendReportsData()
      } catch (saveErr) {
        console.error('Error saving generated custom report:', saveErr)
      }
    }
  }, [activeFilter, user, loadBackendReportsData, accounts, deals, customers, quotations, generatedReports])

  const handleExport = async (report, format = 'excel') => {
    const reportName = report.reportName || report.title || report.name || 'Custom Report'
    const groupName = getReportGroupName(report)
    const isDailyStatus = groupName === 'Daily Status' || String(reportName).includes('Daily Status')
    
    const isToday = (dateString) => {
      if (!dateString) return false
      const date = new Date(dateString)
      if (isNaN(date)) return false
      const today = new Date()
      return date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear()
    }
    
    const filterByDate = (arr, dateField) => isDailyStatus ? arr.filter(item => isToday(item[dateField] || item.createdAt)) : arr

    let allDeals = []
    let allAccounts = []
    let allCustomers = []
    let allQuotations = []

    const ctx = getCustomReportContext(report.reportContext) || {}
    const reportCat = normalizeEntityKey(report.categoryKey || report.entityType || ctx.categoryKey || '')
    const targetCategory = reportCat || (activeFilter === 'custom' ? 'all' : activeFilter) || 'all'

    try {
      const fetchPromises = []
      if (targetCategory === 'all' || targetCategory === 'deal') {
         fetchPromises.push(apiClient.get('/deals', { params: { limit: 100000 } }).then(res => {
             const d = res?.data?.data || res?.data || []
             allDeals = d
         }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'account') {
         fetchPromises.push(apiClient.get('/leads', { params: { limit: 100000 } }).then(res => {
             allAccounts = res?.data?.data || res?.data || []
         }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'customer') {
         fetchPromises.push(apiClient.get('/customers', { params: { limit: 100000 } }).then(res => {
             allCustomers = res?.data?.data || res?.data || []
         }).catch(e => console.error(e)))
      }
      if (targetCategory === 'all' || targetCategory === 'quotation') {
         fetchPromises.push(apiClient.get('/quotations', { params: { limit: 100000 } }).then(res => {
             allQuotations = res?.data?.data || res?.data || []
         }).catch(e => console.error(e)))
      }
      await Promise.all(fetchPromises)
    } catch(err) {
      console.error(err)
    }

    const finalAccounts = allAccounts.length > 0 ? allAccounts : accounts
    const finalDeals = allDeals.length > 0 ? allDeals : deals
    const finalCustomers = allCustomers.length > 0 ? allCustomers : customers
    const finalQuotations = allQuotations.length > 0 ? allQuotations : quotations

    let dataSets = []
    const mapItem = (item, type) => {
      const dateStr = (val) => {
        if (!val) return '-'
        const d = new Date(val)
        return isNaN(d.getTime()) ? String(val) : d.toLocaleDateString('en-GB')
      }

      if (type === 'account') {
        const rawOwner = item.accountOwnerName || item.accountOwner || item.ownerName || item.owner || item.raw?.accountOwner || '-'
        const rawName = item.name || item.customerName || item.accountName || '-'
        const rawStatus = item.status || item.accountStatus || '-'
        const rawNo = item.accountNumber || item.accountNo || item.id || '-'
        const rawDate = dateStr(item.accountDate || item.date || item.createdAt)
        const rawCategory = item.accountCategory || item.category || '-'
        const rawSource = item.accountSource || item.source || '-'

        return {
          ...item,
          accountNumber: rawNo,
          accountNo: rawNo,
          id: rawNo,
          name: rawName,
          accountName: rawName,
          customerName: item.customerName || rawName,
          accountDate: rawDate,
          date: rawDate,
          accountCategory: rawCategory,
          category: rawCategory,
          accountOwner: rawOwner,
          accountOwnerName: rawOwner,
          owner: rawOwner,
          status: rawStatus,
          accountStatus: rawStatus,
          accountSource: rawSource,
          source: rawSource,
          contactPerson: item.contactPerson || '-',
          phone: item.phone || item.mobile || '-',
          mobile: item.phone || item.mobile || '-',
          email: item.email || '-',
          projectName: item.projectName || item.project || '-',
          project: item.projectName || item.project || '-',
          location: item.location || item.city || '-',
          city: item.location || item.city || '-',
          reasonForLost: item.reasonForLost || '-',
          latestRemark: item.latestRemark || item.remarks || '-',
          remarks: item.latestRemark || item.remarks || '-',
          poValue: item.poValue || '-',
          jobNo: item.jobNo || '-',
          addedBy: item.addedBy || item.creatorName || item.createdBy || '-',
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'customer') {
        const rawNo = item.customerNumber || item.customerNo || item.id || '-'
        const rawName = item.name || item.customerName || '-'
        const rawOwner = item.assignedToName || item.ownerName || item.owner || '-'
        const rawPhone = item.phone || item.mobile || '-'

        return {
          ...item,
          customerNumber: rawNo,
          customerNo: rawNo,
          id: rawNo,
          name: rawName,
          customerName: rawName,
          company: item.company || item.companyName || '-',
          companyName: item.company || item.companyName || '-',
          city: item.city || item.location || '-',
          location: item.city || item.location || '-',
          phone: rawPhone,
          mobile: rawPhone,
          email: item.email || '-',
          status: item.status || '-',
          assignedTo: rawOwner,
          assignedToName: rawOwner,
          owner: rawOwner,
          ownerName: rawOwner,
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'deal') {
        const rawNo = item.dealNumber || item.id || '-'
        const rawName = item.dealName || item.name || item.title || '-'
        const rawOwner = item.dealOwnerName || item.dealOwner || item.ownerName || item.owner || '-'
        const rawDate = dateStr(item.dealDate || item.quotationDate || item.createdAt)
        const rawValue = item.dealValue || item.value || item.amount || '-'

        return {
          ...item,
          dealNumber: rawNo,
          id: rawNo,
          dealName: rawName,
          name: rawName,
          title: rawName,
          dealDate: rawDate,
          date: rawDate,
          dealOwner: rawOwner,
          dealOwnerName: rawOwner,
          owner: rawOwner,
          ownerName: rawOwner,
          dealType: item.dealType || item.stage || '-',
          stage: item.stage || item.dealType || '-',
          status: item.status || item.stage || '-',
          dealValue: rawValue,
          value: rawValue,
          amount: rawValue,
          projectName: item.projectName || item.project || '-',
          project: item.projectName || item.project || '-',
          consultantName: item.consultantName || '-',
          expectedCloseDate: dateStr(item.expectedCloseDate),
          addedOn: dateStr(item.addedOn),
          createdAt: dateStr(item.createdAt),
        }
      }

      if (type === 'quotation') {
        const rawNo = item.quotationNo || item.quotationNumber || item.id || '-'
        const rawDate = dateStr(item.date || item.quotationDate || item.createdAt)
        const rawAccount = item.accountName || item.customerName || item.name || '-'
        const rawDeal = item.dealName || item.title || '-'
        const rawTotal = item.grandTotal || item.total || item.amount || '-'

        return {
          ...item,
          quotationNo: rawNo,
          quotationNumber: rawNo,
          id: rawNo,
          date: rawDate,
          accountName: rawAccount,
          dealName: rawDeal,
          grandTotal: rawTotal,
          total: rawTotal,
          amount: rawTotal,
          status: item.status || '-',
          createdAt: dateStr(item.createdAt),
        }
      }

      return item
    }

    const mapForExport = (item, type) => {
      const mapped = mapItem(item, type)
      const displayFields = getReportDisplayFieldKeys(report)

      if (displayFields.length > 0) {
        const out = {}
        displayFields.forEach(key => {
          const label = resolveLabel(type, key) || key
          out[label] = mapped[key] !== undefined && mapped[key] !== null ? mapped[key] : (item[key] != null ? item[key] : '-')
        })
        return out
      }
      
      // Fallback for system reports
      if (type === 'account') {
        return {
          'Account No.': mapped.accountNumber,
          'Account Date': mapped.accountDate,
          'Account Name': mapped.name,
          'Account Owner': mapped.accountOwner,
          'Account Status': mapped.status,
          'Account State': mapped.accountState || '-',
          'Account Source': mapped.accountSource,
          'Contact Person': mapped.contactPerson,
          'Phone': mapped.phone,
          'Email': mapped.email,
          'Latest Remark': mapped.latestRemark,
          'PO Value': mapped.poValue,
          'Job No': mapped.jobNo,
          'Created At': mapped.createdAt,
        }
      } else if (type === 'deal') {
        return {
          'Deal Name': mapped.dealName,
          'Account Name': mapped.accountName || '-',
          'Deal Owner': mapped.dealOwner,
          'Stage': mapped.stage || '-',
          'Status': mapped.status,
          'Deal Value': mapped.dealValue,
          'Expected Close Date': mapped.expectedCloseDate,
          'Added On': mapped.addedOn,
          'Created At': mapped.createdAt,
        }
      } else if (type === 'customer') {
        return {
          'Customer Name': mapped.name,
          'Customer Code': mapped.customerCode || '-',
          'Owner': mapped.assignedTo,
          'Status': mapped.status,
          'Mobile': mapped.mobile || mapped.phone,
          'Email': mapped.email,
          'City': mapped.city,
          'Created At': mapped.createdAt,
        }
      } else if (type === 'quotation') {
        return {
          'Quotation No': mapped.quotationNo || '-',
          'Date': mapped.date ? new Date(mapped.date).toLocaleDateString('en-GB') : '-',
          'Account': mapped.accountName || '-',
          'Deal': mapped.dealName || '-',
          'Grand Total': mapped.grandTotal || '-',
          'Status': mapped.status || '-',
        }
      }
      return mapped
    }

    const processCategoryList = (list, type, dateField) => {
      let filtered = filterByDate(list, dateField)
      let mapped = filtered.map(item => ({...item, ...mapItem(item, type)}))
      mapped = applyReportFilters(mapped, report.filters)
      return mapped.map(item => mapForExport(item, type))
    }

    if (targetCategory === 'all') {
      dataSets = [
        ...processCategoryList(finalDeals, 'deal', 'addedOn').map(item => ({ 'Data Type': 'Deal', ...item })),
        ...processCategoryList(finalAccounts, 'account', 'accountDate').map(item => ({ 'Data Type': 'Account', ...item })),
        ...processCategoryList(finalCustomers, 'customer', 'createdAt').map(item => ({ 'Data Type': 'Customer', ...item })),
        ...processCategoryList(finalQuotations, 'quotation', 'date').map(item => ({ 'Data Type': 'Quotation', ...item })),
      ]
    } else if (targetCategory === 'account') {
      dataSets = processCategoryList(finalAccounts, 'account', 'accountDate')
    } else if (targetCategory === 'deal') {
      dataSets = processCategoryList(finalDeals, 'deal', 'addedOn')
    } else if (targetCategory === 'customer') {
      dataSets = processCategoryList(finalCustomers, 'customer', 'createdAt')
    } else if (targetCategory === 'quotation') {
      dataSets = processCategoryList(finalQuotations, 'quotation', 'date')
    }

    const allKeys = new Set()
    dataSets.forEach(row => Object.keys(row).forEach(k => allKeys.add(k)))
    
    let columns = Array.from(allKeys).map(k => ({ 
      key: k, 
      label: k, 
      width: 25 
    }))

    if (columns.length === 0) {
      columns = [{ key: 'Status', label: 'Status', width: 25 }]
      dataSets = [{ Status: 'No records found' }]
    }

    if (format === 'csv') {
      exportCsvWorkbook({
        filename: `${reportName}-${activeFilter}-${new Date().toISOString().slice(0, 10)}.csv`,
        title: `${reportName} - ${activeFilter.toUpperCase()}`,
        sheetName: 'Custom Report',
        columns,
        rows: dataSets,
      })
    } else {
      exportExcelWorkbook({
        filename: `${reportName}-${activeFilter}-${new Date().toISOString().slice(0, 10)}.xlsx`,
        title: `${reportName} - ${activeFilter.toUpperCase()}`,
        sheetName: 'Custom Report',
        columns,
        rows: dataSets,
      })
    }

    // Store generated report in MongoDB reports collection if not already generated with identical template config
    const isDuplicate = generatedReports.some((gen) => {
      const genTplId = String(gen.templateId || gen.id || gen._id || '')
      const currTplId = String(report._id || report.id || '')
      const sameTemplate = genTplId === currTplId || (gen.reportName === reportName && gen.entityType === targetCategory)
      const sameFields = JSON.stringify((gen.selectedFields || gen.displayFields || []).slice().sort()) === JSON.stringify(getReportDisplayFieldKeys(report).slice().sort())
      const sameFilters = JSON.stringify(gen.filters || []) === JSON.stringify(report.filters || [])
      const templateUpdated = report.updatedAt && gen.createdAt && new Date(report.updatedAt) > new Date(gen.createdAt)
      return sameTemplate && sameFields && sameFilters && !templateUpdated
    })

    if (!isDuplicate) {
      try {
        await reportApi.saveGeneratedReport({
          templateId: report._id || report.id,
          reportName,
          entityType: targetCategory,
          selectedFields: getReportDisplayFieldKeys(report),
          displayFields: getReportDisplayFieldKeys(report),
          filters: Array.isArray(report.filters) ? report.filters : [],
          totalRecords: dataSets.length,
          createdBy: user?.name || user?.username || 'User',
          creatorName: user?.name || user?.username || 'User',
          visibility: report.visibility || 'All',
          createdAt: new Date().toISOString(),
        })
        loadBackendReportsData()
      } catch (saveErr) {
        console.error('Error saving exported custom report:', saveErr)
      }
    }
  }

  return (
    <div className="cr-list-page">
      <header className="cr-list-topbar">
        <h1>Custom Reports</h1>
        <div className="cr-list-topbar-actions">
          <button type="button" className="cr-list-help">Need Help?</button>
          {canCreateReportTemplate && (
            <SplitDropdown
              label="Add Report Template"
              options={addTemplateOptions}
              isOpen={addOpen}
              buttonRef={addRef}
              onToggle={() => { setAddOpen((value) => !value) }}
              onSelect={handleAddTemplate}
            />
          )}
        </div>
      </header>

      <div className="cr-list-tabs">

        {isAdmin && <button type="button" className={activeManagementTab === 'all' ? 'active' : ''} onClick={() => setActiveManagementTab('all')}>All Reports</button>}
      </div>

      <div className="cr-list-layout">
        <aside className="cr-list-sidebar">
          <div className="cr-list-sidebar-title"><FaTable /> Templates</div>
          <div className="cr-list-sidebar-items">
            {TEMPLATE_FILTERS.map((filter) => (
              <React.Fragment key={filter.key}>
                <button
                  type="button"
                  className={activeFilter === filter.key ? 'active' : ''}
                  onClick={() => {
                    setActiveFilter(filter.key)
                    if (filter.key === 'custom') setActiveCustomSubFilter('account')
                  }}
                >
                  {filter.label}
                </button>
                {filter.key === 'custom' && activeFilter === 'custom' && (
                  <div className="cr-list-sidebar-subitems" style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem', marginBottom: '0.5rem' }}>
                    <button
                      type="button"
                      className={`cr-list-subitem-btn ${activeCustomSubFilter === 'account' ? 'active-subitem' : ''}`}
                      style={{ textAlign: 'left', background: activeCustomSubFilter === 'account' ? '#fff1f2' : 'none', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', color: activeCustomSubFilter === 'account' ? '#c60016' : '#444', fontWeight: activeCustomSubFilter === 'account' ? '600' : 'normal', fontSize: '0.85rem' }}
                      onClick={() => setActiveCustomSubFilter('account')}
                    >
                      Accounts
                    </button>
                    <button
                      type="button"
                      className={`cr-list-subitem-btn ${activeCustomSubFilter === 'customer' ? 'active-subitem' : ''}`}
                      style={{ textAlign: 'left', background: activeCustomSubFilter === 'customer' ? '#fff1f2' : 'none', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', color: activeCustomSubFilter === 'customer' ? '#c60016' : '#444', fontWeight: activeCustomSubFilter === 'customer' ? '600' : 'normal', fontSize: '0.85rem' }}
                      onClick={() => setActiveCustomSubFilter('customer')}
                    >
                      Customers
                    </button>
                    <button
                      type="button"
                      className={`cr-list-subitem-btn ${activeCustomSubFilter === 'deal' ? 'active-subitem' : ''}`}
                      style={{ textAlign: 'left', background: activeCustomSubFilter === 'deal' ? '#fff1f2' : 'none', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', color: activeCustomSubFilter === 'deal' ? '#c60016' : '#444', fontWeight: activeCustomSubFilter === 'deal' ? '600' : 'normal', fontSize: '0.85rem' }}
                      onClick={() => setActiveCustomSubFilter('deal')}
                    >
                      Deals
                    </button>
                    <button
                      type="button"
                      className={`cr-list-subitem-btn ${activeCustomSubFilter === 'quotation' ? 'active-subitem' : ''}`}
                      style={{ textAlign: 'left', background: activeCustomSubFilter === 'quotation' ? '#fff1f2' : 'none', border: 'none', padding: '0.4rem 0.6rem', borderRadius: '4px', cursor: 'pointer', color: activeCustomSubFilter === 'quotation' ? '#c60016' : '#444', fontWeight: activeCustomSubFilter === 'quotation' ? '600' : 'normal', fontSize: '0.85rem' }}
                      onClick={() => setActiveCustomSubFilter('quotation')}
                    >
                      Quotations
                    </button>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </aside>

        <main className="cr-list-main">
          {Object.keys(groupedReports).length === 0 ? (
            <div className="cr-list-empty">No reports available for this selection.</div>
          ) : Object.entries(groupedReports).map(([groupName, reports]) => (
            <section className="cr-list-group" key={groupName}>
              <h2>{groupName}</h2>
              <div className="cr-list-group-cards">
                {reports.map((report) => (
                  <ReportCard
                    key={report.id}
                    report={report}
                    onViewWeb={handleViewWeb}
                    onExport={handleExport}
                    isKevalOrAdmin={isKevalOrAdmin}
                  />
                ))}
              </div>
            </section>
          ))}
        </main>
      </div>
      <WebReportModal report={webReport} onClose={() => setWebReport(null)} />
    </div>
  )
}

export default CustomReportsPage
