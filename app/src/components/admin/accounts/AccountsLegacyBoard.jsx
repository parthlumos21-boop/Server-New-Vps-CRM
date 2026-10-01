import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import { useClickOutside } from '../../../hooks'
import { ACCOUNT_ROW_ACTIONS } from '../../../features/adminAccounts/config/accountActions'
import { openAdminAccountActionPage } from '../../../features/adminAccounts/utils/accountNavigation'
import AccountsBoardFilters from './AccountsBoardFilters'

const renderCellValue = (column, row) => {
  const value = row[column.key]

  if (column.cellFormatter) {
    return column.cellFormatter(value, row)
  }

  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return value
}

const AccountsLegacyBoard = ({
  columns,
  rows,
  filters,
  onFilterChange,
  showFilters = true,
  onAccountOpen,
  selectedAccountId,
  emptyMessage,
  boardStateQuery,
  menuResetKey,
  rowActionsEnabled = false,
  rowActions = ACCOUNT_ROW_ACTIONS,
  mainButtonBehavior = 'open',
  selectable = false,
  selectedRowIds = [],
  onSelectionChange,
  serialOffset = 1,
  showSerialNumber = true,
  onConvertToDeal,
  onViewDeal,
}) => {
  const navigate = useNavigate()
  const [openMenuId, setOpenMenuId] = useState(null)
  const [menuStyle, setMenuStyle] = useState(null)
  const closeRowMenu = () => {
    setOpenMenuId(null)
    setMenuStyle(null)
  }
  const activeMenuRef = useClickOutside(closeRowMenu)
  const selectedIdSet = useMemo(
    () => new Set(selectedRowIds.map((id) => String(id))),
    [selectedRowIds]
  )
  const rowIds = rows.map((row) => String(row.id))
  const allVisibleSelected = rowIds.length > 0 && rowIds.every((id) => selectedIdSet.has(id))
  const partiallySelected = rowIds.some((id) => selectedIdSet.has(id)) && !allVisibleSelected

  useEffect(() => {
    closeRowMenu()
  }, [menuResetKey])

  useEffect(() => {
    if (!openMenuId) return undefined

    const dismiss = () => closeRowMenu()
    window.addEventListener('scroll', dismiss, true)
    window.addEventListener('resize', dismiss)
    return () => {
      window.removeEventListener('scroll', dismiss, true)
      window.removeEventListener('resize', dismiss)
    }
  }, [openMenuId])

  const handleMenuAction = (action, row) => {
    closeRowMenu()

    if (action.behavior === 'convertToDeal' || action.key === 'converted-deal') {
      onConvertToDeal?.(row)
      return
    }

    if (action.behavior === 'viewDeal' || action.key === 'view-linked-deal') {
      onViewDeal?.(row)
      return
    }

    if (action.behavior === 'drawer') {
      onAccountOpen(row)
      return
    }

    if (action.behavior === 'quotationGenerator' || action.key === 'generate-quotation') {
      navigate('/admin/quotations', {
        state: { openGenerator: true, preselectedAccountId: row.id }
      })
      return
    }

    openAdminAccountActionPage(action.route, row.id, boardStateQuery)
  }

  const toggleRowMenu = (rowId, event) => {
    if (openMenuId === rowId) {
      closeRowMenu()
      return
    }

    // Anchor the menu to the viewport so it is never clipped by the board's
    // overflow:hidden/auto ancestors (.admin-accounts-board-shell / -scroll).
    const rect = event.currentTarget.getBoundingClientRect()
    setMenuStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
      left: 'auto',
    })
    setOpenMenuId(rowId)
  }

  const handleSelectAllVisible = (event) => {
    const shouldSelect = event.target.checked
    const nextIds = shouldSelect
      ? Array.from(new Set([...selectedRowIds.map((id) => String(id)), ...rowIds]))
      : selectedRowIds.map((id) => String(id)).filter((id) => !rowIds.includes(id))

    onSelectionChange?.(nextIds)
  }

  const handleSelectRow = (rowId, shouldSelect) => {
    const normalizedId = String(rowId)
    const nextIds = shouldSelect
      ? Array.from(new Set([...selectedRowIds.map((id) => String(id)), normalizedId]))
      : selectedRowIds.map((id) => String(id)).filter((id) => id !== normalizedId)

    onSelectionChange?.(nextIds)
  }

  const getVisibleRowActions = (row) => rowActions.flatMap((action) => {
    if (action.key === 'converted-deal') {
      return row.isConverted || row.dealId ? [] : [{ ...action, behavior: 'convertToDeal', label: 'Convert to Deal' }]
    }

    if (action.key === 'view-linked-deal') {
      return row.isConverted || row.dealId ? [{ ...action, label: 'View Deal' }] : []
    }

    return [action]
  })

  return (
  <div className="admin-accounts-board-shell">
    <div className="admin-accounts-board-scroll">
      <table className="admin-accounts-board-table">
        <thead>
          <tr>
            {showSerialNumber ? (
              <th style={{ width: '52px', textAlign: 'center' }}>Sr. No.</th>
            ) : null}
            {selectable ? (
              <th className="admin-accounts-select-col">
                <input
                  type="checkbox"
                  className="admin-accounts-select-checkbox"
                  checked={allVisibleSelected}
                  ref={(element) => {
                    if (element) element.indeterminate = partiallySelected
                  }}
                  onChange={handleSelectAllVisible}
                  aria-label="Select all visible accounts"
                />
              </th>
            ) : null}
            {columns.map((column) => (
              <th key={column.key} style={{ width: column.width }}>
                {column.label}
              </th>
            ))}
          </tr>
          {showFilters ? (
            <>
              {selectable ? (
                <tr className="admin-accounts-filter-row admin-accounts-filter-row-select">
                  {showSerialNumber ? (
                    <th style={{ width: '52px' }}><span className="admin-accounts-filter-placeholder">-</span></th>
                  ) : null}
                  <th className="admin-accounts-select-col">
                    <span className="admin-accounts-filter-placeholder">Select</span>
                  </th>
                  {columns.map((column) => (
                    <th key={column.key} className="admin-accounts-filter-cell">
                      {column.searchable ? (
                        <input
                          type="text"
                          className="admin-accounts-filter-input"
                          value={filters[column.key] || ''}
                          onChange={(event) => onFilterChange(column.key, event.target.value)}
                          placeholder={column.filterPlaceholder || `Search ${column.label}`}
                        />
                      ) : (
                        <span className="admin-accounts-filter-placeholder">-</span>
                      )}
                    </th>
                  ))}
                </tr>
              ) : (
                <AccountsBoardFilters
                  columns={columns}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  showSerialNumber={showSerialNumber}
                />
              )}
            </>
          ) : null}
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0) + (showSerialNumber ? 1 : 0)} className="admin-accounts-empty-cell">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr
                key={row.id}
                className={`admin-accounts-board-row ${selectedAccountId === row.id ? 'admin-accounts-board-row-selected' : ''}`}
              >
                {showSerialNumber ? (
                  <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                    {serialOffset + rowIndex}
                  </td>
                ) : null}
                {selectable ? (
                  <td className="admin-accounts-select-cell">
                    <input
                      type="checkbox"
                      className="admin-accounts-select-checkbox"
                      checked={selectedIdSet.has(String(row.id))}
                      onChange={(event) => handleSelectRow(row.id, event.target.checked)}
                      onClick={(event) => event.stopPropagation()}
                      aria-label={`Select account ${row.accountNumber || row.accountName || row.id}`}
                    />
                  </td>
                ) : null}
                {columns.map((column) => {
                  const cellValue = renderCellValue(column, row)
                  const cellContent = cellValue

                  return (
                    <td key={column.key}>
                      {column.clickable ? (
                        rowActionsEnabled ? (
                          <div
                            className={`admin-accounts-cell-action-wrap ${openMenuId === row.id ? 'admin-accounts-cell-action-wrap-open' : ''}`}
                            ref={openMenuId === row.id ? activeMenuRef : null}
                          >
                            <button
                              type="button"
                              className="admin-accounts-cell-link"
                              onClick={() => {
                                setOpenMenuId(null)
                                onAccountOpen(row)
                              }}
                            >
                              {cellContent}
                            </button>
                            <button
                              type="button"
                              className="admin-accounts-cell-menu-trigger"
                              onClick={(event) => toggleRowMenu(row.id, event)}
                              aria-label={`Open actions for ${row.accountNumber}`}
                            >
                              <FiChevronDown />
                            </button>

                            {openMenuId === row.id ? (
                              <div className="admin-accounts-row-menu" style={menuStyle}>
                                {getVisibleRowActions(row).map((action) => (
                                  <button
                                    key={action.key}
                                    type="button"
                                    className="admin-accounts-row-menu-item"
                                    onClick={() => handleMenuAction(action, row)}
                                  >
                                    {action.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="admin-accounts-cell-link admin-accounts-cell-link-standalone"
                            onClick={() => {
                              setOpenMenuId(null)
                              onAccountOpen(row)
                            }}
                          >
                            {cellContent}
                          </button>
                        )
                      ) : (
                        cellContent
                      )}
                    </td>
                  )
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </div>
)
}

export default AccountsLegacyBoard
