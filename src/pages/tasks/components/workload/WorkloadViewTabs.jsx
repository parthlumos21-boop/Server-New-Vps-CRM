import React, { useState } from 'react'
import {
  FaChartPie,
  FaListUl,
  FaColumns,
  FaCalendarAlt,
} from 'react-icons/fa'

export const WorkloadViewTabs = ({
  activeTab = 'overview',
  onTabChange,
  taskCounts = {},
  period = 'month',
  onPeriodChange,
  customDates = { start: '', end: '' },
  onCustomDatesChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false)

  const tabs = [
    { key: 'overview', label: 'Overview', icon: <FaChartPie /> },
    { key: 'list', label: 'List', icon: <FaListUl />, count: taskCounts.total },
    { key: 'kanban', label: 'Kanban', icon: <FaColumns />, count: taskCounts.incomplete },
    { key: 'calendar', label: 'Calendar', icon: <FaCalendarAlt /> },
  ]

  const periods = [
    { key: 'week', label: 'Week' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'today', label: 'Today' },
    { key: 'month', label: 'Month' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {/* Top Row: View Mode Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          borderBottom: '2px solid #e2e8f0',
          paddingBottom: '0px',
          width: '100%',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.55rem 1.05rem',
                background: 'none',
                border: 'none',
                borderBottom: isActive ? '3px solid #c60016' : '3px solid transparent',
                marginBottom: '-2px',
                fontSize: '0.84rem',
                fontWeight: isActive ? '800' : '600',
                color: isActive ? '#c60016' : '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '0.82rem' }}>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    padding: '0.1rem 0.45rem',
                    borderRadius: '10px',
                    backgroundColor: isActive ? '#fff1f2' : '#f1f5f9',
                    color: isActive ? '#c60016' : '#64748b',
                    border: isActive ? '1px solid #fecdd3' : '1px solid #e2e8f0',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Sub-row: Right side of the on top of KPI Cards section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          width: '100%',
          marginTop: '0.1rem',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            backgroundColor: '#f1f5f9',
            borderRadius: '10px',
            padding: '2.5px',
            border: '1px solid #cbd5e1',
          }}
        >
          {periods.map((p) => {
            const isActive = period === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => {
                  onPeriodChange(p.key)
                  if (p.key === 'custom') setShowDatePicker(true)
                  else setShowDatePicker(false)
                }}
                style={{
                  padding: '0.26rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: isActive ? '800' : '600',
                  color: isActive ? '#ffffff' : '#64748b',
                  backgroundColor: isActive ? '#c60016' : 'transparent',
                  border: 'none',
                  borderRadius: '7px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isActive ? '0 2px 6px rgba(198, 0, 22, 0.25)' : 'none',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Custom Date Range Picker (Rendered if custom is active) */}
      {(showDatePicker || period === 'custom') && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '0.65rem',
            padding: '0.45rem 0.75rem',
            backgroundColor: '#fff1f2',
            borderRadius: '8px',
            border: '1px solid #fecdd3',
            fontSize: '0.74rem',
            flexWrap: 'wrap',
          }}
        >
          <span style={{ fontWeight: '700', color: '#990011' }}>Date Range:</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>From:</span>
            <input
              type="date"
              value={customDates.start}
              onChange={(e) => onCustomDatesChange({ ...customDates, start: e.target.value })}
              style={{
                padding: '2px 6px',
                border: '1px solid #fca5a5',
                borderRadius: '4px',
                fontSize: '0.72rem',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span>To:</span>
            <input
              type="date"
              value={customDates.end}
              onChange={(e) => onCustomDatesChange({ ...customDates, end: e.target.value })}
              style={{
                padding: '2px 6px',
                border: '1px solid #fca5a5',
                borderRadius: '4px',
                fontSize: '0.72rem',
                backgroundColor: '#ffffff',
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default WorkloadViewTabs
