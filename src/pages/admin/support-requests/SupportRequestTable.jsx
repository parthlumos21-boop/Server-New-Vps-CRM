import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FaChevronDown, FaFileExcel } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { exportExcelWorkbook } from '../../../utils/excelExport'
import {
  formatDateTime,
  formatShortDate,
  formatSupportRequestType,
} from './SupportRequestShared'
import SupportRequestRowActionMenu from './SupportRequestRowActionMenu'
import SupportRequestActionModal from './SupportRequestActionModal'
import SupportRequestDocumentsModal from './SupportRequestDocumentsModal'
import { useAuth } from '../../../context/AuthContext'

const buildSupportRequestActions = (basePath, supportRequestId) => [
  { key: 'view-sr', label: 'View SR', path: `${basePath}/view` },
  { key: 'add-note-remarks', label: 'Add Note/Remarks' },
  { key: 'add-reminder', label: 'Add Reminder' },
  { key: 'add-document', label: 'Add Document' },
]

const SR_ACTION_MENU_WIDTH = 180
const SR_ACTION_MENU_ITEM_HEIGHT = 35
const SR_ACTION_MENU_VIEWPORT_PADDING = 8

const SupportRequestSRNumberChip = ({
  supportRequest,
  basePath,
  triggerLabel,
  showDropdown = false,
  onAction
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const menuRef = React.useRef(null)
  const triggerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState(null)
  
  const supportRequestId = getSupportRequestId(supportRequest)
  const actions = buildSupportRequestActions(basePath, supportRequestId)
  const canUseActions = Boolean(user && supportRequestId && showDropdown)

  const updateMenuPosition = useCallback(() => {
    const triggerRect = triggerRef.current?.getBoundingClientRect()
    if (!triggerRect) {
      setMenuPosition(null)
      return
    }

    const menuHeight = actions.length * SR_ACTION_MENU_ITEM_HEIGHT + 2
    const availableBelow = window.innerHeight - triggerRect.bottom
    const top = availableBelow >= menuHeight + SR_ACTION_MENU_VIEWPORT_PADDING
      ? triggerRect.bottom + 4
      : Math.max(SR_ACTION_MENU_VIEWPORT_PADDING, triggerRect.top - menuHeight - 4)
    const maxLeft = Math.max(
      SR_ACTION_MENU_VIEWPORT_PADDING,
      window.innerWidth - SR_ACTION_MENU_WIDTH - SR_ACTION_MENU_VIEWPORT_PADDING
    )
    const left = Math.min(
      Math.max(SR_ACTION_MENU_VIEWPORT_PADDING, triggerRect.right - SR_ACTION_MENU_WIDTH),
      maxLeft
    )

    setMenuPosition({ top, left })
  }, [actions.length])

  useEffect(() => {
    if (!open) return undefined

    updateMenuPosition()

    const handleDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target) && !triggerRef.current?.contains(event.target)) {
        setOpen(false)
        setMenuPosition(null)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        setMenuPosition(null)
      }
    }
    const handleViewportChange = () => {
      updateMenuPosition()
    }

    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)

    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
    }
  }, [open, updateMenuPosition])

  const handleAction = (action) => {
    setOpen(false)
    setMenuPosition(null)
    if (action.path) {
      navigate(action.path)
    } else if (onAction) {
      onAction(action.key, supportRequest)
    }
  }

  return (
    <div ref={menuRef} className="support-request-sr-number-chip-container" style={{ position: 'relative', display: 'inline-flex' }}>
      <button
        ref={triggerRef}
        type="button"
        className="support-request-sr-number-chip"
        onClick={() => {
          if (canUseActions) {
            updateMenuPosition()
            setOpen(curr => !curr)
          }
        }}
        disabled={!canUseActions && showDropdown}
        aria-haspopup={showDropdown ? 'menu' : undefined}
        aria-expanded={showDropdown ? open : undefined}
      >
        <span>{triggerLabel}</span>
        {showDropdown && <FaChevronDown className="support-request-row-menu-caret" aria-hidden="true" />}
      </button>

      {open && canUseActions && menuPosition && typeof document !== 'undefined' ? createPortal((
        <div
          ref={menuRef}
          className="support-request-row-menu-dropdown support-request-row-menu-dropdown--floating"
          role="menu"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            width: SR_ACTION_MENU_WIDTH,
          }}
        >
          {actions.map((action) => (
            <button
              key={action.key}
              type="button"
              role="menuitem"
              onClick={() => handleAction(action)}
            >
              {action.label}
            </button>
          ))}
        </div>
      ), document.body) : null}
    </div>
  )
}

const ROWS_PER_PAGE = 10

const normalizeValue = (value) => String(value || '').trim().toLowerCase()

const normalizeRecordNumber = (value) => String(value || '').trim().toLowerCase()

const getSupportRequestId = (supportRequest = {}) => (
  supportRequest.id || supportRequest._id || supportRequest.legacyId || supportRequest.srId || ''
)

const getSupportRequestDisplayNumber = (supportRequest = {}) => {
  const explicitNumber = supportRequest.srNumber
    || supportRequest.srNo
    || supportRequest.sr_number
    || supportRequest.sr_no
    || supportRequest.supportRequestNumber

  if (String(explicitNumber || '').trim()) {
    return explicitNumber
  }

  const fallbackId = getSupportRequestId(supportRequest)
  return fallbackId ? `SR${String(fallbackId).padStart(6, '0')}` : '-'
}

const getSupportRequestValue = (supportRequest, key) => {
  switch (key) {
    case 'srNumber':
      return getSupportRequestDisplayNumber(supportRequest)
    case 'customerName':
      return supportRequest.customerName || '-'
    case 'customerNumber':
      return supportRequest.customerNumber || supportRequest.customerNo || supportRequest.customer?.customerNumber || supportRequest.customer?.customerNo || '-'
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
  const navigate = useNavigate()
  const { accounts = [] } = useData()
  const [filters, setFilters] = useState(() => (
    Object.fromEntries(columns.map((column) => [column.key, '']))
  ))
  const [sortConfig, setSortConfig] = useState({ key: 'srDate', direction: 'desc' })
  const [activeActionKey, setActiveActionKey] = useState(null)
  const [activeSupportRequest, setActiveSupportRequest] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false)

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

  const openRelatedNumber = (supportRequest) => {
    const relatedNumber = supportRequest.customerNumber || supportRequest.customerNo || supportRequest.accountNumber || supportRequest.accountNo || ''
    const normalizedRelatedNumber = normalizeRecordNumber(relatedNumber)
    const isAdminRoute = basePath.startsWith('/admin')

    const linkedAccount = accounts.find((account) => {
      const candidates = [
        account.accountNumber,
        account.accountNo,
        account.customerNumber,
        account.customerNo,
        account.id,
        account._id,
      ]

      return candidates.some((candidate) => normalizeRecordNumber(candidate) === normalizedRelatedNumber)
    })

    if (linkedAccount?.id || linkedAccount?._id) {
      const accountId = linkedAccount.id || linkedAccount._id
      const accountSearchPath = isAdminRoute ? '/admin/accounts/search' : '/accounts/search'
      navigate(`${accountSearchPath}?stage=new&page=1&accountId=${encodeURIComponent(accountId)}`)
      return
    }

    const customerId = supportRequest.customerId || supportRequest.customer_id || supportRequest.customer?.id || supportRequest.customer?._id || ''

    if (customerId) {
      const customerViewPath = isAdminRoute ? '/admin/customers/view' : '/customers/view'
      navigate(`${customerViewPath}/${encodeURIComponent(customerId)}?returnTo=${encodeURIComponent(`${basePath}/search`)}`)
    }
  }

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
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn-red-theme"
            onClick={() => setIsDocumentsModalOpen(true)}
            title="View Documents"
            style={{ height: '32px', padding: '0 12px', fontSize: '13px', borderRadius: '4px' }}
          >
            <span>Documents</span>
          </button>
          <button
            type="button"
            className="support-request-export-btn"
            onClick={handleExport}
            disabled={sortedRows.length === 0}
            title="Export"
          >
            <span>Export</span>
          </button>
        </div>
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
            {paginatedRows.length > 0 ? paginatedRows.map((row) => (
              <tr key={row.id || row._id || row.srNumber}>
                {columns.map((column) => {
                  const cellValue = getSupportRequestValue(row, column.key)

                  return (
                    <td key={`${row.id || row._id || row.srNumber}-${column.key}`}>
                      {column.key === 'srNumber' ? (
                        <SupportRequestSRNumberChip
                          supportRequest={row}
                          basePath={basePath}
                          triggerLabel={cellValue || '-'}
                          showDropdown={showActionMenu}
                          onAction={(key, sr) => {
                            setActiveActionKey(key)
                            setActiveSupportRequest(sr)
                          }}
                        />
                      ) : column.key === 'actions' && showActionMenu ? (
                        <SupportRequestRowActionMenu
                          supportRequest={row}
                          basePath={basePath}
                          compact
                          triggerLabel="Actions"
                        />
                      ) : column.key === 'customerNumber' ? (
                        <span className="support-request-customer-number-text">{cellValue}</span>
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
              className="btn-red-theme"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              prev
            </button>
            <span>{currentPage}</span>
            <button
              type="button"
              className="btn-red-theme"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
            >
              next
            </button>
          </div>
        </div>
      </div>
      {activeActionKey && activeSupportRequest ? (
        <SupportRequestActionModal
          supportRequest={activeSupportRequest}
          actionKey={activeActionKey}
          onClose={() => {
            setActiveActionKey(null)
            setActiveSupportRequest(null)
          }}
          onSaved={() => {
            setActiveActionKey(null)
            setActiveSupportRequest(null)
          }}
        />
      ) : null}

      {isDocumentsModalOpen && (
        <SupportRequestDocumentsModal onClose={() => setIsDocumentsModalOpen(false)} />
      )}
    </div>
  )
}

export default SupportRequestTable
export { getSupportRequestValue, normalizeValue }
