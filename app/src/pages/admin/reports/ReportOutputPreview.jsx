import React, { useMemo, useRef, useState } from 'react'
import {
  FaDownload,
  FaEye,
  FaFileCsv,
  FaFileExcel,
  FaFilePdf,
  FaPrint,
} from 'react-icons/fa'
import { exportCsvWorkbook, exportExcelWorkbook } from '../../../utils/excelExport'
import { slugify } from '../../../utils/helpers'
import './ReportOutputPreview.css'

const buildPlaceholderRow = (columns) => (
  columns.reduce((row, column) => {
    row[column] = '-'
    return row
  }, {})
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
  </style></head><body><h1>${escapeHtml(title)}</h1><table><thead><tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`
}

const ReportOutputPreview = ({ reportName = 'Custom Report', selectedFields = [] }) => {
  const outputRef = useRef(null)
  const [hasPreview, setHasPreview] = useState(false)
  const columns = useMemo(() => selectedFields.filter(Boolean), [selectedFields])
  const previewRows = useMemo(() => (
    columns.length > 0 ? [buildPlaceholderRow(columns)] : []
  ), [columns])

  const workbookOptions = {
    filename: `${slugify(reportName || 'custom-report')}.xlsx`,
    title: reportName || 'Custom Report',
    sheetName: 'Report',
    compact: false,
    columns: columns.map((column) => ({ key: column, label: column, width: Math.min(32, Math.max(14, String(column).length + 4)) })),
    rows: previewRows,
  }

  const showPreview = () => {
    setHasPreview(true)
    window.requestAnimationFrame(() => {
      outputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const exportRows = (format) => {
    if (columns.length === 0) {
      showPreview()
      return
    }

    if (format === 'csv') {
      exportCsvWorkbook({
        ...workbookOptions,
        filename: `${slugify(reportName || 'custom-report')}.csv`,
      })
      return
    }

    if (format === 'excel') {
      exportExcelWorkbook(workbookOptions)
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
      frame.srcdoc = buildPrintableTable(reportName, columns, previewRows)
      frame.onload = () => {
        frame.contentWindow?.focus()
        frame.contentWindow?.print()
        setTimeout(() => document.body.removeChild(frame), 1500)
      }
    }
  }

  return (
    <section className="report-output-preview" ref={outputRef}>
      <div className="report-output-preview__heading">
        <h2>Report</h2>
        <div className="report-output-preview__actions">
          <button type="button" className="report-output-preview__button" onClick={showPreview}><FaEye /> Preview Report</button>
          <button type="button" className="report-output-preview__button" onClick={() => exportRows('excel')}><FaFileExcel /> Export Excel</button>
          <button type="button" className="report-output-preview__button" onClick={() => exportRows('csv')}><FaFileCsv /> Export CSV</button>
          <button type="button" className="report-output-preview__button" onClick={() => exportRows('pdf')}><FaFilePdf /> Export PDF</button>
          <button type="button" className="report-output-preview__button" onClick={() => exportRows('print')}><FaPrint /> Print</button>
          <button type="button" className="report-output-preview__button" onClick={() => exportRows('excel')}><FaDownload /> Export</button>
        </div>
      </div>

      <div className="report-output-preview__body">
        {!hasPreview ? (
          <div className="report-output-preview__empty">Select fields and click Preview Report.</div>
        ) : columns.length === 0 ? (
          <div className="report-output-preview__empty">Select at least one report field.</div>
        ) : (
          <table className="report-output-preview__table">
            <thead>
              <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {previewRows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((column) => <td key={column}>{row[column]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default ReportOutputPreview
