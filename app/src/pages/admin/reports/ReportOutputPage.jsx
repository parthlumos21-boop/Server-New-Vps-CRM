import React, { useMemo, useState } from 'react'
import {
  FaDownload,
  FaEye,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
} from 'react-icons/fa'
import { useData } from '../../../context/DataContext'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../../utils/excelExport'
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
    accountNumber: readValue(account, ['accountNumber', 'customerNumber', 'leadNumber', 'number', 'id']),
    accountName: readValue(account, ['accountName', 'customerName', 'name']),
    accountDate: formatDate(readValue(account, ['accountDate', 'dateAdded', 'createdAt', 'addedDate'])),
    accountCategory: readValue(account, ['accountCategory', 'category']),
    accountOwner: readValue(account, ['accountOwner', 'ownerName', 'owner', 'assignedToName']),
    accountStatus: readValue(account, ['accountStatus', 'status', 'stage']),
    accountSource: readValue(account, ['accountSource', 'source']),
    contactPerson: readValue(account, ['contactPerson', 'contactName', 'person']),
  }))
)

const buildDealRows = (deals) => (
  (deals || []).map((deal) => ({
    dealNumber: readValue(deal, ['dealNumber', 'number', 'id']),
    dealDate: formatDate(readValue(deal, ['dealDate', 'date', 'createdAt', 'addedDate'])),
    dealName: readValue(deal, ['dealName', 'name', 'title']),
    dealOwner: readValue(deal, ['dealOwner', 'dealOwnerName', 'ownerName', 'owner']),
    dealType: readValue(deal, ['dealType', 'type']),
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
  const { accounts, deals } = useData()
  const [activeReport, setActiveReport] = useState('account')
  const reportConfig = REPORT_CONFIG[activeReport] || REPORT_CONFIG.account
  const rows = useMemo(() => (
    activeReport === 'deal'
      ? buildDealRows(deals).slice(0, 50)
      : buildAccountRows(accounts).slice(0, 50)
  ), [accounts, activeReport, deals])
  const [hasPreview, setHasPreview] = useState(true)
  const [page, setPage] = useState(1)
  const pageSize = 9
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const columns = reportConfig.columns

  const exportOptions = {
    filename: `${reportConfig.filename}.xlsx`,
    title: reportConfig.label,
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
      exportCsvWorkbook({ ...exportOptions, filename: `${reportConfig.filename}.csv` })
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
      frame.srcdoc = buildPrintableTable(reportConfig.label, columns, rows)
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
            <h1>Report</h1>
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
          {!hasPreview ? (
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
