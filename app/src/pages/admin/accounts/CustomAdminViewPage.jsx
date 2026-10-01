import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import AccountsLegacyBoard from '../../../components/admin/accounts/AccountsLegacyBoard'
import AccountsBoardPagination from '../../../components/admin/accounts/AccountsBoardPagination'
import AccountDetailsDrawer from './AccountDetailsDrawer'
import CustomViewGrid from '../../../components/admin/accounts/CustomViewGrid'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import {
  buildCustomViewColumns,
  getCustomViewClassificationLabel,
  getCustomViewGroupByLabel,
} from '../../../features/adminAccounts/customViews/customViewConfig'
import {
  buildAdminCustomViewUrl,
  getAdminCustomViewById,
  subscribeAdminCustomViews,
} from '../../../features/adminAccounts/customViews/customViewStorage'
import { buildCustomViewGroups, getCustomViewRecords } from '../../../features/adminAccounts/selectors/getCustomViewRecords'
import { getAccountById } from '../../../features/adminAccounts/selectors/getAccountById'
import './CustomAdminViews.css'
import './MyGroupAccounts.css'

const ROWS_PER_PAGE = 8

const buildInitialFilters = (columns) =>
  columns.reduce((filters, column) => {
    filters[column.key] = ''
    return filters
  }, {})

const formatColumnValue = (column, row) => {
  const value = row[column.key]

  if (column.cellFormatter) {
    return column.cellFormatter(value, row)
  }

  if (value === null || value === undefined || value === '') {
    return '-'
  }

  return value
}

const matchesColumnFilters = (row, filters, columns) =>
  columns.every((column) => {
    if (!column.searchable) return true

    const filterValue = (filters[column.key] || '').trim().toLowerCase()
    if (!filterValue) return true

    return String(formatColumnValue(column, row)).toLowerCase().includes(filterValue)
  })

const CustomAdminViewPage = () => {
  const navigate = useNavigate()
  const { viewId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { accounts } = useData()
  const { isOnline, user } = useAuth()
  const [customView, setCustomView] = useState(() => getAdminCustomViewById(viewId))

  useEffect(() => {
    setCustomView(getAdminCustomViewById(viewId))
    return subscribeAdminCustomViews((views) => {
      setCustomView(views.find((view) => view.id === String(viewId || '')) || null)
    })
  }, [viewId])

  const columns = useMemo(
    () => customView ? buildCustomViewColumns(customView.visibleColumns) : [],
    [customView]
  )
  const [filters, setFilters] = useState(() => buildInitialFilters(columns))

  useEffect(() => {
    setFilters(buildInitialFilters(columns))
  }, [columns])

  const records = useMemo(
    () => customView ? getCustomViewRecords(accounts, user, customView) : [],
    [accounts, customView, user]
  )
  const groupedRecords = useMemo(
    () => customView ? buildCustomViewGroups(records, customView.groupByField) : [],
    [customView, records]
  )

  const selectedAccountId = searchParams.get('accountId')
  const requestedGroupKey = searchParams.get('group') || ''
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10)

  const selectedGroup = useMemo(() => {
    if (customView?.viewType !== 'tabular') {
      return null
    }

    return groupedRecords.find((group) => group.key === requestedGroupKey) || groupedRecords[0] || null
  }, [customView?.viewType, groupedRecords, requestedGroupKey])

  const tabularFilteredRecords = useMemo(() => {
    if (customView?.viewType !== 'tabular' || !selectedGroup) {
      return []
    }

    return selectedGroup.records.filter((record) => matchesColumnFilters(record, filters, columns))
  }, [columns, customView?.viewType, filters, selectedGroup])

  const totalPages = customView?.viewType === 'tabular'
    ? Math.max(1, Math.ceil(tabularFilteredRecords.length / ROWS_PER_PAGE))
    : 1
  const currentPage = customView?.viewType === 'tabular' && Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, totalPages)
    : 1
  const pageStart = customView?.viewType === 'tabular' && tabularFilteredRecords.length > 0
    ? ((currentPage - 1) * ROWS_PER_PAGE) + 1
    : 0
  const pageEnd = customView?.viewType === 'tabular'
    ? Math.min(tabularFilteredRecords.length, currentPage * ROWS_PER_PAGE)
    : 0
  const paginatedRecords = customView?.viewType === 'tabular'
    ? tabularFilteredRecords.slice(pageStart > 0 ? pageStart - 1 : 0, pageEnd)
    : []
  const selectedAccount = useMemo(
    () => getAccountById(records, selectedAccountId),
    [records, selectedAccountId]
  )

  const updateUrlState = (updates, replace = false) => {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key)
        return
      }

      nextParams.set(key, String(value))
    })

    setSearchParams(nextParams, { replace })
  }

  useEffect(() => {
    if (customView?.viewType !== 'tabular') {
      return
    }

    const nextGroupKey = selectedGroup?.key || ''
    if (requestedGroupKey !== nextGroupKey) {
      updateUrlState({ group: nextGroupKey || null }, true)
    }
  }, [customView?.viewType, requestedGroupKey, selectedGroup])

  useEffect(() => {
    if (customView?.viewType !== 'tabular') {
      return
    }

    if (String(currentPage) !== String(searchParams.get('page') || '1')) {
      updateUrlState({ page: currentPage }, true)
    }
  }, [currentPage, customView?.viewType, searchParams])

  useEffect(() => {
    if (selectedAccountId && !selectedAccount) {
      updateUrlState({ accountId: null }, true)
    }
  }, [selectedAccount, selectedAccountId])

  const handleFilterChange = (key, value) => {
    setFilters((currentFilters) => ({
      ...currentFilters,
      [key]: value,
    }))
    updateUrlState({ page: 1 }, true)
  }

  const handlePageChange = (page) => {
    updateUrlState({ page })
  }

  const boardStateQuery = `?customViewId=${encodeURIComponent(customView.id)}${customView.viewType === 'tabular' && selectedGroup?.key ? `&group=${encodeURIComponent(selectedGroup.key)}` : ''}${customView.viewType === 'tabular' ? `&page=${encodeURIComponent(currentPage)}` : ''}`

  const handleOpenAccount = (record) => {
    updateUrlState({ accountId: record.id })
  }

  if (!customView) {
    return (
      <div className="custom-admin-view-page">
        <section className="custom-admin-wizard-not-found">
          <h1>Custom View Not Found</h1>
          <p>The requested custom view could not be found. It may have been removed or not created yet.</p>
          <div className="custom-admin-view-not-found-actions">
            <Button onClick={() => navigate('/admin/accounts/custom-views/new')}>Create Custom View</Button>
            <Button variant="outline" onClick={() => navigate('/admin/accounts')}>Back To Accounts</Button>
          </div>
        </section>
      </div>
    )
  }
  return (
    <div className="custom-admin-view-page">
      <section className="admin-accounts-hero">
        <div>
          <p className="admin-accounts-hero-eyebrow">Admin Custom View</p>
          <h1>{customView.name}</h1>
          <p className="admin-accounts-hero-copy">
            {getCustomViewClassificationLabel(customView.classification)} grouped by {getCustomViewGroupByLabel(customView.groupByField)}. {records.length} live records matching this saved custom view.
          </p>
        </div>

        <div className="admin-accounts-hero-status">
          <span className={`admin-accounts-live-indicator ${isOnline ? 'admin-accounts-live-indicator-online' : 'admin-accounts-live-indicator-offline'}`}>
            {isOnline ? 'Live Updates Active' : 'Offline Mode'}
          </span>
        </div>
      </section>

      <section className="custom-admin-view-card-shell">
        <div className="admin-accounts-board-toolbar">
          <div className="custom-admin-view-content-header">
            <h2>{customView.viewType === 'grid' ? 'Grid View' : 'Tabular View'}</h2>
            <p className="admin-accounts-board-subtitle">
              Saved on {new Date(customView.createdAt).toLocaleDateString('en-IN')} with {columns.length} visible fields.
            </p>
          </div>

          <div className="admin-accounts-board-toolbar-actions">
            <Button variant="outline" onClick={() => navigate('/admin/accounts/custom-views/new')}>
              New Custom View
            </Button>
          </div>
        </div>

        {customView.viewType === 'tabular' ? (
          <>
            <div className="custom-admin-view-tab-strip">
              {groupedRecords.map((group) => (
                <button
                  key={group.key}
                  type="button"
                  className={`custom-admin-view-tab-button ${selectedGroup?.key === group.key ? 'custom-admin-view-tab-button-active' : ''}`}
                  onClick={() => updateUrlState({ group: group.key, page: 1 }, false)}
                >
                  <span>{group.label}</span>
                </button>
              ))}
            </div>

            <AccountsLegacyBoard
              columns={columns}
              rows={paginatedRecords}
              filters={filters}
              onFilterChange={handleFilterChange}
              onAccountOpen={handleOpenAccount}
              selectedAccountId={selectedAccountId}
              emptyMessage="No accounts match this custom view."
              boardStateQuery={boardStateQuery}
              menuResetKey={`${customView.id}-${selectedGroup?.key || 'no-group'}-${currentPage}-${JSON.stringify(filters)}`}
              rowActionsEnabled={false}
            />

            <AccountsBoardPagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageStart={pageStart}
              pageEnd={pageEnd}
              totalItems={tabularFilteredRecords.length}
              onPageChange={handlePageChange}
            />
          </>
        ) : (
          <CustomViewGrid
            groups={groupedRecords}
            columns={columns}
            onAccountOpen={handleOpenAccount}
            emptyMessage="No accounts match this custom view."
          />
        )}
      </section>

      <AccountDetailsDrawer
        account={selectedAccount}
        isOpen={Boolean(selectedAccountId && selectedAccount)}
        onClose={() => updateUrlState({ accountId: null })}
        boardStateQuery={boardStateQuery}
      />
    </div>
  )
}

export default CustomAdminViewPage
