import React, { useMemo, useState } from 'react'
import { FaChevronDown } from 'react-icons/fa'
import { buildSupportRequestCustomViewColumns, formatSupportRequestCustomViewFieldValue } from '../../../features/adminSupportRequests/customViews/supportRequestCustomViewConfig'
import SupportRequestRowActionMenu from './SupportRequestRowActionMenu'
import './SupportRequestAdmin.css'

const ROWS_PER_PAGE = 10

const SupportRequestCustomViewTable = ({
  title,
  supportRequests = [],
  visibleFields = [],
}) => {
  const columns = useMemo(
    () => buildSupportRequestCustomViewColumns(visibleFields),
    [visibleFields]
  )
  const [filters, setFilters] = useState(() => (
    columns.reduce((lookup, column) => ({ ...lookup, [column.key]: '' }), {})
  ))
  const [currentPage, setCurrentPage] = useState(1)

  const filteredRows = useMemo(() => (
    supportRequests.filter((supportRequest) => (
      columns.every((column) => {
        const filterValue = String(filters[column.key] || '').trim().toLowerCase()
        if (!filterValue) return true

        const comparisonValue = formatSupportRequestCustomViewFieldValue(column.key, supportRequest)
        return String(comparisonValue || '').toLowerCase().includes(filterValue)
      })
    ))
  ), [columns, filters, supportRequests])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / ROWS_PER_PAGE))
  const paginatedRows = filteredRows.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE)

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
    setCurrentPage(1)
  }

  return (
    <div className="support-request-legacy-page">
      <header className="support-request-legacy-header">
        <h1>{title} - {filteredRows.length} records</h1>
      </header>

      <div className="support-request-legacy-table-shell">
        <table className="support-request-legacy-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key}>
                  <div className="support-request-legacy-th-content">
                    <span>{column.label}</span>
                    <FaChevronDown size={10} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="support-request-legacy-filter-row">
              {columns.map((column) => (
                <td key={column.key}>
                  <input
                    type="text"
                    value={filters[column.key] || ''}
                    onChange={(event) => handleFilterChange(column.key, event.target.value)}
                    placeholder={column.filterPlaceholder || 'Search here ...'}
                  />
                </td>
              ))}
            </tr>

            {paginatedRows.length > 0 ? paginatedRows.map((supportRequest) => (
              <tr key={supportRequest.id}>
                {columns.map((column) => (
                  <td key={`${supportRequest.id}-${column.key}`}>
                    {column.key === 'srNumber'
                      ? <SupportRequestRowActionMenu supportRequest={supportRequest} compact />
                      : formatSupportRequestCustomViewFieldValue(column.key, supportRequest)}
                  </td>
                ))}
              </tr>
            )) : (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="support-request-legacy-empty">
                  No support requests found for this custom view.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="support-request-legacy-footer">
          <div className="support-request-legacy-footer-total">Total records: {filteredRows.length}</div>
          <div className="support-request-legacy-footer-pagination">
            <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={currentPage === 1}>prev</button>
            <span>{currentPage}</span>
            <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={currentPage === totalPages}>next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SupportRequestCustomViewTable
