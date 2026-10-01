import React, { useEffect, useMemo, useState } from 'react'
import { FaChevronDown, FaFileExcel } from 'react-icons/fa'
import { exportExcelWorkbook } from '../../../utils/excelExport'
import {
  formatDateTime,
  formatShortDate,
  formatSupportRequestType,
} from './SupportRequestShared'
import SupportRequestRowActionMenu from './SupportRequestRowActionMenu'

const ROWS_PER_PAGE = 10

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const getSupportRequestValue = (supportRequest, key) => {
  switch (key) {
    case 'srNumber':
      return supportRequest.srNumber || '-'
    case 'customerName':
      return supportRequest.customerName || '-'
    case 'customerNumber':
      return supportRequest.customerNumber || supportRequest.customerNo || '-'
    case 'requestType':
      return formatSupportRequestType(supportRequest.requestType)
    case 'serviceDate':
    case 'requestDate':
      return formatShortDate(supportRequest.srDate || supportRequest.requestDate || supportRequest.createdAt)
    case 'endDate':
      return formatShortDate(supportRequest.endDate || supportRequest.closedOn)
    case 'closedOn':
      return formatDateTime(supportRequest.closedOn)
    case 'closedBy':
      return supportRequest.closedByName || supportRequest.closedBy || '-'
    case 'ownerName':
      return supportRequest.ownerName || supportRequest.addedByName || '-'
    case 'status':
      return supportRequest.status || '-'
    case 'description':
      return supportRequest.description || supportRequest.issueDescription || '-'
    case 'materialList':
      return Array.isArray(supportRequest.materialList)
        ? supportRequest.materialList.join(', ')
        : supportRequest.materialList || supportRequest.materials || '-'
    case 'totalVisitGiven':
      return supportRequest.totalVisitGiven || supportRequest.totalVisits || supportRequest.visitCount || '-'
    case 'underWarranty':
      if (typeof supportRequest.underWarranty === 'boolean') {
        return supportRequest.underWarranty ? 'Yes' : 'No'
      }
      return supportRequest.underWarranty || supportRequest.warrantyStatus || '-'
    case 'contactEmail':
      return supportRequest.contactEmail || supportRequest.email || '-'
    case 'phone':
      return supportRequest.phone || supportRequest.mobile || supportRequest.contactPhone || '-'
    case 'sitePerson':
      return supportRequest.sitePerson || supportRequest.siteContactPerson || '-'
    case 'address':
      return supportRequest.address || supportRequest.siteAddress || '-'
    case 'contactPerson':
      return supportRequest.contactPerson || '-'
    case 'email':
      return supportRequest.email || supportRequest.contactEmail || '-'
    case 'attendingRequirements':
      return supportRequest.attendingRequirements || '-'
    case 'onSiteRequirements':
      return supportRequest.onSiteRequirements || supportRequest.onsiteRequirements || '-'
    case 'onHoldReason':
      return supportRequest.onHoldReason || '-'
    case 'postponedReason':
      return supportRequest.postponedReason || '-'
    case 'note':
      return supportRequest.note || supportRequest.notes || supportRequest.remark || supportRequest.remarks || supportRequest.description || '-'
    case 'addedByName':
      return supportRequest.addedByName || supportRequest.createdByName || '-'
    case 'addedOn':
      return formatDateTime(supportRequest.addedOn || supportRequest.createdAt)
    case 'reopenedOn':
      return formatDateTime(supportRequest.reopenedOn)
    case 'lastUpdated':
      return formatDateTime(supportRequest.updatedAt || supportRequest.lastUpdated || supportRequest.createdAt)
    default:
      return supportRequest[key] || '-'
  }
}

const compareValues = (leftValue, rightValue) => {
  const left = normalizeValue(leftValue)
  const right = normalizeValue(rightValue)

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const SupportRequestTable = ({
  title = 'Support Request',
  rows = [],
  columns = [],
  basePath = '/admin/support-requests',
  showActionMenu = true,
  emptyMessage = 'No Records Found',
  exportFilename = 'support-requests.xlsx',
  exportCompact = false,
  excelLike = false,
}) => {
  const [filters, setFilters] = useState(() => (
    Object.fromEntries(columns.map((column) => [column.key, '']))
  ))
  const [sortConfig, setSortConfig] = useState({ key: columns[0]?.key || '', direction: 'asc' })
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setFilters(Object.fromEntries(columns.map((column) => [column.key, ''])))
    setSortConfig({ key: columns[0]?.key || '', direction: 'asc' })
    setCurrentPage(1)
  }, [columns])

  const filteredRows = useMemo(() => (
    rows.filter((supportRequest) => (
      columns.every((column) => {
        const filterValue = normalizeValue(filters[column.key])
        if (!filterValue) return true

        return normalizeValue(getSupportRequestValue(supportRequest, column.key)).includes(filterValue)
      })
    ))
  ), [columns, filters, rows])

  const sortedRows = useMemo(() => {
    const activeColumn = columns.find((column) => column.key === sortConfig.key)
    if (!activeColumn) return filteredRows

    const direction = sortConfig.direction === 'desc' ? -1 : 1
    return [...filteredRows].sort((left, right) => (
      compareValues(
        getSupportRequestValue(left, activeColumn.key),
        getSupportRequestValue(right, activeColumn.key)
      ) * direction
    ))
  }, [columns, filteredRows, sortConfig.direction, sortConfig.key])

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / ROWS_PER_PAGE))
  const paginatedRows = useMemo(() => (
    sortedRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)
  ), [currentPage, sortedRows])

  useEffect(() => {
    setCurrentPage(1)
  }, [filters])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
  }

  const handleSort = (key) => {
    setSortConfig((currentSort) => ({
      key,
      direction: currentSort.key === key && currentSort.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleExport = () => {
    const exportRows = sortedRows.map((supportRequest) => (
      Object.fromEntries(columns.map((column) => [
        column.key,
        getSupportRequestValue(supportRequest, column.key),
      ]))
    ))

    exportExcelWorkbook({
      filename: String(exportFilename || 'support-requests.xlsx').replace(/\.(xls|xlsx|csv)$/i, '.xlsx'),
      title,
      sheetName: title,
      totalRecords: sortedRows.length,
      downloadedRecords: sortedRows.length,
      columns: columns.map((column) => ({
        key: column.key,
        label: column.label,
        type: column.type || 'text',
      })),
      rows: exportRows,
      compact: exportCompact,
    })
  }

  return (
    <div className={`support-request-legacy-page${excelLike ? ' support-request-legacy-page--excel-like' : ''}`}>
      <header className="support-request-legacy-header">
        <h1>{title} - {sortedRows.length} records</h1>
        <button
          type="button"
          className="support-request-export-btn"
          onClick={handleExport}
          disabled={sortedRows.length === 0}
          title="Download Excel"
        >
          <FaFileExcel />
          <span>Excel</span>
        </button>
      </header>

      <div className="support-request-legacy-table-shell">
        <table className="support-request-legacy-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <button
                    type="button"
                    className="support-request-sort-button"
                    onClick={() => handleSort(column.key)}
                  >
                    <span>{column.label}</span>
                    <span>
                      {sortConfig.key === column.key
                        ? (sortConfig.direction === 'asc' ? '^' : 'v')
                        : <FaChevronDown size={10} />}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
            <tr className="support-request-legacy-filter-row">
              {columns.map((column) => (
                <th key={column.key}>
                  <input
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(event) => handleFilterChange(column.key, event.target.value)}
                    placeholder={excelLike ? 'Enter value' : `Search ${column.label}`}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length > 0 ? paginatedRows.map((supportRequest) => (
              <tr key={supportRequest.id || supportRequest._id || supportRequest.srNumber}>
                {columns.map((column) => {
                  const cellValue = getSupportRequestValue(supportRequest, column.key)

                  return (
                    <td key={`${supportRequest.id || supportRequest._id || supportRequest.srNumber}-${column.key}`}>
                      {column.key === 'srNumber' && showActionMenu ? (
                        <SupportRequestRowActionMenu
                          supportRequest={supportRequest}
                          basePath={basePath}
                          compact
                          triggerLabel={cellValue}
                        />
                      ) : cellValue}
                    </td>
                  )
                })}
              </tr>
            )) : (
              <tr>
                <td colSpan={columns.length} className="support-request-legacy-empty">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="support-request-legacy-footer">
          <div className="support-request-legacy-footer-total">Total records: {sortedRows.length}</div>
          <div className="support-request-legacy-footer-pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              prev
            </button>
            <span>{currentPage}</span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportRequestTable
export { getSupportRequestValue, normalizeValue }
