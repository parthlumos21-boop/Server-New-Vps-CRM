import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaCheckSquare,
  FaCopy,
  FaEnvelope,
  FaEye,
  FaFileExcel,
  FaFilter,
  FaPaperPlane,
  FaPlay,
  FaPlus,
  FaSave,
  FaSearch,
  FaSort,
  FaSquare,
  FaTrash,
} from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { customerService } from '../../../services/customerService'
import { generateId, slugify } from '../../../utils/helpers'
import { exportExcelWorkbook } from '../../../utils/excelExport'
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
  const context = overrides.reportContext || overrides.dataSource || 'account'
  const fields = getCustomReportFields(context)

  return {
    id: overrides.id || '',
    reportContext: context,
    dataSource: context,
    entityType: getCustomReportContext(context).label,
    categoryKey: getCustomReportContext(context).categoryKey,
    typeLabel: getCustomReportContext(context).label,
    period: overrides.period || 'monthly',
    dateRange: overrides.dateRange || {
      date: new Date().toISOString().split('T')[0],
      month: new Date().getMonth(),
      year: new Date().getFullYear(),
      fromDate: '',
      toDate: '',
    },
    ownerFilter: overrides.ownerFilter || 'all',
    sendOwnerEmails: Boolean(overrides.sendOwnerEmails),
    sendCopyToAdmin: overrides.sendCopyToAdmin !== undefined ? Boolean(overrides.sendCopyToAdmin) : true,
    customSubject: overrides.customSubject || '',
    customMessage: overrides.customMessage || '',
    reportName: overrides.reportName || `${getCustomReportContext(context).label} Custom Report`,
    description: overrides.description || '',
    visibility: overrides.visibility || 'Visible to All',
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
    accountName: ['companyName', 'accountName', 'customerName', 'name'],
    accountNumber: ['accountNumber', 'customerNumber', 'leadNumber', 'number'],
    accountDate: ['accountDate', 'createdAt', 'addedDate'],
    accountOwner: ['accountOwner', 'ownerName', 'owner', 'assignedToName'],
    accountStatus: ['accountStatus', 'status', 'stage'],
    dealName: ['name', 'dealName', 'title'],
    dealStatus: ['stage', 'dealStatus', 'status'],
    dealValue: ['amount', 'dealValue', 'value'],
    dealDate: ['createdAt', 'dealDate'],
    dealOwner: ['dealOwner', 'ownerName', 'owner'],
    dealNumber: ['dealNumber', 'number'],
    customerName: ['customerName', 'companyName', 'name'],
    customerNumber: ['customerNumber', 'number'],
    customerOwner: ['customerOwner', 'ownerName', 'owner'],
    customerStatus: ['customerStatus', 'status'],
    quotationNumber: ['quotationNumber', 'number'],
    quotationTitle: ['title', 'quotationTitle'],
    quotationOwner: ['quotationOwner', 'ownerName', 'owner'],
    amount: ['grandTotal', 'amount', 'total'],
    status: ['status', 'stage'],
    createdAt: ['createdAt', 'addedDate'],
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
  return left.includes(right)
}

const applyFilters = (records, filters) => {
  const activeFilters = filters.filter((filter) => filter.field && filter.operator)
  if (activeFilters.length === 0) return records
  return records.filter((record) => activeFilters.every((filter) => matchesFilter(record, filter)))
}

const getSourceRecords = (contextKey, collections) => {
  if (contextKey === 'customer') return collections.customers
  if (contextKey === 'deal') return collections.deals
  if (contextKey === 'quotation') return collections.quotations
  return collections.accounts
}

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
      })
    }
    return buildDraft(user, requestedContext ? { reportContext: requestedContext } : {})
  })

  const [availableSearch, setAvailableSearch] = useState('')
  const [selectedFieldKey, setSelectedFieldKey] = useState('')
  const [availableFieldKey, setAvailableFieldKey] = useState('')
  const [previewRows, setPreviewRows] = useState([])
  const [hasRun, setHasRun] = useState(false)
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)
  const [dispatchResults, setDispatchResults] = useState(null)
  const reportOutputRef = useRef(null)

  useEffect(() => {
    subscribeAdminReportTemplates(() => setTemplates(getAdminReportTemplates()))
  }, [])

  const customers = useMemo(() => customerService.getCustomers(), [])
  const collections = useMemo(() => ({
    accounts: data.accounts || [],
    customers,
    deals: data.deals || [],
    quotations: data.quotations || [],
    users: data.users || [],
  }), [customers, data])

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

  const updateDraft = (updates) => {
    setDraft((current) => {
      const next = typeof updates === 'function' ? updates(current) : { ...current, ...updates }
      if (next.reportContext !== current.reportContext) {
        return buildDraft(user, {
          ...next,
          id: current.id,
          selectedFields: getCustomReportFields(next.reportContext).slice(0, 8).map((field) => field.key),
          reportName: `${getCustomReportContext(next.reportContext).label} Custom Report`,
        })
      }
      return next
    })
  }

  const handleSelectAllFields = () => {
    const allKeys = contextFields.map((f) => f.key)
    updateDraft({ selectedFields: allKeys })
  }

  const handleDeselectAllFields = () => {
    updateDraft({ selectedFields: [] })
  }

  const runReport = async () => {
    try {
      const response = await fetch('/api/reports/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: draft.reportContext,
          selectedFields: draft.selectedFields,
          period: draft.period,
          dateRange: draft.dateRange,
          ownerFilter: draft.ownerFilter,
        }),
      })

      if (response.ok) {
        const payload = await response.json()
        setPreviewRows(payload.rows || [])
        setHasRun(true)
        setPage(1)
        setMessage(`Live Report loaded: ${payload.rows?.length || 0} record(s).`)
        return payload.rows || []
      }
    } catch (_err) {
      // Fallback local query
    }

    const source = getSourceRecords(draft.reportContext, collections)
    const filtered = applyFilters(source, draft.filters || [])
    const rows = filtered.map((rec) => {
      const row = {}
      draft.selectedFields.forEach((fieldKey) => {
        row[getCustomReportFieldLabel(draft.reportContext, fieldKey)] = formatCell(readFieldValue(rec, fieldKey))
      })
      return row
    })
    setPreviewRows(rows)
    setHasRun(true)
    setPage(1)
    setMessage(`Report ready (Local Data): ${rows.length} row(s).`)
    return rows
  }

  const handlePreviewReport = () => {
    runReport()
    window.requestAnimationFrame(() => {
      reportOutputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleExportExcel = () => {
    const rows = previewRows.length > 0 ? previewRows : []
    if (rows.length === 0) {
      setMessage('Run report first to generate Excel export.')
      return
    }

    const fileBase = slugify(draft.reportName || 'crm-custom-report')
    const columns = draft.selectedFields.map((fieldKey) => {
      const label = getCustomReportFieldLabel(draft.reportContext, fieldKey)
      return { key: label, label, type: 'text', width: 22 }
    })

    exportExcelWorkbook({
      filename: `${fileBase}.xlsx`,
      title: draft.reportName || 'CRM Custom Report',
      subtitle: `${getCustomReportContext(draft.reportContext).label} Report (${draft.period.toUpperCase()})`,
      sheetName: 'Report Data',
      columns,
      rows,
    })
    setMessage('Excel file downloaded successfully.')
  }

  const handleSendOwnerEmails = async () => {
    setIsDispatching(true)
    setMessage('Dispatching owner-wise report emails via Microsoft Graph / Email Engine...')
    try {
      const response = await fetch('/api/reports/send-owner-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataSource: draft.reportContext,
          selectedFields: draft.selectedFields,
          period: draft.period,
          dateRange: draft.dateRange,
          ownerFilter: draft.ownerFilter,
          sendCopyToAdmin: draft.sendCopyToAdmin,
          customSubject: draft.customSubject,
          customMessage: draft.customMessage,
        }),
      })

      const result = await response.json()
      if (response.ok) {
        setDispatchResults(result.dispatchMatrix || [])
        setMessage(result.message || 'Owner-wise emails dispatched successfully.')
      } else {
        setMessage(`Email dispatch failed: ${result.error}`)
      }
    } catch (err) {
      setMessage(`Dispatch Error: ${err.message}`)
    } finally {
      setIsDispatching(false)
    }
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

  const pagedRows = useMemo(() => previewRows.slice((page - 1) * 25, page * 25), [page, previewRows])
  const pageCount = Math.max(1, Math.ceil(previewRows.length / 25))

  return (
    <div className="cr-page">
      <div className="cr-topbar">
        <div>
          <h1 className="cr-topbar-title">CRM Custom Reports Builder</h1>
          <p className="cr-topbar-subtitle">Multi-Entity Reports, Owner Isolation & Automated Dispatch</p>
        </div>
        <div className="cr-topbar-actions">
          <button type="button" className="cr-btn cr-btn-light" onClick={() => navigate(customReportListPath)}>
            Back to Reports
          </button>
          <button type="button" className="cr-btn cr-btn-green" onClick={handlePreviewReport}>
            <FaPlay /> Run Preview
          </button>
          <button type="button" className="cr-btn cr-btn-blue" onClick={handleExportExcel}>
            <FaFileExcel /> Export Excel (.xlsx)
          </button>
          <button type="button" className="cr-btn cr-btn-blue" disabled={isDispatching} onClick={handleSendOwnerEmails}>
            <FaPaperPlane /> Send Owner Emails
          </button>
        </div>
      </div>

      {message && <div className="cr-message">{message}</div>}

      <div className="cr-layout">
        <main className="cr-builder">
          {/* Section 1: Data Source & Entity Selection */}
          <section className="cr-section">
            <div className="cr-section-heading">
              <h2>Report Configuration & Data Source</h2>
            </div>
            <div className="cr-config-grid">
              <label>
                <span>Select Data Source / Entity</span>
                <select value={draft.reportContext} onChange={(event) => updateDraft({ reportContext: event.target.value })}>
                  <option value="account">Accounts (Leads)</option>
                  <option value="deal">Deals</option>
                  <option value="customer">Customers</option>
                  <option value="quotation">Quotations</option>
                </select>
              </label>

              <label>
                <span>Report Name</span>
                <input value={draft.reportName} onChange={(event) => updateDraft({ reportName: event.target.value })} />
              </label>

              <label>
                <span>Report Period</span>
                <select value={draft.period} onChange={(event) => updateDraft({ period: event.target.value })}>
                  <option value="daily">Daily Report</option>
                  <option value="monthly">Monthly Report</option>
                  <option value="yearly">Yearly Report</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </label>

              <label>
                <span>Filter Owner</span>
                <select value={draft.ownerFilter} onChange={(event) => updateDraft({ ownerFilter: event.target.value })}>
                  <option value="all">All Owners (Consolidated)</option>
                  {collections.users.map((u) => (
                    <option key={u.id || u.ownerCode} value={u.ownerCode || u.owner_code || u.name}>
                      {u.name} (Code: {u.ownerCode || u.owner_code || '-'})
                    </option>
                  ))}
                </select>
              </label>

              {draft.period === 'daily' && (
                <label>
                  <span>Select Date</span>
                  <input
                    type="date"
                    value={draft.dateRange.date || ''}
                    onChange={(e) => updateDraft({ dateRange: { ...draft.dateRange, date: e.target.value } })}
                  />
                </label>
              )}

              {draft.period === 'monthly' && (
                <>
                  <label>
                    <span>Month</span>
                    <select
                      value={draft.dateRange.month}
                      onChange={(e) => updateDraft({ dateRange: { ...draft.dateRange, month: Number(e.target.value) } })}
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Year</span>
                    <input
                      type="number"
                      value={draft.dateRange.year}
                      onChange={(e) => updateDraft({ dateRange: { ...draft.dateRange, year: Number(e.target.value) } })}
                    />
                  </label>
                </>
              )}

              {draft.period === 'custom' && (
                <>
                  <label>
                    <span>From Date</span>
                    <input
                      type="date"
                      value={draft.dateRange.fromDate || ''}
                      onChange={(e) => updateDraft({ dateRange: { ...draft.dateRange, fromDate: e.target.value } })}
                    />
                  </label>
                  <label>
                    <span>To Date</span>
                    <input
                      type="date"
                      value={draft.dateRange.toDate || ''}
                      onChange={(e) => updateDraft({ dateRange: { ...draft.dateRange, toDate: e.target.value } })}
                    />
                  </label>
                </>
              )}
            </div>
          </section>

          {/* Section 2: Automated Email Dispatch Settings */}
          <section className="cr-section">
            <div className="cr-section-heading">
              <h2><FaEnvelope /> Automated Owner Email Dispatch Configuration</h2>
            </div>
            <div className="cr-config-grid">
              <label className="cr-toggle">
                <input
                  type="checkbox"
                  checked={draft.sendOwnerEmails}
                  onChange={(e) => updateDraft({ sendOwnerEmails: e.target.checked })}
                />
                <span>Enable Owner-Wise Email Dispatch</span>
              </label>

              <label className="cr-toggle">
                <input
                  type="checkbox"
                  checked={draft.sendCopyToAdmin}
                  onChange={(e) => updateDraft({ sendCopyToAdmin: e.target.checked })}
                />
                <span>Send Consolidated Copy to Admin</span>
              </label>

              <label className="cr-field-wide">
                <span>Custom Email Subject</span>
                <input
                  value={draft.customSubject}
                  onChange={(e) => updateDraft({ customSubject: e.target.value })}
                  placeholder="e.g. Monthly Deals & Accounts Performance Report"
                />
              </label>

              <label className="cr-field-wide">
                <span>Custom Message Body</span>
                <textarea
                  value={draft.customMessage}
                  onChange={(e) => updateDraft({ customMessage: e.target.value })}
                  placeholder="Optional custom message to include in email body..."
                />
              </label>
            </div>
          </section>

          {/* Section 3: Selected Fields Picker */}
          <section className="cr-section">
            <div className="cr-section-heading">
              <h2>Entity Field Selection</h2>
              <div className="cr-topbar-actions">
                <button type="button" className="cr-mini-btn" onClick={handleSelectAllFields}>
                  <FaCheckSquare /> Select All Fields
                </button>
                <button type="button" className="cr-mini-btn" onClick={handleDeselectAllFields}>
                  <FaSquare /> Deselect All
                </button>
              </div>
            </div>
            <div className="cr-field-picker">
              <div className="cr-field-box">
                <div className="cr-field-box-head">
                  <strong>Available Entity Fields</strong>
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
                  <strong>Selected Export Fields</strong>
                  <span>{draft.selectedFields.length}</span>
                </div>
                <div className="cr-field-list cr-field-list-selected">
                  {draft.selectedFields.map((fieldKey) => (
                    <button type="button" key={fieldKey} className={selectedFieldKey === fieldKey ? 'active' : ''} onClick={() => setSelectedFieldKey(fieldKey)}>
                      <span>{getCustomReportFieldLabel(draft.reportContext, fieldKey)}</span>
                      <span className="cr-selected-actions">
                        <span onClick={(event) => { event.stopPropagation(); removeSelectedField(fieldKey) }}>Remove</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Execution Dispatch Matrix Result Table Modal/Card */}
          {dispatchResults && (
            <section className="cr-section">
              <div className="cr-section-heading">
                <h2>Email Dispatch Execution Result Matrix</h2>
              </div>
              <div className="cr-output-wrap">
                <table className="cr-output-table">
                  <thead>
                    <tr>
                      <th>Owner Name</th>
                      <th>Owner Code</th>
                      <th>Entity Source</th>
                      <th>Record Count</th>
                      <th>Target Email</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dispatchResults.map((item, idx) => (
                      <tr key={idx}>
                        <td><strong>{item.ownerName}</strong></td>
                        <td>{item.ownerCode}</td>
                        <td>{item.entitySource}</td>
                        <td>{item.recordCount}</td>
                        <td>{item.targetEmail}</td>
                        <td>{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section 5: Live Output Preview Table */}
          <section className="cr-section cr-output-section" ref={reportOutputRef}>
            <div className="cr-section-heading cr-section-heading--output">
              <h2>Live Report Preview Table</h2>
            </div>
            <div className="cr-output-wrap">
              {!hasRun ? (
                <div className="cr-output-empty">Click "Run Preview" to execute report query.</div>
              ) : previewRows.length === 0 ? (
                <div className="cr-output-empty">No matching records found.</div>
              ) : (
                <>
                  <table className="cr-output-table">
                    <thead>
                      <tr>
                        {Object.keys(previewRows[0]).map((header) => (
                          <th key={header}>{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRows.map((row, rowIndex) => (
                        <tr key={`${page}-${rowIndex}`}>
                          {Object.keys(previewRows[0]).map((header) => (
                            <td key={header}>{row[header]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="cr-pagination">
                    <span>Total: {previewRows.length} record(s)</span>
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
