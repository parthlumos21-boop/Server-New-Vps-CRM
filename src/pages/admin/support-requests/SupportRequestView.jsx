import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  FaArrowRight,
  FaBuilding,
  FaCalendarAlt,
  FaCheck,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaClock,
  FaExternalLinkAlt,
  FaFilter,
  FaPhoneAlt,
  FaPlus,
  FaSearch,
  FaTable,
  FaThLarge,
  FaTicketAlt,
  FaTimes,
  FaUser,
} from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { supportRequestApi } from '../../../services/supportRequestApi'
import {
  SUPPORT_REQUEST_TYPE_OPTIONS,
  formatShortDate,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestView.css'

const STATUS_COLUMNS = [
  { key: 'active', label: 'Active', aliases: ['active', 'open', 'new'], color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'attending', label: 'Attending', aliases: ['attending'], color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
  { key: 'on-site', label: 'On Site', aliases: ['on site', 'on-site', 'onsite'], color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { key: 'in-progress', label: 'In Progress', aliases: ['in progress', 'in-progress', 'progress'], color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  { key: 'on-hold', label: 'On Hold', aliases: ['on hold', 'on-hold', 'hold'], color: '#ea580c', bg: '#fff7ed', border: '#fed7aa' },
  { key: 'postponed', label: 'Postponed', aliases: ['postponed'], color: '#64748b', bg: '#f8fafc', border: '#cbd5e1' },
]

const normalizeValue = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const getStatusColumnKey = (status) => {
  const normalizedStatus = normalizeValue(status)
  const column = STATUS_COLUMNS.find((entry) => entry.aliases.includes(normalizedStatus))
  return column?.key || 'active'
}

const getStatusLabel = (status) => (
  STATUS_COLUMNS.find((entry) => entry.key === getStatusColumnKey(status))?.label || status || 'Active'
)

const getStatusConfig = (status) => {
  const key = getStatusColumnKey(status)
  return STATUS_COLUMNS.find((entry) => entry.key === key) || STATUS_COLUMNS[0]
}

const getRequestAgeLabel = (supportRequest) => {
  const rawDate = supportRequest.updatedAt || supportRequest.createdAt || supportRequest.srDate
  if (!rawDate) return '-'

  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) return '-'

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 365) return `${days}d ago`
  return `${Math.floor(days / 365)}y ago`
}

const getDateRange = (supportRequest) => {
  const startDate = formatShortDate(supportRequest.srDate || supportRequest.createdAt)
  const endDate = formatShortDate(supportRequest.closedOn || supportRequest.updatedAt || supportRequest.createdAt)

  if (startDate === '-' && endDate === '-') return '-'
  if (startDate === endDate || endDate === '-') return startDate
  return `${startDate} - ${endDate}`
}

const FilterMenu = ({ label, options, selectedValues, onToggle, onSelectAll, onClearAll }) => {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const selectedCount = selectedValues.length
  const allSelected = selectedCount === options.length

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="sr-status-filter" ref={menuRef}>
      <button
        type="button"
        className={`sr-status-filter-trigger ${isOpen ? 'sr-status-filter-trigger--open' : ''} ${selectedCount < options.length ? 'sr-status-filter-trigger--active' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
      >
        <span className="sr-filter-label-group">
          <FaFilter className="sr-filter-icon" />
          <span>{label}</span>
          <span className="sr-filter-badge">{selectedCount}</span>
        </span>
        <FaChevronDown className={`sr-filter-chevron ${isOpen ? 'sr-filter-chevron--up' : ''}`} />
      </button>

      {isOpen && (
        <div className="sr-status-filter-menu">
          <div className="sr-filter-menu-header">
            <span className="sr-filter-menu-title">Filter by {label}</span>
            <div className="sr-filter-quick-actions">
              <button
                type="button"
                className="sr-filter-quick-btn"
                onClick={allSelected ? onClearAll : onSelectAll}
              >
                {allSelected ? 'Clear All' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="sr-status-filter-options">
            {options.map((option) => {
              const isChecked = selectedValues.includes(option.value)
              return (
                <label key={option.value} className={`sr-status-filter-option ${isChecked ? 'sr-status-filter-option--checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => onToggle(option.value)}
                  />
                  <span className="sr-option-text">{option.label}</span>
                  {isChecked && <FaCheck className="sr-option-check-icon" />}
                </label>
              )
            })}
          </div>

          <div className="sr-filter-menu-footer">
            <button
              type="button"
              className="sr-filter-apply-btn"
              onClick={() => setIsOpen(false)}
            >
              Apply Filter
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const SupportRequestView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { supportRequests, refreshSupportRequests } = useData()
  const { user } = useAuth()
  const scrollRef = useRef(null)
  const basePath = getSupportRequestBasePath(location.pathname)

  const [selectedStatuses, setSelectedStatuses] = useState(STATUS_COLUMNS.map((entry) => entry.key))
  const [selectedTypes, setSelectedTypes] = useState(SUPPORT_REQUEST_TYPE_OPTIONS.map((entry) => entry.value))
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState('board') // 'board' | 'table'

  const isAuthorizedToClose = ['parth@support.com', 'rushabh@support.com'].includes(user?.email)

  const activeRequests = useMemo(() => (
    supportRequests
      .filter((supportRequest) => normalizeValue(supportRequest.status) !== 'closed')
      .sort((left, right) => (
        new Date(right.updatedAt || right.createdAt || 0).getTime()
        - new Date(left.updatedAt || left.createdAt || 0).getTime()
      ))
  ), [supportRequests])

  const availableTypeOptions = useMemo(() => {
    const knownTypes = new Set(SUPPORT_REQUEST_TYPE_OPTIONS.map((option) => option.value))
    const dynamicOptions = activeRequests
      .map((supportRequest) => supportRequest.requestType)
      .filter(Boolean)
      .filter((value, index, values) => values.indexOf(value) === index && !knownTypes.has(value))
      .map((value) => ({ value, label: formatSupportRequestType(value) }))

    return [...SUPPORT_REQUEST_TYPE_OPTIONS, ...dynamicOptions]
  }, [activeRequests])

  useEffect(() => {
    setSelectedTypes((currentValues) => {
      const allTypeValues = availableTypeOptions.map((option) => option.value)
      const missingValues = allTypeValues.filter((value) => !currentValues.includes(value))

      return missingValues.length > 0 ? [...currentValues, ...missingValues] : currentValues
    })
  }, [availableTypeOptions])

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return activeRequests.filter((supportRequest) => {
      const matchesStatus = selectedStatuses.includes(getStatusColumnKey(supportRequest.status))
      const matchesType = selectedTypes.includes(supportRequest.requestType)

      if (!matchesStatus || !matchesType) return false
      if (!query) return true

      const srNum = String(supportRequest.srNumber || '').toLowerCase()
      const reqType = String(supportRequest.requestType || '').toLowerCase()
      const status = String(supportRequest.status || '').toLowerCase()
      const customer = String(supportRequest.customerName || supportRequest.companyName || supportRequest.accountName || '').toLowerCase()
      const contact = String(supportRequest.contactPerson || supportRequest.contactMobile || supportRequest.contactPhone || supportRequest.customerPhone || '').toLowerCase()
      const desc = String(supportRequest.subject || supportRequest.complaintDetails || supportRequest.title || supportRequest.description || '').toLowerCase()

      return srNum.includes(query) || reqType.includes(query) || status.includes(query) || customer.includes(query) || contact.includes(query) || desc.includes(query)
    })
  }, [activeRequests, selectedStatuses, selectedTypes, searchQuery])

  const requestsByStatus = useMemo(() => (
    STATUS_COLUMNS.reduce((lookup, column) => {
      lookup[column.key] = filteredRequests.filter((supportRequest) => getStatusColumnKey(supportRequest.status) === column.key)
      return lookup
    }, {})
  ), [filteredRequests])

  const visibleColumns = STATUS_COLUMNS.filter((column) => selectedStatuses.includes(column.key))

  const toggleStatus = (statusKey) => {
    setSelectedStatuses((currentValues) => (
      currentValues.includes(statusKey)
        ? currentValues.filter((value) => value !== statusKey)
        : [...currentValues, statusKey]
    ))
  }

  const selectAllStatuses = () => setSelectedStatuses(STATUS_COLUMNS.map((e) => e.key))
  const clearAllStatuses = () => setSelectedStatuses([])

  const toggleType = (typeKey) => {
    setSelectedTypes((currentValues) => (
      currentValues.includes(typeKey)
        ? currentValues.filter((value) => value !== typeKey)
        : [...currentValues, typeKey]
    ))
  }

  const selectAllTypes = () => setSelectedTypes(availableTypeOptions.map((e) => e.value))
  const clearAllTypes = () => setSelectedTypes([])

  const handleScroll = (direction) => {
    const container = scrollRef.current
    if (!container) return

    const column = container.querySelector('.sr-status-board-column')
    const columnWidth = column ? column.getBoundingClientRect().width : 300
    container.scrollBy({ left: direction * (columnWidth + 16), behavior: 'smooth' })
  }

  const handleCloseRequest = async (e, id) => {
    e.stopPropagation()
    if (!window.confirm('Are you sure you want to close this ticket?')) return
    try {
      await supportRequestApi.closeTicket(id)
      await refreshSupportRequests()
    } catch (err) {
      console.error('Error closing ticket:', err)
      alert(err.response?.data?.message || 'Failed to close ticket.')
    }
  }

  return (
    <div className="support-request-view-page">
      <section className="sr-status-board-shell">
        {/* Top Header / Control Toolbar */}
        <header className="sr-status-board-toolbar">
          <div className="sr-toolbar-title-block">
            <div className="sr-toolbar-header-row">
              <span className="sr-header-icon-pill">
                <FaTicketAlt />
              </span>
              <div>
                <div className="sr-title-with-pill">
                  <h1>Support Request View</h1>
                  <span className="sr-count-badge">
                    {filteredRequests.length} {filteredRequests.length === 1 ? 'ticket' : 'tickets'}
                  </span>
                </div>
                <p className="sr-subtitle">
                  Real-time pipeline across {visibleColumns.length} active stage{visibleColumns.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="sr-status-board-filters">
            {/* Search Input */}
            <div className="sr-search-bar">
              <FaSearch className="sr-search-icon" />
              <input
                type="text"
                className="sr-search-input"
                placeholder="Search SR#, customer, contact..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="sr-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <FaTimes />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <FilterMenu
              label="Status"
              options={STATUS_COLUMNS.map((entry) => ({ value: entry.key, label: entry.label }))}
              selectedValues={selectedStatuses}
              onToggle={toggleStatus}
              onSelectAll={selectAllStatuses}
              onClearAll={clearAllStatuses}
            />

            <FilterMenu
              label="Type"
              options={availableTypeOptions}
              selectedValues={selectedTypes}
              onToggle={toggleType}
              onSelectAll={selectAllTypes}
              onClearAll={clearAllTypes}
            />

            {/* View Mode Toggle */}
            <div className="sr-view-switcher" role="group" aria-label="View switcher">
              <button
                type="button"
                className={`sr-view-switch-btn ${viewMode === 'board' ? 'sr-view-switch-btn--active' : ''}`}
                onClick={() => setViewMode('board')}
                title="Kanban Board View"
              >
                <FaThLarge />
                <span>Board</span>
              </button>
              <button
                type="button"
                className={`sr-view-switch-btn ${viewMode === 'table' ? 'sr-view-switch-btn--active' : ''}`}
                onClick={() => setViewMode('table')}
                title="Table Grid View"
              >
                <FaTable />
                <span>Table</span>
              </button>
            </div>

            {/* Board Column Horizontal Scroll Navigation */}
            {viewMode === 'board' && (
              <div className="sr-board-scroll-nav" role="group" aria-label="Board scroll navigation">
                <button
                  type="button"
                  className="sr-board-nav-btn"
                  onClick={() => handleScroll(-1)}
                  title="Scroll board left"
                  aria-label="Scroll board left"
                >
                  <FaChevronLeft />
                </button>
                <button
                  type="button"
                  className="sr-board-nav-btn"
                  onClick={() => handleScroll(1)}
                  title="Scroll board right"
                  aria-label="Scroll board right"
                >
                  <FaChevronRight />
                </button>
              </div>
            )}

            {/* Add New Support Request Quick Link */}
            <button
              type="button"
              className="sr-new-request-btn"
              onClick={() => navigate(`${basePath}/add`)}
              title="Create new support request"
            >
              <FaPlus />
              <span>New Request</span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        {viewMode === 'table' ? (
          <div className="sr-table-view-container">
            <div className="support-request-legacy-table-shell">
              <table className="support-request-legacy-table">
                <thead>
                  <tr>
                    <th style={{ width: '4rem', textAlign: 'center' }}>No.</th>
                    <th>SR Number</th>
                    <th>Request Type</th>
                    <th>Customer / Account</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Contact & Phone</th>
                    <th>Date & Age</th>
                    <th style={{ textAlign: 'center' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRequests.map((supportRequest, index) => {
                    const statusConfig = getStatusConfig(supportRequest.status)
                    const customerName = supportRequest.customerName || supportRequest.companyName || supportRequest.accountName || supportRequest.clientName || '-'
                    const phone = supportRequest.contactMobile || supportRequest.contactPhone || supportRequest.customerPhone || '-'

                    return (
                      <tr
                        key={supportRequest.id}
                        className="sr-table-row"
                        onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}
                      >
                        <td style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {index + 1}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="sr-ticket-code-badge"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`${basePath}/details/${supportRequest.id}`)
                            }}
                          >
                            {supportRequest.srNumber || `SR-${String(supportRequest.id || '').slice(-4).toUpperCase()}`}
                          </button>
                        </td>
                        <td>
                          <span className="sr-type-tag">
                            {formatSupportRequestType(supportRequest.requestType)}
                          </span>
                        </td>
                        <td>
                          <div className="sr-table-customer-cell">
                            <span className="sr-table-customer-name">{customerName}</span>
                            {supportRequest.contactPerson && (
                              <span className="sr-table-contact-person">
                                <FaUser size={10} /> {supportRequest.contactPerson}
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className="sr-status-pill"
                            style={{
                              backgroundColor: statusConfig.bg,
                              color: statusConfig.color,
                              borderColor: statusConfig.border,
                            }}
                          >
                            <span className="sr-status-pill-dot" style={{ backgroundColor: statusConfig.color }} />
                            {getStatusLabel(supportRequest.status)}
                          </span>
                        </td>
                        <td>
                          <div className="sr-table-contact-cell">
                            {phone !== '-' ? (
                              <a
                                href={`tel:${phone}`}
                                className="sr-phone-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <FaPhoneAlt size={10} /> {phone}
                              </a>
                            ) : (
                              <span>-</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="sr-table-date-cell">
                            <span>{getDateRange(supportRequest)}</span>
                            <span className="sr-table-age-muted">
                              <FaClock size={10} /> {getRequestAgeLabel(supportRequest)}
                            </span>
                          </div>
                        </td>
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div className="sr-table-actions-cell">
                            <button
                              type="button"
                              className="sr-action-btn-view"
                              onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}
                              title="View details"
                            >
                              <FaExternalLinkAlt size={11} />
                              <span>View</span>
                            </button>
                            {isAuthorizedToClose && (
                              <button
                                type="button"
                                className="sr-action-btn-close"
                                onClick={(e) => handleCloseRequest(e, supportRequest.id)}
                                title="Close ticket"
                              >
                                <FaCheck size={11} />
                                <span>Close</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {filteredRequests.length === 0 && (
                    <tr>
                      <td colSpan={8} className="sr-table-empty-cell">
                        <div className="sr-empty-message">
                          <FaTicketAlt size={28} className="sr-empty-icon" />
                          <strong>No support requests found</strong>
                          <p>Try adjusting your search query, status filters, or type filters.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Kanban Board View */
          <div className="sr-status-board-wrap">
            <button
              type="button"
              className="sr-status-board-edge sr-status-board-edge-left"
              onClick={() => handleScroll(-1)}
              aria-label="Scroll status columns left"
              title="Scroll left"
            >
              <FaChevronLeft />
            </button>

            <div ref={scrollRef} className="sr-status-board-scroll">
              <div className="sr-status-board-columns">
                {visibleColumns.map((column) => {
                  const columnRequests = requestsByStatus[column.key] || []

                  return (
                    <section key={column.key} className="sr-status-board-column">
                      <header
                        className="sr-status-board-column-header"
                        style={{ borderTopColor: column.color }}
                      >
                        <div className="sr-column-title-group">
                          <span
                            className="sr-column-indicator"
                            style={{ backgroundColor: column.color }}
                          />
                          <span className="sr-column-label">{column.label}</span>
                        </div>
                        <span className="sr-column-count-chip">
                          {columnRequests.length}
                        </span>
                      </header>

                      <div className="sr-status-board-column-body">
                        {columnRequests.map((supportRequest) => {
                          const customerName = supportRequest.customerName || supportRequest.companyName || supportRequest.accountName || supportRequest.clientName || 'General Inquiry'
                          const phone = supportRequest.contactMobile || supportRequest.contactPhone || supportRequest.customerPhone || ''
                          const subject = supportRequest.subject || supportRequest.complaintDetails || supportRequest.title || supportRequest.description || ''

                          return (
                            <div
                              key={supportRequest.id}
                              className="sr-status-board-card"
                              onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}
                            >
                              {/* Card Header */}
                              <div className="sr-card-top-bar">
                                <span className="sr-card-code-pill">
                                  {supportRequest.srNumber || `SR-${String(supportRequest.id || '').slice(-4).toUpperCase()}`}
                                </span>
                                <span className="sr-card-type-tag">
                                  {formatSupportRequestType(supportRequest.requestType)}
                                </span>
                                <span className="sr-card-time-ago">
                                  <FaClock size={10} /> {getRequestAgeLabel(supportRequest)}
                                </span>
                              </div>

                              {/* Customer & Subject Details */}
                              <div className="sr-card-entity-block">
                                <div className="sr-card-customer-row">
                                  <FaBuilding className="sr-card-icon-muted" size={11} />
                                  <strong className="sr-card-customer-name">
                                    {customerName}
                                  </strong>
                                </div>
                                {subject && (
                                  <p className="sr-card-subject-snippet" title={subject}>
                                    {subject}
                                  </p>
                                )}
                              </div>

                              {/* Metadata Grid */}
                              <div className="sr-card-meta-grid">
                                <div className="sr-card-meta-item">
                                  <FaCalendarAlt size={10} className="sr-card-icon-muted" />
                                  <span>{getDateRange(supportRequest)}</span>
                                </div>

                                {phone ? (
                                  <div className="sr-card-meta-item">
                                    <FaPhoneAlt size={10} className="sr-card-icon-muted" />
                                    <a
                                      href={`tel:${phone}`}
                                      className="sr-card-phone-link"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {phone}
                                    </a>
                                  </div>
                                ) : null}

                                {supportRequest.contactPerson ? (
                                  <div className="sr-card-meta-item">
                                    <FaUser size={10} className="sr-card-icon-muted" />
                                    <span>{supportRequest.contactPerson}</span>
                                  </div>
                                ) : null}
                              </div>

                              {/* Card Actions Footer */}
                              <div className="sr-card-footer" onClick={(e) => e.stopPropagation()}>
                                <button
                                  type="button"
                                  className="sr-card-action-btn sr-card-action-view"
                                  onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}
                                  title="View full request details"
                                >
                                  <FaExternalLinkAlt size={10} />
                                  <span>Details</span>
                                </button>

                                {isAuthorizedToClose && (
                                  <button
                                    type="button"
                                    className="sr-card-action-btn sr-card-action-close"
                                    onClick={(e) => handleCloseRequest(e, supportRequest.id)}
                                    title="Close ticket"
                                  >
                                    <FaCheck size={10} />
                                    <span>Close</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}

                        {columnRequests.length === 0 && (
                          <div className="sr-status-board-empty">
                            <span className="sr-empty-dot" />
                            <span>No requests in {column.label}</span>
                          </div>
                        )}
                      </div>
                    </section>
                  )
                })}
              </div>
            </div>

            <button
              type="button"
              className="sr-status-board-edge sr-status-board-edge-right"
              onClick={() => handleScroll(1)}
              aria-label="Scroll status columns right"
              title="Scroll right"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

export default SupportRequestView
