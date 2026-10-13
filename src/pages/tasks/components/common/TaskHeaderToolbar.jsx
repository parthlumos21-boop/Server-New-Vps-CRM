import React, { useRef, useState, useEffect } from 'react'
import {
  FaList,
  FaColumns,
  FaCalendarAlt,
  FaSlidersH,
  FaStar,
  FaRegStar,
  FaPlus,
  FaChevronDown,
  FaCalendarCheck,
  FaEllipsisH,
} from 'react-icons/fa'
import { TaskFilterPopover } from './TaskFilterPopover'

export const TaskHeaderToolbar = ({
  activeView = 'list',
  onViewChange,
  filterRules = [],
  onFilterRulesChange,
  userList = [],
  selectedStatuses = [],
  onToggleStatusFilter,
  filterCreatedByMe = false,
  onToggleCreatedByMe,
  dateFilterPreset = 'all',
  onDateFilterChange,
  onAddTask,
  title = 'My Task',
}) => {
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false)
  const [statusChipDropdownOpen, setStatusChipDropdownOpen] = useState(false)
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false)
  const filterBtnRef = useRef(null)
  const statusChipRef = useRef(null)
  const dateBtnRef = useRef(null)

  // Close status chip and date dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (statusChipRef.current && !statusChipRef.current.contains(e.target)) {
        setStatusChipDropdownOpen(false)
      }
      if (dateBtnRef.current && !dateBtnRef.current.contains(e.target)) {
        setDateDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const availableStatuses = [
    { key: 'in_progress', label: 'Processing' },
    { key: 'pending', label: 'Pending' },
    { key: 'review', label: 'Checking' },
    { key: 'draft', label: 'Draft' },
    { key: 'completed', label: 'Completed' },
  ]

  // Status chip display text
  let statusChipText = 'All Statuses'
  if (selectedStatuses.length === 1) {
    const found = availableStatuses.find((s) => s.key === selectedStatuses[0])
    statusChipText = found ? found.label : selectedStatuses[0]
  } else if (selectedStatuses.length > 1) {
    const first = availableStatuses.find((s) => s.key === selectedStatuses[0])?.label || 'Processing'
    statusChipText = `${first}... +${selectedStatuses.length - 1}more`
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
        marginBottom: '1.25rem',
        position: 'relative',
      }}
    >
      {/* Main Top Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: '1.65rem',
            fontWeight: '800',
            color: '#0f172a',
            margin: 0,
            letterSpacing: '-0.025em',
            fontFamily: 'inherit',
          }}
        >
          {title}
        </h1>

        {/* Right Top Action Bar matching Image 1 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '0.55rem',
            position: 'relative',
          }}
        >
          {/* Filter Button */}
          <div style={{ position: 'relative' }}>
            <button
              ref={filterBtnRef}
              type="button"
              onClick={() => setFilterPopoverOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.48rem 0.9rem',
                borderRadius: '10px',
                border: filterRules.length > 0 ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: filterRules.length > 0 || filterPopoverOpen ? '#eff6ff' : '#ffffff',
                color: filterRules.length > 0 || filterPopoverOpen ? '#1d4ed8' : '#334155',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <FaSlidersH style={{ fontSize: '0.8rem', color: '#2563eb' }} />
              <span>Filter</span>
              {filterRules.length > 0 && (
                <span
                  style={{
                    background: '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.65rem',
                    padding: '0.1rem 0.4rem',
                    borderRadius: '999px',
                    fontWeight: '800',
                  }}
                >
                  {filterRules.length}
                </span>
              )}
            </button>

            {/* Filter Popover */}
            <TaskFilterPopover
              isOpen={filterPopoverOpen}
              onClose={() => setFilterPopoverOpen(false)}
              filterRules={filterRules}
              onFilterRulesChange={onFilterRulesChange}
              userList={userList}
              anchorRef={filterBtnRef}
            />
          </div>

          {/* Quick Status Dropdown Chip: "Processing... +3more ▾" */}
          <div ref={statusChipRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setStatusChipDropdownOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.48rem 0.85rem',
                borderRadius: '10px',
                border: selectedStatuses.length > 0 ? '1.5px solid #3b82f6' : '1px solid #cbd5e1',
                background: selectedStatuses.length > 0 ? '#f0fdf4' : '#ffffff',
                color: selectedStatuses.length > 0 ? '#1e293b' : '#475569',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
            >
              <span>{statusChipText}</span>
              <FaChevronDown style={{ fontSize: '0.62rem', color: '#64748b' }} />
            </button>

            {statusChipDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 999,
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                  padding: '0.45rem',
                  minWidth: '170px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.2rem',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: '800',
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    padding: '0.25rem 0.5rem',
                    letterSpacing: '0.04em',
                  }}
                >
                  Quick Status Filters
                </div>
                {availableStatuses.map((st) => {
                  const isChecked = selectedStatuses.includes(st.key)
                  return (
                    <label
                      key={st.key}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.35rem 0.55rem',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        color: '#334155',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: isChecked ? '#eff6ff' : 'transparent',
                        fontWeight: isChecked ? '700' : '500',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => onToggleStatusFilter(st.key)}
                        style={{ accentColor: '#2563eb' }}
                      />
                      <span>{st.label}</span>
                    </label>
                  )
                })}
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      selectedStatuses.forEach((k) => onToggleStatusFilter(k))
                      setStatusChipDropdownOpen(false)
                    }}
                    style={{
                      marginTop: '0.3rem',
                      padding: '0.3rem',
                      background: 'transparent',
                      border: 'none',
                      color: '#ef4444',
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      textAlign: 'center',
                    }}
                  >
                    Reset Statuses
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Created by me star toggle */}
          <button
            type="button"
            onClick={onToggleCreatedByMe}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.48rem 0.85rem',
              borderRadius: '10px',
              border: filterCreatedByMe ? '1.5px solid #f59e0b' : '1px solid #cbd5e1',
              background: filterCreatedByMe ? '#fefce8' : '#ffffff',
              color: filterCreatedByMe ? '#b45309' : '#475569',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              outline: 'none',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
            title="Filter tasks created by me"
          >
            {filterCreatedByMe ? (
              <FaStar style={{ color: '#f59e0b', fontSize: '0.85rem' }} />
            ) : (
              <FaRegStar style={{ color: '#64748b', fontSize: '0.85rem' }} />
            )}
            <span>Created by me</span>
          </button>

          {/* Date Picker Button */}
          <div ref={dateBtnRef} style={{ position: 'relative' }}>
            <button
              type="button"
              onClick={() => setDateDropdownOpen((prev) => !prev)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.52rem 0.65rem',
                borderRadius: '10px',
                border: dateFilterPreset !== 'all' ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                background: dateFilterPreset !== 'all' ? '#fef2f2' : '#ffffff',
                color: dateFilterPreset !== 'all' ? '#c60016' : '#64748b',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
              }}
              title="Filter by Due Date"
            >
              <FaCalendarAlt />
            </button>

            {dateDropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 4px)',
                  right: 0,
                  zIndex: 999,
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.12)',
                  padding: '0.45rem',
                  minWidth: '150px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.15rem',
                }}
              >
                {[
                  { key: 'all', label: 'All Dates' },
                  { key: 'today', label: 'Due Today' },
                  { key: 'this_week', label: 'Due This Week' },
                  { key: 'overdue', label: 'Overdue' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      onDateFilterChange(item.key)
                      setDateDropdownOpen(false)
                    }}
                    style={{
                      padding: '0.4rem 0.65rem',
                      borderRadius: '6px',
                      background: dateFilterPreset === item.key ? '#eff6ff' : 'transparent',
                      color: dateFilterPreset === item.key ? '#1d4ed8' : '#334155',
                      border: 'none',
                      fontSize: '0.78rem',
                      fontWeight: dateFilterPreset === item.key ? '700' : '500',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Primary + Add Task Button */}
          <button
            type="button"
            onClick={onAddTask}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.52rem 1.15rem',
              borderRadius: '10px',
              background: '#c60016',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(198, 0, 22, 0.35)',
              transition: 'background 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#a80012'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#c60016'
            }}
          >
            <FaPlus style={{ fontSize: '0.75rem' }} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Sub Header Bar: View Selector (List / Kanban / Calendar) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '0.25rem',
        }}
      >
        {/* Left View Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          {[
            { key: 'list', label: 'List', icon: <FaList /> },
            { key: 'kanban', label: 'Kanban', icon: <FaColumns /> },
            { key: 'calendar', label: 'Calendar', icon: <FaCalendarAlt /> },
          ].map((tab) => {
            const isActive = activeView === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => onViewChange(tab.key)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  padding: '0.45rem 0.2rem 0.65rem 0.2rem',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2.5px solid #c60016' : '2.5px solid transparent',
                  color: isActive ? '#0f172a' : '#64748b',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? '800' : '600',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  outline: 'none',
                  marginBottom: '-1px',
                }}
              >
                <span style={{ fontSize: '0.8rem', color: isActive ? '#c60016' : '#94a3b8' }}>
                  {tab.icon}
                </span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default TaskHeaderToolbar
