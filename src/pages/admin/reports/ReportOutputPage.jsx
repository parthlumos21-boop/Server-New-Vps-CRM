import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  FaDownload,
  FaEye,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
} from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../../utils/excelExport'
import apiClient from '../../../services/apiClient'
import './ReportOutputPage.css'

const OUTPUT_COLUMNS = [
  { key: 'accountNumber', label: 'Account No.', width: 18 },
  { key: 'accountName', label: 'Account Name', width: 24 },
  { key: 'accountDate', label: 'Account Date', width: 18 },
  { key: 'accountCategory', label: 'Account Category', width: 20 },
  { key: 'accountOwner', label: 'Account Owner', width: 22 },
  { key: 'accountStatus', label: 'Account Status', width: 18 },
  { key: 'accountSource', label: 'Account Source', width: 20 },
  { key: 'contactPerson', label: 'Contact Person', width: 22 },
]

const CUSTOMER_OUTPUT_COLUMNS = [
  { key: 'customerNumber', label: 'Customer No.', width: 18 },
  { key: 'customerName', label: 'Customer Name', width: 24 },
  { key: 'company', label: 'Company', width: 24 },
  { key: 'city', label: 'City', width: 18 },
  { key: 'phone', label: 'Phone', width: 18 },
  { key: 'email', label: 'Email', width: 24 },
  { key: 'status', label: 'Status', width: 16 },
  { key: 'assignedTo', label: 'Assigned To', width: 22 },
]

const DEAL_OUTPUT_COLUMNS = [
  { key: 'dealNumber', label: 'Deal No.', width: 18 },
  { key: 'dealDate', label: 'Deal Date', width: 18 },
  { key: 'dealName', label: 'Deal Name', width: 24 },
  { key: 'dealOwner', label: 'Deal Owner', width: 22 },
  { key: 'dealType', label: 'Deal Type', width: 18 },
  { key: 'dealStatus', label: 'Deal Status', width: 18 },
  { key: 'dealValue', label: 'Deal Value', width: 18 },
  { key: 'projectName', label: 'Project Name', width: 24 },
  { key: 'consultantName', label: 'Consultant Name', width: 24 },
]

const REPORT_CONFIG = {
  account: {
    label: 'Account Report',
    filename: 'Account_Report',
    emptyText: 'No account records available.',
    columns: OUTPUT_COLUMNS,
  },
  customer: {
    label: 'Customer Report',
    filename: 'Customer_Report',
    emptyText: 'No customer records available.',
    columns: CUSTOMER_OUTPUT_COLUMNS,
  },
  deal: {
    label: 'Deal Report',
    filename: 'Deal_Report',
    emptyText: 'No deal records available.',
    columns: DEAL_OUTPUT_COLUMNS,
  },
}

const readValue = (record, keys) => {
  const match = keys.find((key) => record?.[key] !== undefined && record?.[key] !== null && record?.[key] !== '')
  return match ? record[match] : '-'
}

const formatDate = (value) => {
  if (!value || value === '-') return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString('en-IN')
}

const buildAccountRows = (accounts) => (
  (accounts || []).map((account) => ({
    accountNumber: readValue(account, ['accountNumber', 'customerNumber', 'leadNumber', 'number', 'accountNo', 'id']),
    accountName: readValue(account, ['accountName', 'customerName', 'name', 'company']),
    accountDate: formatDate(readValue(account, ['accountDate', 'dateAdded', 'createdAt', 'addedDate'])),
    accountCategory: readValue(account, ['accountCategory', 'category']),
    accountOwner: readValue(account, ['accountOwnerDisplay', 'accountOwnerName', 'accountOwner', 'ownerName', 'owner', 'assignedToName']),
    accountStatus: readValue(account, ['accountStatus', 'status', 'stage']),
    accountSource: readValue(account, ['accountSource', 'source']),
    contactPerson: readValue(account, ['contactPerson', 'contactName', 'person']),
  }))
)

const buildCustomerRows = (customers) => (
  (customers || []).map((customer) => ({
    customerNumber: readValue(customer, ['customerNumber', 'customerNo', 'number', 'id']),
    customerName: readValue(customer, ['name', 'customerName']),
    company: readValue(customer, ['company', 'companyName']),
    city: readValue(customer, ['city', 'location']),
    phone: readValue(customer, ['phone', 'mobile']),
    email: readValue(customer, ['email']),
    status: readValue(customer, ['status']),
    assignedTo: readValue(customer, ['assignedToName', 'ownerName', 'assignedTo', 'owner']),
  }))
)

const buildDealRows = (deals) => (
  (deals || []).map((deal) => ({
    dealNumber: readValue(deal, ['dealNumber', 'number', 'id']),
    dealDate: formatDate(readValue(deal, ['dealDate', 'date', 'createdAt', 'addedDate', 'quotationDate'])),
    dealName: readValue(deal, ['dealName', 'name', 'title']),
    dealOwner: readValue(deal, ['dealOwnerDisplay', 'dealOwnerName', 'dealOwner', 'ownerName', 'owner']),
    dealType: readValue(deal, ['dealType', 'type', 'customerCategory']),
    dealStatus: readValue(deal, ['dealStatus', 'status', 'stage']),
    dealValue: readValue(deal, ['dealValue', 'value', 'amount']),
    projectName: readValue(deal, ['projectName', 'project']),
    consultantName: readValue(deal, ['consultantName', 'consultant']),
  }))
)

const buildPrintableTable = (title, columns, rows) => {
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
  </style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
}

const ReportOutputPage = () => {
  const { user } = useAuth()
  const location = useLocation()
  
  const searchParams = new URLSearchParams(location.search)
  const categoryParam = searchParams.get('category') || 'account'
  const isDaily = searchParams.get('isDaily') === 'true' || searchParams.get('restricted') === 'true'

  const initialReportTab = categoryParam === 'all' ? 'account' : (REPORT_CONFIG[categoryParam] ? categoryParam : 'account')
  const [activeReport, setActiveReport] = useState(initialReportTab)
  const [liveAccounts, setLiveAccounts] = useState([])
  const [liveDeals, setLiveDeals] = useState([])
  const [liveCustomers, setLiveCustomers] = useState([])
  const [liveUsers, setLiveUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchCollections = async () => {
      setLoading(true)
      try {
        const [leadsRes, dealsRes, customersRes, usersRes] = await Promise.allSettled([
          apiClient.get('/leads', { params: { limit: 100000 } }),
          apiClient.get('/deals', { params: { limit: 100000 } }),
          apiClient.get('/customers', { params: { limit: 100000 } }),
          apiClient.get('/users', { params: { limit: 10000 } }),
        ])

        if (isMounted) {
          if (leadsRes.status === 'fulfilled') {
            const data = leadsRes.value?.data?.data || leadsRes.value?.data || []
            setLiveAccounts(Array.isArray(data) ? data : [])
          }
          if (dealsRes.status === 'fulfilled') {
            const data = dealsRes.value?.data?.data || dealsRes.value?.data || []
            setLiveDeals(Array.isArray(data) ? data : [])
          }
          if (customersRes.status === 'fulfilled') {
            const data = customersRes.value?.data?.data || customersRes.value?.data || []
            setLiveCustomers(Array.isArray(data) ? data : [])
          }
          if (usersRes.status === 'fulfilled') {
            const data = usersRes.value?.data?.data || usersRes.value?.data || []
            setLiveUsers(Array.isArray(data) ? data : [])
          }
        }
      } catch (err) {
        console.error('Failed to load report collections from MongoDB:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchCollections()

    return () => {
      isMounted = false
    }
  }, [])

  const reportConfig = REPORT_CONFIG[activeReport] || REPORT_CONFIG.account

  const isToday = (dateString) => {
    if (!dateString) return false
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return false
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

  const filteredAccounts = useMemo(() => {
    if (!isDaily) return liveAccounts
    return liveAccounts.filter((item) => (
      isCurrentUser(
        item.accountOwnerName || item.accountOwner || item.ownerName || item.raw?.accountOwner,
        item.assignedTo || item.ownerUserId,
        item.createdBy
      ) &&
      isToday(item.accountDate || item.createdAt || item.addedDate)
    ))
  }, [liveAccounts, isDaily, user])

  const filteredDeals = useMemo(() => {
    if (!isDaily) return liveDeals
    return liveDeals.filter((item) => (
      isCurrentUser(
        item.dealOwnerName || item.dealOwner || item.ownerName || item.owner,
        item.assignedTo || item.ownerUserId,
        item.createdBy
      ) &&
      isToday(item.dealDate || item.quotationDate || item.createdAt || item.addedOn)
    ))
  }, [liveDeals, isDaily, user])

  const filteredCustomers = useMemo(() => {
    if (!isDaily) return liveCustomers
    return liveCustomers.filter((item) => (
      isCurrentUser(
        item.assignedToName || item.ownerName || item.owner,
        item.assignedTo || item.ownerUserId,
        item.createdBy
      ) &&
      isToday(item.createdAt || item.addedDate)
    ))
  }, [liveCustomers, isDaily, user])

  const rows = useMemo(() => {
    if (activeReport === 'deal') return buildDealRows(filteredDeals)
    if (activeReport === 'customer') return buildCustomerRows(filteredCustomers)
    return buildAccountRows(filteredAccounts)
  }, [activeReport, filteredAccounts, filteredCustomers, filteredDeals])

  const [hasPreview, setHasPreview] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 9
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const columns = reportConfig.columns

  const exportOptions = {
    filename: `${reportConfig.filename}_${isDaily ? 'Daily' : 'All'}.xlsx`,
    title: `${reportConfig.label} (${isDaily ? 'Daily' : 'All'})`,
    sheetName: reportConfig.label,
    compact: false,
    columns,
    rows,
  }

  const handlePreview = () => {
    setHasPreview(true)
    setPage(1)
  }

  const handleExport = (format) => {
    if (format === 'csv') {
      exportCsvWorkbook({ ...exportOptions, filename: `${reportConfig.filename}_${isDaily ? 'Daily' : 'All'}.csv` })
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
      frame.srcdoc = buildPrintableTable(`${reportConfig.label} (${isDaily ? 'Daily' : 'All'})`, columns, rows)
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => document.body.removeChild(frame), 1500)
      }
    }
  }

  return (
    <div className="report-output-page">
      <section className="report-output-card">
        <div className="report-output-card__heading">
          <div className="report-output-card__title">
            <h1>{isDaily ? 'Daily Status Report' : 'Report Output'}</h1>
            <div className="report-output-card__switch" aria-label="Report output type">
              {Object.entries(REPORT_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  type="button"
                  className={activeReport === key ? 'active' : ''}
                  onClick={() => {
                    setActiveReport(key)
                    setPage(1)
                    setHasPreview(true)
                  }}
                >
                  {config.label}
                </button>
              ))}
            </div>
          </div>
          <div className="report-output-card__actions">
            <button type="button" onClick={handlePreview}><FaEye /> Preview Report</button>
            <button type="button" onClick={() => handleExport('excel')}><FaFileExcel /> Export Excel</button>
            <button type="button" onClick={() => handleExport('csv')}><FaFileCsv /> Export CSV</button>
            <button type="button" onClick={() => handleExport('pdf')}><FaFilePdf /> Export PDF</button>
            <button type="button" onClick={() => handleExport('print')}><FaPrint /> Print</button>
            <button type="button" onClick={() => handleExport('excel')}><FaDownload /> Export</button>
          </div>
        </div>

        <div className="report-output-card__body">
          {loading ? (
            <div className="report-output-card__empty">Loading data from MongoDB collections...</div>
          ) : !hasPreview ? (
            <div className="report-output-card__empty">Click Preview Report to display report.</div>
          ) : rows.length === 0 ? (
            <div className="report-output-card__empty">{reportConfig.emptyText}</div>
          ) : (
            <>
              <table className="report-output-card__table">
                <thead>
                  <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
                </thead>
                <tbody>
                  {pagedRows.map((row, rowIndex) => (
                    <tr key={`${page}-${rowIndex}`}>
                      {columns.map((column) => <td key={column.key}>{row[column.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="report-output-card__pagination">
                <span>{rows.length} row(s)</span>
                <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
                <span>Page {page} of {pageCount}</span>
                <button type="button" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</button>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

export default ReportOutputPage
