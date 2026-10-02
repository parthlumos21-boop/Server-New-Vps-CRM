import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FiChevronDown } from 'react-icons/fi'
import {
  FaCalendarAlt,
  FaCog,
  FaFileAlt,
  FaHashtag,
  FaLayerGroup,
  FaRegBuilding,
  FaRegUser,
  FaUserAlt,
} from 'react-icons/fa'
import { useClickOutside } from '../../../hooks'
import { useData } from '../../../context/DataContext'
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

const getColumnIcon = (key = '') => {
  switch (key) {
    case 'accountNumber':
    case 'accountNo':
      return <FaRegBuilding />
    case 'name':
    case 'accountName':
      return <FaRegUser />
    case 'accountDate':
    case 'createdAt':
    case 'updatedAtDisplay':
      return <FaCalendarAlt />
    case 'projectName':
      return <FaFileAlt />
    case 'accountOwner':
    case 'accountOwnerName':
    case 'owner':
      return <FaUserAlt />
    case 'accountCategory':
    case 'productCategory':
      return <FaLayerGroup />
    case 'actions':
      return <FaCog />
    default:
      return <FaHashtag />
  }
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
  onDeleteAccount,
  ownerOptions = [],
}) => {
  const navigate = useNavigate()
  const { addNotification } = useData()
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

    const isNotQuotedAccount = row.stage === 'not_quoted' || row.status === 'Not Quoted' || row.stage === 'Not Quoted' || row.status === 'not_quoted' || row.accountStatus === 'not_quoted'
    if (isNotQuotedAccount && (action.key === 'generate-quotation' || action.behavior === 'quotationGenerator' || action.key === 'converted-deal' || action.behavior === 'convertToDeal' || action.key === 'convert_to_po')) {
      addNotification?.('warning', 'Action Unavailable', 'This account is marked as Not Quoted. PO Conversion and Quotation Generation are disabled.')
      return
    }

    if (action.behavior === 'deleteAccount' || action.key === 'delete-account') {
      onDeleteAccount?.(row)
      return
    }

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
      const isAdminPortal = window.location.pathname.startsWith('/admin')
      navigate(isAdminPortal ? '/admin/quotations' : '/quotations', {
        state: { openGenerator: true, preselectedAccountId: row.id, preselectedCustomer: row }
      })
      return
    }

    if (action.behavior === 'viewQuotations' || action.key === 'view-quotations') {
      const isAdminPortal = window.location.pathname.startsWith('/admin')
      const targetPath = isAdminPortal ? '/admin/quotation-manager/view' : '/quotation-manager/view'
      const accNo = encodeURIComponent(row.accountNumber || row.accountNo || '')
      const accName = encodeURIComponent(row.name || row.customerName || '')
      navigate(`${targetPath}?tab=accounts&accountNo=${accNo}&accountName=${accName}&accountId=${encodeURIComponent(row.id || '')}`)
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
    const row = rows.find((entry) => entry.id === rowId)
    const actionCount = row ? getVisibleRowActions(row).length : rowActions.length
    const estimatedMenuHeight = Math.max(48, Math.min(360, (actionCount * 46) + 12))
    const spaceBelow = window.innerHeight - rect.bottom
    const openUpward = spaceBelow < estimatedMenuHeight + 12 && rect.top > estimatedMenuHeight

    setMenuStyle({
      position: 'fixed',
      top: openUpward ? Math.max(8, rect.top - estimatedMenuHeight - 4) : rect.bottom + 4,
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
      return row.isConverted || row.dealId ? [] : [{ ...action, behavior: 'convertToDeal', label: 'Convert to PO' }]
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
              <th style={{ width: '52px', textAlign: 'center' }}>
                <span className="admin-accounts-th-content admin-accounts-th-content-center">
                  <FaHashtag />
                </span>
              </th>
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
                <span className="admin-accounts-th-content">
                  {getColumnIcon(column.key)}
                  <span>{column.label}</span>
                </span>
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
                  {columns.map((column) => {
                    const isOwnerCol = column.key === 'accountOwner' || column.key === 'owner' || column.key === 'accountOwnerName'
                    const hasOptions = Array.isArray(ownerOptions) && ownerOptions.length > 0

                    if (isOwnerCol && hasOptions) {
                      return (
                        <th key={column.key} className="admin-accounts-filter-cell">
                          <select
                            value={filters[column.key] || ''}
                            onChange={(event) => onFilterChange(column.key, event.target.value)}
                            className="admin-accounts-filter-input crm-column-filter-input"
                            style={{ padding: '2px 4px', fontSize: '0.82rem', height: '28px', cursor: 'pointer' }}
                          >
                            <option value="">All Owners</option>
                            {ownerOptions.map((opt) => {
                              const val = typeof opt === 'string' ? opt : (opt.value || opt.label)
                              const lbl = typeof opt === 'string' ? opt : (opt.label || opt.value)
                              return <option key={val} value={val}>{lbl}</option>
                            })}
                          </select>
                        </th>
                      )
                    }

                    return (
                      <th key={column.key} className="admin-accounts-filter-cell">
                        {column.searchable ? (
                          <input
                            type="text"
                            className="admin-accounts-filter-input crm-column-filter-input"
                            value={filters[column.key] || ''}
                            onChange={(event) => onFilterChange(column.key, event.target.value)}
                            placeholder={column.filterPlaceholder || `Search ${column.label}`}
                            style={{ color: '#000000', WebkitTextFillColor: '#000000', textShadow: '0 0 0 #000000', caretColor: '#000000', fontWeight: 400 }}
                          />
                        ) : (
                          <span className="admin-accounts-filter-placeholder">-</span>
                        )}
                      </th>
                    )
                  })}
                </tr>
              ) : (
                <AccountsBoardFilters
                  columns={columns}
                  filters={filters}
                  onFilterChange={onFilterChange}
                  showSerialNumber={showSerialNumber}
                  ownerOptions={ownerOptions}
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
