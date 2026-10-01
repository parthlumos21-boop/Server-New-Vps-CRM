import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaChevronLeft,
  FaChevronRight,
  FaHistory,
  FaListUl,
  FaSearch,
  FaTh,
  FaThLarge,
  FaUser,
} from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import { authService } from '../../../services/authService'
import SupportRequestUserFilterPanel, { getSrUserIds } from './SupportRequestUserFilterPanel'
import { formatSupportRequestType } from './SupportRequestShared'
import './SupportRequestView.css'

const TOOLBAR_ITEMS = [
  { key: 'search', icon: FaSearch, className: 'support-request-view-toolbar-button-cyan', label: 'Search' },
  { key: 'user', icon: FaUser, className: 'support-request-view-toolbar-button-amber', label: 'User' },
  { key: 'list', icon: FaListUl, className: 'support-request-view-toolbar-button-blue', label: 'List' },
  { key: 'grid', icon: FaThLarge, className: 'support-request-view-toolbar-button-purple', label: 'Grid' },
  { key: 'calendar', icon: FaCalendarAlt, className: 'support-request-view-toolbar-button-red', label: 'Calendar' },
  { key: 'history', icon: FaHistory, className: 'support-request-view-toolbar-button-gold', label: 'History' },
  { key: 'board', icon: FaTh, className: 'support-request-view-toolbar-button-cyan', label: 'Board' },
]

const formatDateLabel = (value) => {
  if (!value) return '-'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

const getPrimaryContactPhone = (supportRequest) =>
  supportRequest.contactMobile || supportRequest.contactPhone || '-'

const formatCustomFieldValue = (fieldDefinition, supportRequest) => {
  if (!fieldDefinition) return '-'

  const rawValue = supportRequest?.[fieldDefinition.key]

  if (fieldDefinition.cardFormatter) {
    return fieldDefinition.cardFormatter(rawValue, supportRequest)
  }

  if (fieldDefinition.cellFormatter) {
    return fieldDefinition.cellFormatter(rawValue, supportRequest)
  }

  return rawValue || '-'
}

const SupportRequestBoard = ({
  title = 'Support Request View',
  supportRequests = [],
  showHeader = true,
  showToolbar = true,
  showRecordCountInTitle = true,
  visibleFieldKeys = null,
  fieldDefinitions = null,
}) => {
  const { user, isAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const scrollContainerRef = useRef(null)
  const userFilterRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const [isUserFilterOpen, setIsUserFilterOpen] = useState(false)
  const [activeUserFilterMode, setActiveUserFilterMode] = useState('user')
  const [selectedUserIds, setSelectedUserIds] = useState(null)

  const availableUsers = useMemo(() => (
    authService
      .getAvailableUsers()
      .filter((entry) => entry.name !== 'System Administrator')
      .sort((left, right) => left.name.localeCompare(right.name))
  ), [])

  const permittedUsers = useMemo(() => {
    if (isAdmin) {
      return availableUsers
    }

    const permittedIds = new Set([
      user?.id,
      ...supportRequests.flatMap(getSrUserIds),
    ].filter(Boolean))

    return availableUsers.filter((entry) => permittedIds.has(entry.id))
  }, [availableUsers, isAdmin, supportRequests, user?.id])

  const filteredSupportRequests = useMemo(() => {
    if (!selectedUserIds) {
      return supportRequests
    }

    const selectedSet = new Set(selectedUserIds)
    return supportRequests.filter((supportRequest) => (
      getSrUserIds(supportRequest).some((userId) => selectedSet.has(userId))
    ))
  }, [selectedUserIds, supportRequests])

  const owners = useMemo(() => {
    if (!selectedUserIds) {
      return permittedUsers
    }

    const selectedSet = new Set(selectedUserIds)
    const visibleOwnerIds = new Set(filteredSupportRequests.map((supportRequest) => supportRequest.ownerId).filter(Boolean))
    return permittedUsers.filter((entry) => selectedSet.has(entry.id) || visibleOwnerIds.has(entry.id))
  }, [filteredSupportRequests, permittedUsers, selectedUserIds])

  const supportRequestsByOwner = useMemo(() => (
    owners.reduce((lookup, owner) => {
      lookup[owner.id] = filteredSupportRequests
        .filter((supportRequest) => supportRequest.ownerId === owner.id)
        .sort((left, right) => new Date(right.updatedAt || 0).getTime() - new Date(left.updatedAt || 0).getTime())
      return lookup
    }, {})
  ), [owners, filteredSupportRequests])

  const customCardFields = useMemo(() => {
    if (!Array.isArray(visibleFieldKeys) || !fieldDefinitions) {
      return []
    }

    return visibleFieldKeys
      .filter((key) => !['srNumber', 'title', 'customerName', 'priority'].includes(key))
      .map((key) => fieldDefinitions[key])
      .filter(Boolean)
  }, [fieldDefinitions, visibleFieldKeys])

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return undefined

    const syncScrollState = () => {
      const maxScrollLeft = Math.max(0, container.scrollWidth - container.clientWidth)
      setCanScrollLeft(container.scrollLeft > 0)
      setCanScrollRight(container.scrollLeft < maxScrollLeft - 1)
    }

    syncScrollState()
    container.addEventListener('scroll', syncScrollState)
    window.addEventListener('resize', syncScrollState)

    return () => {
      container.removeEventListener('scroll', syncScrollState)
      window.removeEventListener('resize', syncScrollState)
    }
  }, [owners.length, filteredSupportRequests.length])

  useEffect(() => {
    if (!isUserFilterOpen) return undefined

    const handleOutsideClick = (event) => {
      if (userFilterRef.current && !userFilterRef.current.contains(event.target)) {
        setIsUserFilterOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [isUserFilterOpen])

  const handleHorizontalScroll = (direction) => {
    const container = scrollContainerRef.current
    if (!container) return

    const column = container.querySelector('.support-request-view-column')
    const columnWidth = column ? column.getBoundingClientRect().width : 320
    const gap = 16
    container.scrollBy({
      left: direction * (columnWidth + gap),
      behavior: 'smooth',
    })
  }

  const handleToolbarAction = (itemKey) => {
    if (itemKey === 'user') {
      setIsUserFilterOpen((currentValue) => !currentValue)
      return
    }

    setIsUserFilterOpen(false)

    const basePath = isAdmin ? '/admin/support-requests' : '/support-requests'
    const routeByKey = {
      search: `${basePath}/search`,
      list: `${basePath}/list`,
      grid: `${basePath}/view`,
      board: `${basePath}/view`,
      calendar: isAdmin ? '/admin/calendar' : `${basePath}/view`,
      history: `${basePath}/closed`,
    }
    const nextRoute = routeByKey[itemKey]

    if (nextRoute && nextRoute !== location.pathname) {
      navigate(nextRoute)
    }
  }

  return (
    <div className="support-request-view-page">
      <section className="support-request-view-shell">
        {showHeader ? (
          <div className="support-request-view-filter-area" ref={userFilterRef}>
            <header className="support-request-view-header">
              <h1>{showRecordCountInTitle ? `${title} - ${filteredSupportRequests.length} records` : title}</h1>

              {showToolbar ? (
                <div className="support-request-view-toolbar" aria-label="Support request board actions">
                  {TOOLBAR_ITEMS.map((item) => {
                    const Icon = item.icon
                    const isUserFilter = item.key === 'user'

                    return (
                      <div key={item.key} className="support-request-view-toolbar-item">
                        <button
                          type="button"
                          className={`support-request-view-toolbar-button ${item.className} ${isUserFilterOpen && isUserFilter ? 'support-request-view-toolbar-button-active' : ''}`}
                          aria-label={item.label}
                          title={item.label}
                          onClick={() => handleToolbarAction(item.key)}
                        >
                          <Icon />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : null}
            </header>

            {showToolbar && isUserFilterOpen ? (
              <SupportRequestUserFilterPanel
                users={permittedUsers}
                supportRequests={supportRequests}
                selectedUserIds={selectedUserIds || permittedUsers.map((entry) => entry.id)}
                activeMode={activeUserFilterMode}
                onModeChange={setActiveUserFilterMode}
                onApply={setSelectedUserIds}
                onClose={() => setIsUserFilterOpen(false)}
              />
            ) : null}
          </div>
        ) : null}

        <div className="support-request-view-board">
          <button
            type="button"
            className="support-request-view-edge support-request-view-edge-left"
            onClick={() => handleHorizontalScroll(-1)}
            disabled={!canScrollLeft}
            aria-label="Scroll owners left"
          >
            <FaChevronLeft />
          </button>

          <div ref={scrollContainerRef} className="support-request-view-scroll">
            <div className="support-request-view-columns support-request-view-columns-all">
              {owners.map((owner) => {
                const ownerSupportRequests = supportRequestsByOwner[owner.id] || []

                return (
                  <section key={owner.id} className="support-request-view-column">
                    <header className="support-request-view-column-header">
                      <span className="support-request-view-column-title">
                        {owner.name} ({ownerSupportRequests.length})
                      </span>
                    </header>

                    <div className="support-request-view-column-body">
                      {ownerSupportRequests.map((supportRequest) => (
                        <article key={supportRequest.id} className="support-request-view-card">
                          <div className="support-request-view-card-topline">
                            <strong>{supportRequest.srNumber}</strong>
                            <span className={`support-request-view-chip support-request-view-chip-${String(supportRequest.priority || '').toLowerCase()}`}>
                              {supportRequest.priority || 'medium'}
                            </span>
                          </div>
                          <h2>{supportRequest.title || 'Untitled Request'}</h2>
                          <p className="support-request-view-card-customer">{supportRequest.customerName || '-'}</p>

                          {customCardFields.length > 0 ? (
                            <dl className="support-request-view-card-meta support-request-view-card-meta-custom">
                              {customCardFields.map((fieldDefinition) => (
                                <div key={`${supportRequest.id}-${fieldDefinition.key}`}>
                                  <dt>{fieldDefinition.label}</dt>
                                  <dd>{formatCustomFieldValue(fieldDefinition, supportRequest)}</dd>
                                </div>
                              ))}
                            </dl>
                          ) : (
                            <>
                              <dl className="support-request-view-card-meta">
                                <div>
                                  <dt>Type</dt>
                                  <dd>{formatSupportRequestType(supportRequest.requestType)}</dd>
                                </div>
                                <div>
                                  <dt>Status</dt>
                                  <dd>{supportRequest.status || '-'}</dd>
                                </div>
                                <div>
                                  <dt>SR Date</dt>
                                  <dd>{formatDateLabel(supportRequest.srDate)}</dd>
                                </div>
                                <div>
                                  <dt>City</dt>
                                  <dd>{supportRequest.city || '-'}</dd>
                                </div>
                              </dl>

                              <div className="support-request-view-card-contact">
                                <p className="support-request-view-card-contact-title">Primary Contact</p>
                                <dl className="support-request-view-card-contact-meta">
                                  <div>
                                    <dt>Name</dt>
                                    <dd>{supportRequest.contactPerson || '-'}</dd>
                                  </div>
                                  <div>
                                    <dt>Designation</dt>
                                    <dd>{supportRequest.contactDesignation || '-'}</dd>
                                  </div>
                                  <div>
                                    <dt>Phone</dt>
                                    <dd>{getPrimaryContactPhone(supportRequest)}</dd>
                                  </div>
                                </dl>
                              </div>
                            </>
                          )}
                        </article>
                      ))}
                    </div>
                  </section>
                )
              })}
              {owners.length === 0 ? (
                <section className="support-request-view-empty-filter">
                  No users selected for this filter.
                </section>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            className="support-request-view-edge support-request-view-edge-right"
            onClick={() => handleHorizontalScroll(1)}
            disabled={!canScrollRight}
            aria-label="Scroll owners right"
          >
            <FaChevronRight />
          </button>
        </div>
      </section>
    </div>
  )
}

export default SupportRequestBoard
