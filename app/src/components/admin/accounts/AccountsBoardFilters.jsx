import React from 'react'

const AccountsBoardFilters = ({ columns, filters, onFilterChange, showSerialNumber = true }) => (
  <tr className="admin-accounts-filter-row">
    {showSerialNumber ? (
      <th style={{ width: '52px' }}><span className="admin-accounts-filter-placeholder">-</span></th>
    ) : null}
    {columns.map((column) => (
      <th key={column.key} className="admin-accounts-filter-cell">
        {column.searchable ? (
          <input
            type="text"
            value={filters[column.key] || ''}
            onChange={(event) => onFilterChange(column.key, event.target.value)}
            placeholder={column.filterPlaceholder || `Search ${column.label}`}
            className="admin-accounts-filter-input"
          />
        ) : (
          <span className="admin-accounts-filter-placeholder">-</span>
        )}
      </th>
    ))}
  </tr>
)

export default AccountsBoardFilters
