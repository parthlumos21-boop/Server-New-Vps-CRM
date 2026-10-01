import React, { useEffect, useMemo, useRef, useState } from 'react'
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
import './CustomReportsPage.css'

const TEMPLATE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'account', label: 'Accounts' },
  { key: 'customer', label: 'Customers' },
  { key: 'deal', label: 'Deals' },
]

const ADD_TEMPLATE_CONTEXT_OPTIONS = [
  'account',
  'customer',
  'deal',
]

const NEW_REPORT_CONTEXT_OPTIONS = [
  'account',
  'customer',
  'deal',
  'converted_deal',
  'project',
  'sr',
  'closed_sr',
  'lead',
  'contact',
  'quotation',
  'converted_account',
  'activity',
  'task',
  'follow_up',
  'owner_wise_reports',
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
  const category = report.categoryKey || getCustomReportContext(report.reportContext).categoryKey
  return TEMPLATE_FILTERS.find((entry) => entry.key === category)?.label || getCustomReportContext(report.reportContext).label
}

const getReportType = (report) => report.type || report.typeLabel || report.entityType || getCustomReportContext(report.reportContext).label

const getReportFields = (report) => {
  if (report.fields) {
    if (Array.isArray(report.fields)) {
      return report.fields.map(f => typeof f === 'object' ? f.label : f).join(', ')
    }
    return report.fields
  }
  return (report.selectedFields || [])
    .map((fieldKey) => getCustomReportFieldLabel(report.reportContext, fieldKey))
    .join(', ') || '-'
}

const getReportFilters = (report) => {
  if (report.filtersText || typeof report.filters === 'string') return report.filtersText || report.filters
  const filters = Array.isArray(report.filters) ? report.filters : []
  return filters
    .filter((filter) => filter.field)
    .map((filter, index) => [
      index > 0 ? filter.connector : '',
      getCustomReportFieldLabel(report.reportContext, filter.field),
      filter.operator,
      filter.value,
      filter.operator === 'between' ? filter.valueTo : '',
    ].filter(Boolean).join(' '))
    .join('; ')
}

const getReportGroupBy = (report) => (
  report.groupBy
    ? getCustomReportFieldLabel(report.reportContext, report.groupBy)
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
            {report.title || report.reportName}
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
            <span><strong>Description-</strong> {report.description || `${getReportType(report)} Report Template`}</span>
          </div>
          <div className="cr-list-row">
            <FaCalendarAlt />
            <span><strong>Created By-</strong> {report.createdBy || 'Admin'} <strong>On-</strong> {formatStoredDate(report.createdOn)}</span>
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
  const isKevalOrAdmin = isAdmin || 
    (user?.name && user.name.toLowerCase().includes('keval')) || 
    (user?.username && user.username.toLowerCase().includes('keval')) || 
    (user?.email && user.email.toLowerCase().includes('keval'))
  const addRef = useRef(null)
  const newRef = useRef(null)
  const [activeFilter, setActiveFilter] = useState('all')
  const [activeCustomSubFilter, setActiveCustomSubFilter] = useState('all')
  const [activeManagementTab, setActiveManagementTab] = useState(isAdmin ? 'all' : 'shared')
  const [addOpen, setAddOpen] = useState(false)
  const [newOpen, setNewOpen] = useState(false)
  const [templates, setTemplates] = useState(() => getAdminReportTemplates())
  const [webReport, setWebReport] = useState(null)

  useEffect(() => subscribeAdminReportTemplates(() => setTemplates(getAdminReportTemplates())), [])

  useEffect(() => {
    const handleOutside = (event) => {
      if (addRef.current && !addRef.current.contains(event.target)) setAddOpen(false)
      if (newRef.current && !newRef.current.contains(event.target)) setNewOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const addTemplateOptions = useMemo(() => ADD_TEMPLATE_CONTEXT_OPTIONS.map((key) => ({
    key,
    label: ADD_TEMPLATE_LABELS[key],
  })), [])

  const newReportOptions = useMemo(() => NEW_REPORT_CONTEXT_OPTIONS.map((key) => ({
    key,
    label: getCustomReportContext(key).label,
  })), [])

  const customReports = useMemo(() => templates
    .filter((report) => canUserViewReportTemplate(report, user))
    .map((report) => ({
      ...report,
      categoryKey: report.categoryKey || getCustomReportContext(report.reportContext).categoryKey,
      group: getReportGroupName(report),
    })), [templates, user])

  const visibleReports = useMemo(() => {
    const reports = [
      ...SYSTEM_REPORTS.filter((report) => isAdmin || report.visibility === 'All'),
      ...customReports,
    ]

    return reports.filter((report) => {
      if (activeFilter === 'custom' && !report.isBackend) return false
      if (activeFilter === 'custom' && activeCustomSubFilter !== 'all' && String(report.categoryKey).toLowerCase() !== activeCustomSubFilter) return false
      if (activeFilter !== 'all' && activeFilter !== 'custom' && String(report.categoryKey).toLowerCase() !== activeFilter) return false
      if (activeManagementTab === 'all') return isAdmin
      if (report.systemReport) return activeManagementTab === 'shared'

      const isOwn = canUserEditReportTemplate(report, user)
      if (activeManagementTab === 'my') return isOwn
      if (activeManagementTab === 'shared') return !isOwn
      return true
    })
  }, [activeFilter, activeCustomSubFilter, activeManagementTab, customReports, isAdmin, user])

  const groupedReports = useMemo(() => visibleReports.reduce((groups, report) => {
    const groupName = getReportGroupName(report)
    if (!groups[groupName]) groups[groupName] = []
    groups[groupName].push(report)
    return groups
  }, {}), [visibleReports])

  const openBuilder = (contextKey, extra = '') => {
    setAddOpen(false)
    setNewOpen(false)
    navigate(`${basePath}/custom/builder?context=${encodeURIComponent(contextKey)}${extra}`)
  }

  const handleAddTemplate = (contextKey) => {
    setAddOpen(false)
    setNewOpen(false)
    const templateRoutes = {
      account: 'account',
      customer: 'customer',
      sr: 'sr',
      closed_sr: 'closed-sr',
      deal: 'deal',
      quotation: 'quotation',
      geo_tracking: 'geo-tracking',
      remark: 'remark',
      daily_status: 'daily-status',
    }
    navigate(`${basePath}/templates/${templateRoutes[contextKey] || 'account'}/new`)
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

  const handleExport = (report, format = 'excel') => {
    const reportName = report.reportName || report.title || 'Custom Report'
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

    const allDeals = [...deals, ...convertedDeals]

    let dataSets = []
    const mapAccount = (item) => ({
      'Account No.': item.accountNumber || '-',
      'Account Date': item.accountDate ? new Date(item.accountDate).toLocaleDateString('en-GB') : '-',
      'Account Name': item.name || '-',
      'Account Owner': item.accountOwnerName || item.accountOwner || item.raw?.accountOwner || '-',
      'Account Status': item.status || '-',
      'Account State': item.accountState || '-',
      'Account Source': item.accountSource || '-',
      'Contact Person': item.contactPerson || '-',
      'Phone': item.phone || '-',
      'Email': item.email || '-',
      'Latest Remark': item.latestRemark || '-',
      'PO Value': item.poValue || '-',
      'Job No': item.jobNo || '-',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
    })

    const mapDeal = (item) => ({
      'Deal Name': item.dealName || item.name || '-',
      'Account Name': item.accountName || '-',
      'Deal Owner': item.ownerName || item.owner || '-',
      'Stage': item.stage || '-',
      'Status': item.status || '-',
      'Deal Value': item.dealValue || '-',
      'Expected Close Date': item.expectedCloseDate ? new Date(item.expectedCloseDate).toLocaleDateString('en-GB') : '-',
      'Added On': item.addedOn ? new Date(item.addedOn).toLocaleDateString('en-GB') : '-',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
    })

    const mapCustomer = (item) => ({
      'Customer Name': item.name || item.customerName || '-',
      'Customer Code': item.customerCode || '-',
      'Owner': item.ownerName || item.owner || '-',
      'Status': item.status || '-',
      'Mobile': item.mobile || item.phone || '-',
      'Email': item.email || '-',
      'City': item.city || '-',
      'Created At': item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-GB') : '-',
    })
    
    const mapQuotation = (item) => ({
      'Quotation No': item.quotationNo || '-',
      'Date': item.date ? new Date(item.date).toLocaleDateString('en-GB') : '-',
      'Account': item.accountName || '-',
      'Deal': item.dealName || '-',
      'Grand Total': item.grandTotal || '-',
      'Status': item.status || '-',
    })

    if (activeFilter === 'all') {
      dataSets = [
        ...filterByDate(allDeals, 'addedOn').map(item => ({ 'Data Type': 'Deal', ...mapDeal(item) })),
        ...filterByDate(accounts, 'accountDate').map(item => ({ 'Data Type': 'Account', ...mapAccount(item) })),
        ...filterByDate(customers, 'createdAt').map(item => ({ 'Data Type': 'Customer', ...mapCustomer(item) })),
        ...filterByDate(quotations, 'date').map(item => ({ 'Data Type': 'Quotation', ...mapQuotation(item) })),
      ]
    } else if (activeFilter === 'account') {
      dataSets = filterByDate(accounts, 'accountDate').map(mapAccount)
    } else if (activeFilter === 'deal') {
      dataSets = filterByDate(allDeals, 'addedOn').map(mapDeal)
    } else if (activeFilter === 'customer') {
      dataSets = filterByDate(customers, 'createdAt').map(mapCustomer)
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
  }

  return (
    <div className="cr-list-page">
      <header className="cr-list-topbar">
        <h1>Custom Reports</h1>
        <div className="cr-list-topbar-actions">
          <button type="button" className="cr-list-help">Need Help?</button>
          <SplitDropdown
            label="Add Report Template"
            options={addTemplateOptions}
            isOpen={addOpen}
            buttonRef={addRef}
            onToggle={() => { setAddOpen((value) => !value); setNewOpen(false) }}
            onSelect={handleAddTemplate}
          />
          <SplitDropdown
            label="New Report"
            options={newReportOptions}
            isOpen={newOpen}
            buttonRef={newRef}
            onToggle={() => { setNewOpen((value) => !value); setAddOpen(false) }}
            onSelect={(contextKey) => openBuilder(contextKey)}
          />
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
                    if (filter.key === 'custom') setActiveCustomSubFilter('all')
                  }}
                >
                  {filter.label}
                </button>
                {filter.key === 'custom' && activeFilter === 'custom' && (
                  <div className="cr-list-sidebar-subitems" style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem', marginTop: '0.25rem' }}>
                    <button type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: activeCustomSubFilter === 'all' ? '#d32f2f' : '#333', fontWeight: activeCustomSubFilter === 'all' ? '600' : 'normal', fontSize: '0.9rem' }} onClick={() => setActiveCustomSubFilter('all')}>All Custom</button>
                    <button type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: activeCustomSubFilter === 'account' ? '#d32f2f' : '#333', fontWeight: activeCustomSubFilter === 'account' ? '600' : 'normal', fontSize: '0.9rem' }} onClick={() => setActiveCustomSubFilter('account')}>Accounts</button>
                    <button type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: activeCustomSubFilter === 'customer' ? '#d32f2f' : '#333', fontWeight: activeCustomSubFilter === 'customer' ? '600' : 'normal', fontSize: '0.9rem' }} onClick={() => setActiveCustomSubFilter('customer')}>Customers</button>
                    <button type="button" style={{ textAlign: 'left', background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer', color: activeCustomSubFilter === 'deal' ? '#d32f2f' : '#333', fontWeight: activeCustomSubFilter === 'deal' ? '600' : 'normal', fontSize: '0.9rem' }} onClick={() => setActiveCustomSubFilter('deal')}>Deals</button>
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
                    onViewWeb={setWebReport}
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
