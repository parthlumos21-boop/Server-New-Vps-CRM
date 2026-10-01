import React, { useEffect, useMemo, useRef, useState } from 'react'
import { FaArrowRight, FaChevronDown, FaChevronLeft, FaChevronRight, FaClock, FaPhoneAlt } from 'react-icons/fa'
import { useLocation, useNavigate } from 'react-router-dom'
import { useData } from '../../../context/DataContext'
import {
  SUPPORT_REQUEST_TYPE_OPTIONS,
  formatShortDate,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestView.css'

const STATUS_COLUMNS = [
  { key: 'active', label: 'Active', aliases: ['active', 'open', 'new'] },
  { key: 'attending', label: 'Attending', aliases: ['attending'] },
  { key: 'on-site', label: 'On Site', aliases: ['on site', 'on-site', 'onsite'] },
  { key: 'in-progress', label: 'In Progress', aliases: ['in progress', 'in-progress', 'progress'] },
  { key: 'on-hold', label: 'On Hold', aliases: ['on hold', 'on-hold', 'hold'] },
  { key: 'postponed', label: 'Postponed', aliases: ['postponed'] },
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

const getRequestAgeLabel = (supportRequest) => {
  const rawDate = supportRequest.updatedAt || supportRequest.createdAt || supportRequest.srDate
  if (!rawDate) return '-'

  const date = new Date(rawDate)
  if (Number.isNaN(date.getTime())) return '-'

  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000))
  if (days === 0) return 'today'
  if (days === 1) return '1 day ago'
  if (days < 365) return `${days} day(s) ago`
  return `${Math.floor(days / 365)} year(s) ago`
}

const getDateRange = (supportRequest) => {
  const startDate = formatShortDate(supportRequest.srDate || supportRequest.createdAt)
  const endDate = formatShortDate(supportRequest.closedOn || supportRequest.updatedAt || supportRequest.createdAt)

  if (startDate === '-' && endDate === '-') return '-'
  if (startDate === endDate || endDate === '-') return startDate
  return `${startDate} - ${endDate}`
}

const FilterMenu = ({ label, options, selectedValues, onToggle, onLoad }) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectedCount = selectedValues.length

  return (
    <div className="sr-status-filter">
      <button
        type="button"
        className="sr-status-filter-trigger"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span>{label} ({selectedCount})</span>
        <FaChevronDown />
      </button>

      {isOpen ? (
        <div className="sr-status-filter-menu">
          <div className="sr-status-filter-options">
            {options.map((option) => (
              <label key={option.value} className="sr-status-filter-option">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={() => onToggle(option.value)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>

          <button
            type="button"
            className="sr-status-filter-load"
            onClick={() => {
              onLoad()
              setIsOpen(false)
            }}
          >
            <span>Load</span>
            <FaArrowRight />
          </button>
        </div>
      ) : null}
    </div>
  )
}

const SupportRequestView = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { supportRequests } = useData()
  const scrollRef = useRef(null)
  const basePath = getSupportRequestBasePath(location.pathname)
  const [selectedStatuses, setSelectedStatuses] = useState(STATUS_COLUMNS.map((entry) => entry.key))
  const [selectedTypes, setSelectedTypes] = useState(SUPPORT_REQUEST_TYPE_OPTIONS.map((entry) => entry.value))

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

  const filteredRequests = useMemo(() => (
    activeRequests.filter((supportRequest) => (
      selectedStatuses.includes(getStatusColumnKey(supportRequest.status))
      && selectedTypes.includes(supportRequest.requestType)
    ))
  ), [activeRequests, selectedStatuses, selectedTypes])

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

  const toggleType = (typeKey) => {
    setSelectedTypes((currentValues) => (
      currentValues.includes(typeKey)
        ? currentValues.filter((value) => value !== typeKey)
        : [...currentValues, typeKey]
    ))
  }

  const handleScroll = (direction) => {
    const container = scrollRef.current
    if (!container) return

    const column = container.querySelector('.sr-status-board-column')
    const columnWidth = column ? column.getBoundingClientRect().width : 380
    container.scrollBy({ left: direction * (columnWidth + 12), behavior: 'smooth' })
  }

  return (
    <div className="support-request-view-page">
      <section className="sr-status-board-shell">
        <header className="sr-status-board-toolbar">
          <div>
            <h1>Support Request View</h1>
            <p>{filteredRequests.length} SR records by status and type</p>
          </div>

          <div className="sr-status-board-filters">
            <FilterMenu
              label="Status"
              options={STATUS_COLUMNS.map((entry) => ({ value: entry.key, label: entry.label }))}
              selectedValues={selectedStatuses}
              onToggle={toggleStatus}
              onLoad={() => {}}
            />
            <FilterMenu
              label="Type"
              options={availableTypeOptions}
              selectedValues={selectedTypes}
              onToggle={toggleType}
              onLoad={() => {}}
            />
          </div>
        </header>

        <div className="sr-status-board-wrap">
          <button type="button" className="sr-status-board-edge sr-status-board-edge-left" onClick={() => handleScroll(-1)} aria-label="Scroll status columns left">
            <FaChevronLeft />
          </button>

          <div ref={scrollRef} className="sr-status-board-scroll">
            <div className="sr-status-board-columns">
              {visibleColumns.map((column) => {
                const columnRequests = requestsByStatus[column.key] || []

                return (
                  <section key={column.key} className="sr-status-board-column">
                    <header className="sr-status-board-column-header">
                      {column.label} ({columnRequests.length})
                    </header>

                    <div className="sr-status-board-column-body">
                      {columnRequests.map((supportRequest) => (
                        <button
                          key={supportRequest.id}
                          type="button"
                          className="sr-status-board-card"
                          onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}
                        >
                          <strong className="sr-status-board-card-title">
                            {formatSupportRequestType(supportRequest.requestType)} [{supportRequest.srNumber || 'SR'}]
                          </strong>

                          <span className="sr-status-board-card-line">
                            <span className="sr-status-dot" />
                            {getStatusLabel(supportRequest.status)}
                          </span>

                          <span className="sr-status-board-card-line">
                            <FaPhoneAlt />
                            {supportRequest.contactMobile || supportRequest.contactPhone || supportRequest.customerPhone || '-'}
                          </span>

                          <span className="sr-status-board-card-line">
                            <span className="sr-status-dot" />
                            {supportRequest.srNumber || '-'}
                          </span>

                          <em>{getDateRange(supportRequest)}</em>

                          <span className="sr-status-board-card-line sr-status-board-card-muted">
                            <FaClock />
                            {getRequestAgeLabel(supportRequest)}
                          </span>
                        </button>
                      ))}

                      {columnRequests.length === 0 ? (
                        <div className="sr-status-board-empty" />
                      ) : null}
                    </div>
                  </section>
                )
              })}
            </div>
          </div>

          <button type="button" className="sr-status-board-edge sr-status-board-edge-right" onClick={() => handleScroll(1)} aria-label="Scroll status columns right">
            <FaChevronRight />
          </button>
        </div>
      </section>
    </div>
  )
}

export default SupportRequestView
