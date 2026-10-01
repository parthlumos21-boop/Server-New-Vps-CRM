import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  FiCheck,
  FiChevronDown,
  FiEdit3,
  FiFilter,
  FiGrid,
  FiLayers,
  FiList,
  FiRefreshCw,
  FiSettings,
  FiUserCheck,
} from 'react-icons/fi'
import { useClickOutside } from '../../../hooks'
import { exportAccountsBoardWorkbook } from '../../../features/adminAccounts/utils/exportAccountsBoard'
import { ExcelExportMenuButton } from '../../common/ExcelExportButton'
import './AccountBoardHeaderActions.css'

const AccountBoardHeaderActions = ({
  view,
  currentStageRows,
  allRows,
  activeStageLabel,
  visibleColumns,
  allColumns,
  onApplyVisibleColumns,
  showFilters,
  onToggleFilters,
  onRefresh,
  filterButtonTitle,
  refreshButtonTitle = 'Refresh',
  sourceStageOptions = [],
  visibleSourceStageKeys = [],
  onApplyVisibleSourceStages,
  selectedRows = [],
  onBulkAddRemark,
  onBulkReAssign,
  onBulkValidationError,
}) => {
  const actions = view.titlebarActions || {}
  const exportHandler = exportAccountsBoardWorkbook
  const [openMenu, setOpenMenu] = useState(null)
  const [pendingColumnKeys, setPendingColumnKeys] = useState(() => visibleColumns.map((column) => column.key))
  const [pendingSourceKeys, setPendingSourceKeys] = useState(() => visibleSourceStageKeys)
  const [bulkMenuPosition, setBulkMenuPosition] = useState(null)
  const bulkTriggerRef = useRef(null)
  const closeMenu = useCallback(() => {
    setOpenMenu(null)
    setBulkMenuPosition(null)
  }, [])
  const menuRef = useClickOutside(closeMenu)

  useEffect(() => {
    setPendingColumnKeys(visibleColumns.map((column) => column.key))
  }, [visibleColumns])

  useEffect(() => {
    setPendingSourceKeys(visibleSourceStageKeys)
  }, [visibleSourceStageKeys])

  const hasCurrentRows = currentStageRows.length > 0
  const selectedCount = selectedRows.length
  const activeMenuRef = openMenu ? menuRef : null
  const moreMenuOptions = useMemo(() => ([
    {
      key: 'toggle-filters',
      label: showFilters ? 'Hide Filters' : 'Show Filters',
      onClick: () => {
        onToggleFilters()
        closeMenu()
      },
    },
    {
      key: 'show-all-columns',
      label: 'Show All Columns',
      onClick: () => {
        onApplyVisibleColumns(allColumns.map((column) => column.key))
        closeMenu()
      },
    },
  ]), [allColumns, closeMenu, onApplyVisibleColumns, onToggleFilters, showFilters])

  const handleExport = (scopeKey, scopeLabel, stageLabel, rows) => {
    if (!rows.length) return

    exportHandler({
      rows,
      scopeKey,
      scopeLabel,
      boardTitle: view.heroTitle,
      stageLabel,
      filePrefix: view.exportFilePrefix,
    })
    closeMenu()
  }

  const togglePendingKey = (currentKeys, key) => (
    currentKeys.includes(key)
      ? currentKeys.filter((entry) => entry !== key)
      : [...currentKeys, key]
  )

  const handleBulkClick = () => {
    setOpenMenu((currentValue) => {
      if (currentValue === 'bulk') {
        setBulkMenuPosition(null)
        return null
      }

      const triggerElement = bulkTriggerRef.current
      if (triggerElement) {
        const rect = triggerElement.getBoundingClientRect()
        const viewportPadding = 12
        const menuWidth = 320
        const menuHeight = 150
        const left = Math.min(
          Math.max(viewportPadding, rect.right - menuWidth),
          window.innerWidth - menuWidth - viewportPadding
        )
        const spaceBelow = window.innerHeight - rect.bottom
        const top = spaceBelow >= menuHeight + viewportPadding
          ? rect.bottom + 4
          : Math.max(viewportPadding, rect.top - menuHeight - 4)
        setBulkMenuPosition({ top, left, width: menuWidth })
      }

      return 'bulk'
    })
  }

  const bulkDisabled = selectedCount === 0

  const handleBulkItemClick = (action) => {
    if (bulkDisabled) return
    closeMenu()
    action?.()
  }

  return (
    <div className="account-board-header-actions" ref={activeMenuRef}>
      {actions.showBulk ? (
        <div className="account-board-header-menu-wrap">
          <button
            ref={bulkTriggerRef}
            type="button"
            className="account-board-header-btn account-board-header-btn-bulk"
            onClick={handleBulkClick}
            aria-haspopup="menu"
            aria-expanded={openMenu === 'bulk'}
          >
            <span className="account-board-header-btn-label">
              <FiLayers />
              <span>Bulk Actions{selectedCount > 0 ? ` (${selectedCount})` : ''}</span>
            </span>
            <FiChevronDown className={`account-board-header-btn-caret${openMenu === 'bulk' ? ' account-board-header-btn-caret-open' : ''}`} />
          </button>

          {openMenu === 'bulk' && bulkMenuPosition ? createPortal(
            (
              <div
                className="account-board-header-menu account-board-header-menu-wide account-board-header-bulk-menu account-board-header-bulk-menu-portal"
                onMouseDown={(event) => event.stopPropagation()}
                onTouchStart={(event) => event.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: `${bulkMenuPosition.top}px`,
                  left: `${bulkMenuPosition.left}px`,
                  right: 'auto',
                  width: `${bulkMenuPosition.width}px`,
                  zIndex: 2147483600,
                }}
              >
                <button
                  type="button"
                  className="account-board-header-menu-item account-board-header-bulk-item"
                  onClick={() => handleBulkItemClick(onBulkAddRemark)}
                  disabled={bulkDisabled}
                >
                  <FiEdit3 className="account-board-header-bulk-item-icon" />
                  <span className="account-board-header-bulk-item-label">Add Remark</span>
                </button>
                <button
                  type="button"
                  className="account-board-header-menu-item account-board-header-bulk-item"
                  onClick={() => handleBulkItemClick(onBulkReAssign)}
                  disabled={bulkDisabled}
                >
                  <FiUserCheck className="account-board-header-bulk-item-icon" />
                  <span className="account-board-header-bulk-item-label">Re-Assign</span>
                </button>
              </div>
            ),
            document.body
          ) : null}
        </div>
      ) : null}

      {actions.showExportIcon ? (
        <ExcelExportMenuButton
          label="Export"
          title="Export accounts"
          disabled={!hasCurrentRows}
          compact
          responsiveHideLabel
          className="account-board-header-export-dropdown"
          buttonClassName="account-board-header-icon-btn account-board-header-icon-btn-export account-board-header-export-trigger"
          menuClassName="admin-accounts-export-menu"
          items={[
            {
              key: 'current-view-excel',
              label: 'Current View',
              badge: 'XLSX',
              onClick: () => handleExport('current-view', 'Current View', activeStageLabel, currentStageRows),
            },
            {
              key: 'all-visible-excel',
              label: 'All Visible Rows',
              badge: 'XLSX',
              disabled: !allRows.length,
              onClick: () => handleExport('all-visible', 'All Visible Rows', 'All Visible Rows', allRows),
            },
          ]}
        />
      ) : null}

      {actions.showColumnsIcon ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-blue"
            title="List/View"
            aria-label="List/View"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'columns' ? null : 'columns')}
          >
            <FiList />
          </button>

          {openMenu === 'columns' ? (
            <div className="account-board-header-menu">
              {allColumns.map((column) => {
                const isChecked = pendingColumnKeys.includes(column.key)

                return (
                  <button
                    key={column.key}
                    type="button"
                    className={`account-board-header-check-item${isChecked ? ' account-board-header-check-item-active' : ''}`}
                    onClick={() => setPendingColumnKeys((currentValue) => togglePendingKey(currentValue, column.key))}
                  >
                    <span className={`account-board-header-check-box ${isChecked ? 'account-board-header-check-box-active' : ''}`}>
                      {isChecked ? <FiCheck /> : null}
                    </span>
                    <span>{column.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                className="account-board-header-load-btn"
                onClick={() => {
                  onApplyVisibleColumns(pendingColumnKeys.length > 0 ? pendingColumnKeys : allColumns.map((column) => column.key))
                  closeMenu()
                }}
              >
                Load <FiChevronDown className="account-board-header-load-icon" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions.showFilterIcon ? (
        <button
          type="button"
          className="account-board-header-icon-btn account-board-header-icon-btn-filter"
          title={filterButtonTitle || (showFilters ? 'Hide Filters' : 'Show Filters')}
          aria-label={filterButtonTitle || (showFilters ? 'Hide Filters' : 'Show Filters')}
          onClick={onToggleFilters}
        >
          <FiFilter />
        </button>
      ) : null}

      {actions.showRefreshIcon ? (
        <button
          type="button"
          className="account-board-header-icon-btn account-board-header-icon-btn-refresh"
          title={refreshButtonTitle}
          aria-label={refreshButtonTitle}
          onClick={onRefresh}
        >
          <FiRefreshCw />
        </button>
      ) : null}

      {actions.showLoadMenu ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-cyan account-board-header-icon-btn-with-caret"
            title="Column/Grid"
            aria-label="Column/Grid"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'load' ? null : 'load')}
          >
            <span className="account-board-header-icon-btn-shell">
              <FiGrid />
              <FiChevronDown className={`account-board-header-inline-caret${openMenu === 'load' ? ' account-board-header-inline-caret-open' : ''}`} />
            </span>
          </button>

          {openMenu === 'load' ? (
            <div className="account-board-header-menu account-board-header-menu-source">
              {sourceStageOptions.map((stage) => {
                const isChecked = pendingSourceKeys.includes(stage.key)

                return (
                  <button
                    key={stage.key}
                    type="button"
                    className={`account-board-header-check-item${isChecked ? ' account-board-header-check-item-active' : ''}`}
                    onClick={() => setPendingSourceKeys((currentValue) => togglePendingKey(currentValue, stage.key))}
                  >
                    <span className={`account-board-header-check-box ${isChecked ? 'account-board-header-check-box-active' : ''}`}>
                      {isChecked ? <FiCheck /> : null}
                    </span>
                    <span>{stage.label}</span>
                  </button>
                )
              })}

              <button
                type="button"
                className="account-board-header-load-btn"
                onClick={() => {
                  onApplyVisibleSourceStages?.(pendingSourceKeys.length > 0 ? pendingSourceKeys : sourceStageOptions.map((stage) => stage.key))
                  closeMenu()
                }}
              >
                Load <FiChevronDown className="account-board-header-load-icon" />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {actions.showMoreMenu ? (
        <div className="account-board-header-menu-wrap">
          <button
            type="button"
            className="account-board-header-icon-btn account-board-header-icon-btn-blue"
            title="More"
            onClick={() => setOpenMenu((currentValue) => currentValue === 'more' ? null : 'more')}
          >
            <FiChevronDown />
          </button>

          {openMenu === 'more' ? (
            <div className="account-board-header-menu">
              {moreMenuOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  className="account-board-header-menu-item"
                  onClick={option.onClick}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default AccountBoardHeaderActions
