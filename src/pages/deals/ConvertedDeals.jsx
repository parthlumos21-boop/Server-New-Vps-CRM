import React, { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useData } from '../../context/DataContext'
import { buildAdminAccountsBoardUrl } from '../../features/adminAccounts/config/accountBoardViews'
import { buildAdminDealDetailUrl } from '../../features/adminDeals/config/adminDealViews'
import { isClosedDealStatus } from '../../features/adminDeals/config/dealUtils'
import { getCrmOwnerDisplay } from '../../features/users/crmUserDirectory'
import { capitalize, formatCurrency, formatDate } from '../../utils/helpers'
import './ConvertedDeals.css'

const PAGE_SIZE = 10

const normalizeText = (value) => String(value || '').trim().toLowerCase()

const parsePageNumber = (value) => {
  const parsedValue = Number.parseInt(String(value || '1'), 10)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1
}

const buildDealLookup = (record = {}) => ({
  dealNumber: record.dealNumber || record.title || record.name || '',
  projectName: record.projectName || '',
  companyName: record.accountName || record.customerName || '',
})

const ConvertedDeals = ({ isAdmin = false }) => {
  const { convertedDeals, loading, refreshConvertedDeals } = useData()
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const search = searchParams.get('search') || ''
  const statusFilter = searchParams.get('status') || 'all'
  const ownerFilter = searchParams.get('owner') || ''
  const dateFilter = searchParams.get('date') || ''
  const convertedDateFilter = searchParams.get('convertedDate') || ''
  const currentPage = parsePageNumber(searchParams.get('page'))

  const updateSearchParams = (updates = {}) => {
    const nextParams = new URLSearchParams(searchParams)

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') {
        nextParams.delete(key)
        return
      }

      nextParams.set(key, String(value))
    })

    setSearchParams(nextParams, { replace: true })
  }

  React.useEffect(() => {
    const nextSearch = String(location.state?.convertedDealSearch || '').trim()
    if (!nextSearch) return

    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('search', nextSearch)
    nextParams.set('page', '1')

    navigate(
      {
        pathname: location.pathname,
        search: `?${nextParams.toString()}`,
      },
      { replace: true, state: {} }
    )
  }, [location.pathname, location.state, navigate, searchParams])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      refreshConvertedDeals({
        search,
        status: statusFilter === 'all' ? '' : statusFilter,
        owner: ownerFilter,
        date: dateFilter,
        convertedDate: convertedDateFilter,
      }).catch(() => {})
    }, 250)

    return () => window.clearTimeout(timer)
  }, [convertedDateFilter, dateFilter, ownerFilter, refreshConvertedDeals, search, statusFilter])

  const filteredRows = useMemo(() => {
    const term = normalizeText(search)
    const records = Array.isArray(convertedDeals) ? [...convertedDeals] : []

    return records
      .filter((record) => {
        if (statusFilter === 'open') {
          return !isClosedDealStatus(record.status, record.stage)
        }

        if (statusFilter === 'closed') {
          return isClosedDealStatus(record.status, record.stage)
        }

        if (statusFilter !== 'all') {
          return normalizeText(record.status || record.stage) === normalizeText(statusFilter)
        }

        return true
      })
      .filter((record) => !ownerFilter || normalizeText(record.ownerName || record.ownerDisplay).includes(normalizeText(ownerFilter)))
      .filter((record) => !dateFilter || String(record.createdAt || '').slice(0, 10) === dateFilter)
      .filter((record) => !convertedDateFilter || String(record.convertedAt || '').slice(0, 10) === convertedDateFilter)
      .filter((record) => (
        !term
          || [record.title, record.dealNumber, record.accountName, record.customerName, record.ownerName]
            .some((field) => normalizeText(field).includes(term))
      ))
      .sort((left, right) => (
        new Date(right.convertedAt || right.createdAt || 0).getTime()
        - new Date(left.convertedAt || left.createdAt || 0).getTime()
      ))
  }, [convertedDateFilter, convertedDeals, dateFilter, ownerFilter, search, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const currentPageSafe = Math.min(currentPage, totalPages)
  const rows = useMemo(() => {
    const startIndex = (currentPageSafe - 1) * PAGE_SIZE
    return filteredRows.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPageSafe, filteredRows])

  const handleOpenDeal = (deal) => {
    const sourceDealId = deal.sourceDealId || deal.dealId || ''
    const fromPath = `${location.pathname}${location.search || ''}`

    if (isAdmin && sourceDealId) {
      navigate(buildAdminDealDetailUrl(sourceDealId), {
        state: {
          fromPath,
        },
      })
      return
    }

    navigate(isAdmin ? '/admin/deals/search' : '/deals/search', {
      state: {
        ...(sourceDealId ? { editDealId: sourceDealId } : {}),
        quotationDealLookup: buildDealLookup(deal),
      },
    })
  }

  const handleOpenAccount = (deal) => {
    if (!deal.accountId) return

    const query = `?view=my-group&accountId=${encodeURIComponent(deal.accountId)}`
    navigate(isAdmin ? buildAdminAccountsBoardUrl('myGroup', query) : `/accounts/my-group-accounts${query}`)
  }

  const handleOpenCustomer = (deal) => {
    const customerId = deal.customerId || deal.data?.customerId || ''
    if (!customerId) return

    navigate(isAdmin ? `/admin/customers/view/${encodeURIComponent(customerId)}` : `/customers/view/${encodeURIComponent(customerId)}`)
  }

  return (
    <div className="converted-deals-page">
      <header className="converted-deals-header">
        <div>
          <p className="converted-deals-eyebrow">Deals - Converted Deal</p>
          <h1>Converted Deals</h1>
          <p className="converted-deals-subtitle">
            {isAdmin
              ? 'All deals converted across the company. Records are stored permanently.'
              : 'Deals you have converted. Records are stored permanently.'}
          </p>
        </div>

        <div className="converted-deals-controls">
          <input
            type="search"
            className="converted-deals-search"
            placeholder="Search converted deals..."
            value={search}
            onChange={(event) => updateSearchParams({ search: event.target.value, page: 1 })}
            aria-label="Search converted deals"
          />
          <select
            className="converted-deals-filter"
            value={statusFilter}
            onChange={(event) => updateSearchParams({ status: event.target.value, page: 1 })}
            aria-label="Filter converted deals"
          >
            <option value="all">All statuses</option>
            <option value="converted">Converted</option>
            <option value="open">Open deals</option>
            <option value="closed">Closed deals</option>
          </select>
          <input
            type="search"
            className="converted-deals-search converted-deals-search--compact"
            placeholder="Owner"
            value={ownerFilter}
            onChange={(event) => updateSearchParams({ owner: event.target.value, page: 1 })}
            aria-label="Filter by owner"
          />
          <input
            type="date"
            className="converted-deals-filter"
            value={dateFilter}
            onChange={(event) => updateSearchParams({ date: event.target.value, page: 1 })}
            aria-label="Filter by date"
          />
          <input
            type="date"
            className="converted-deals-filter"
            value={convertedDateFilter}
            onChange={(event) => updateSearchParams({ convertedDate: event.target.value, page: 1 })}
            aria-label="Filter by converted date"
          />
        </div>
      </header>

      <div className="converted-deals-summary">
        <span>{filteredRows.length} converted deal{filteredRows.length === 1 ? '' : 's'}</span>
        <span>Page {currentPageSafe} of {totalPages}</span>
      </div>

      <div className="converted-deals-table-wrap">
        <table className="converted-deals-table">
          <thead>
            <tr>
              <th>Deal</th>
              <th>Deal No.</th>
              <th>Account Name</th>
              <th>Customer</th>
              <th>Owner</th>
              <th>Value</th>
              <th>Status</th>
              <th>Converted Date</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 ? (
              <tr>
                <td className="converted-deals-empty" colSpan={8}>Loading converted deals...</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="converted-deals-empty" colSpan={8}>No converted deals found.</td>
              </tr>
            ) : (
              rows.map((deal) => {
                const ownerLabel = deal.ownerDisplay
                  || getCrmOwnerDisplay(deal.ownerName || '')
                  || deal.ownerName
                  || '-'
                const statusLabel = capitalize(String(deal.status || deal.stage || 'converted').replace(/_/g, ' '))

                return (
                  <tr key={deal.id}>
                    <td>
                      <button type="button" className="converted-deals-link" onClick={() => handleOpenDeal(deal)}>
                        {deal.title || deal.name || '-'}
                      </button>
                    </td>
                    <td>{deal.dealNumber || '-'}</td>
                    <td>
                      {deal.accountId ? (
                        <button type="button" className="converted-deals-link" onClick={() => handleOpenAccount(deal)}>
                          {deal.accountName || '-'}
                        </button>
                      ) : (
                        deal.accountName || '-'
                      )}
                    </td>
                    <td>
                      {deal.customerId ? (
                        <button type="button" className="converted-deals-link" onClick={() => handleOpenCustomer(deal)}>
                          {deal.customerName || '-'}
                        </button>
                      ) : (
                        deal.customerName || '-'
                      )}
                    </td>
                    <td>{ownerLabel}</td>
                    <td>{deal.amount !== null && deal.amount !== undefined ? formatCurrency(deal.amount, deal.currency) : '-'}</td>
                    <td>{statusLabel}</td>
                    <td>{formatDate(deal.convertedAt || deal.createdAt || '') || '-'}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="converted-deals-pagination">
        <button
          type="button"
          className="converted-deals-page-button"
          onClick={() => updateSearchParams({ page: Math.max(1, currentPageSafe - 1) })}
          disabled={currentPageSafe === 1}
        >
          Previous
        </button>
        <button
          type="button"
          className="converted-deals-page-button"
          onClick={() => updateSearchParams({ page: Math.min(totalPages, currentPageSafe + 1) })}
          disabled={currentPageSafe === totalPages}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default ConvertedDeals
