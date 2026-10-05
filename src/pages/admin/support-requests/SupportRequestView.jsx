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
  { key: 'active', label: 'Active', aliases: ['active', 'open', 'new'], color: '#2563eb', bg: '#1d4ed8', border: '#1e40af' },
  { key: 'attending', label: 'Attending', aliases: ['attending'], color: '#7c3aed', bg: '#6d28d9', border: '#5b21b6' },
  { key: 'on-site', label: 'On Site', aliases: ['on site', 'on-site', 'onsite'], color: '#d97706', bg: '#b45309', border: '#92400e' },
  { key: 'in-progress', label: 'In Progress', aliases: ['in progress', 'in-progress', 'progress'], color: '#059669', bg: '#047857', border: '#065f46' },
  { key: 'on-hold', label: 'On Hold', aliases: ['on hold', 'on-hold', 'hold'], color: '#ea580c', bg: '#c2410c', border: '#9a3412' },
  { key: 'postponed', label: 'Postponed', aliases: ['postponed'], color: '#64748b', bg: '#475569', border: '#334155' },
  { key: 'closed', label: 'Closed', aliases: ['closed', 'close'], color: '#ffffff', bg: '#dc2626', border: '#b91c1c' },
]

const normalizeValue = (value) => String(value || '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ')

const getStatusColumnKey = (status) => {
  const normalizedStatus = normalizeValue(status)
  const column = STATUS_COLUMNS.find((entry) => entry.aliases.includes(normalizedStatus))
  return column?.key || 'active'
}

const getStatusLabel = (status) => {
  if (!status) return 'Active'
  const column = STATUS_COLUMNS.find((entry) => entry.aliases.includes(normalizeValue(status)))
  return column?.label || String(status).trim()
}

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
  const basePath = getSupportRequestBasePath(location.pathname)

  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all')
  const [selectedTypes, setSelectedTypes] = useState(SUPPORT_REQUEST_TYPE_OPTIONS.map((entry) => entry.value))
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRequestForModal, setSelectedRequestForModal] = useState(null)
  const [modalStatus, setModalStatus] = useState('Open')
  const [modalDescription, setModalDescription] = useState('')
  const [isSavingModal, setIsSavingModal] = useState(false)

  const isSupportUser = Boolean(user?.email?.trim().toLowerCase().endsWith('@support.com'))

  const isAuthorizedToClose = Boolean(
    user?.role === 'admin' ||
    user?.userType === 'Support' ||
    ['parth@support.com', 'rushabh@support.com'].includes(user?.email)
  )

  const activeRequests = useMemo(() => (
    [...supportRequests]
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
      const requestStatusKey = getStatusColumnKey(supportRequest.status)
      const matchesStatus = selectedStatusFilter === 'all' || requestStatusKey === selectedStatusFilter
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
  }, [activeRequests, selectedStatusFilter, selectedTypes, searchQuery])

  const toggleType = (typeKey) => {
    setSelectedTypes((currentValues) => (
      currentValues.includes(typeKey)
        ? currentValues.filter((value) => value !== typeKey)
        : [...currentValues, typeKey]
    ))
  }

  const selectAllTypes = () => setSelectedTypes(availableTypeOptions.map((e) => e.value))
  const clearAllTypes = () => setSelectedTypes([])

  const openViewModal = (e, sr) => {
    e.stopPropagation()
    setSelectedRequestForModal(sr)
    setModalStatus(sr.status || 'Open')
    setModalDescription(sr.description || sr.complaintDetails || sr.subject || '')
  }

  const handleSaveModal = async (e) => {
    e.preventDefault()
    if (!selectedRequestForModal) return
    setIsSavingModal(true)
    try {
      await supportRequestApi.updateSupportRequest(selectedRequestForModal.id || selectedRequestForModal._id, {
        status: modalStatus,
        description: modalDescription,
        subject: selectedRequestForModal.subject || selectedRequestForModal.title || 'Update',
      })
      await refreshSupportRequests()
      setSelectedRequestForModal(null)
    } catch (err) {
      console.error('Failed to update support request:', err)
      alert(err.response?.data?.message || 'Failed to update support request.')
    } finally {
      setIsSavingModal(false)
    }
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
                  Real-time support request records & pipeline management
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

            {/* Status Dropdown Selector */}
            <div className="sr-status-dropdown-wrapper">
              <label htmlFor="sr-status-select" className="sr-dropdown-label">
                <FaFilter className="sr-filter-icon" />
                <span>Status:</span>
              </label>
              <select
                id="sr-status-select"
                className="sr-status-dropdown-select"
                value={selectedStatusFilter}
                onChange={(e) => setSelectedStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses ({activeRequests.length})</option>
                {STATUS_COLUMNS.map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Request Type Filter */}
            <FilterMenu
              label="Type"
              options={availableTypeOptions}
              selectedValues={selectedTypes}
              onToggle={toggleType}
              onSelectAll={selectAllTypes}
              onClearAll={clearAllTypes}
            />

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

        {/* Content Area - Table Grid View Only */}
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
                  {isSupportUser && <th style={{ width: '130px', textAlign: 'center' }}>Actions</th>}
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
                      {isSupportUser && (
                        <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              onClick={(e) => openViewModal(e, supportRequest)}
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              View
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleCloseRequest(e, supportRequest.id || supportRequest._id)}
                              style={{ padding: '4px 10px', fontSize: '12px', fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                            >
                              Close
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
                {filteredRequests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="sr-table-empty-cell">
                      <div className="sr-empty-message">
                        <FaTicketAlt size={28} className="sr-empty-icon" />
                        <strong>No support requests found</strong>
                        <p>Try adjusting your search query, status filter, or type filter.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      {selectedRequestForModal && (
        <div className="arm-overlay" role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15, 23, 42, 0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ background: '#ffffff', borderRadius: '12px', width: '100%', maxWidth: '520px', padding: '20px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
              <div>
                <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#0284c7' }}>Support Request Details</span>
                <h3 style={{ margin: '2px 0 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedRequestForModal.srNumber || `SR-${String(selectedRequestForModal.id).slice(-4).toUpperCase()}`}
                </h3>
              </div>
              <button type="button" onClick={() => setSelectedRequestForModal(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#64748b' }}>×</button>
            </div>

            <form onSubmit={handleSaveModal}>
              <div style={{ marginBottom: '12px', fontSize: '13px', color: '#334155' }}>
                <strong>Customer / Account:</strong> {selectedRequestForModal.customerName || selectedRequestForModal.companyName || selectedRequestForModal.accountName || '-'}<br />
                <strong>Type:</strong> {formatSupportRequestType(selectedRequestForModal.requestType)}
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Status *</label>
                <select
                  value={modalStatus}
                  onChange={(e) => setModalStatus(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', fontWeight: 600 }}
                >
                  <option value="Open">Open</option>
                  <option value="Attending">Attending</option>
                  <option value="On site">On site</option>
                  <option value="On Hold">On Hold</option>
                  <option value="Postponed">Postponed</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>Description / Remarks</label>
                <textarea
                  rows={4}
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                  placeholder="Enter description or remarks..."
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedRequestForModal(null)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingModal}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: '#0284c7', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  {isSavingModal ? 'Saving...' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </section>
    </div>
  )
}

export default SupportRequestView
