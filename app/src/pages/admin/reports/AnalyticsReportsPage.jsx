import React, { useEffect, useRef, useState } from 'react'
import { FaCalendarAlt, FaCaretDown, FaClock, FaCog, FaFilter, FaTrash } from 'react-icons/fa'
import { useAuth } from '../../../context/AuthContext'
import './AnalyticsReportsPage.css'

const LEFT_FILTERS = ['Accounts', 'Deals']
const NEW_REPORT_OPTIONS = ['Account', 'Deal']

const ANALYTICS_DATA = {
  Accounts: [
    {
      id: 'analytics-accounts-1',
      title: 'ANALYTICS',
      filters: '[New, Order Received, Convert To PO, Converted]',
      timeFilter: 'Last Month',
      createdBy: 'Keval V Shah',
      createdOn: '19-05-2023 09:55:48',
    },
  ],
  Deals: [],
}

const AnalyticsCard = ({ report }) => (
  <div className="ar-card">
    <div className="ar-card-accent" />
    <div className="ar-card-main">
      <div className="ar-card-header">
        <span className="ar-card-title">{report.title}</span>
        <div className="ar-card-actions">
          <button type="button" className="ar-action-btn ar-action-btn--green" title="Settings">
            <FaCog />
          </button>
          <span className="ar-action-sep">|</span>
          <button type="button" className="ar-action-btn ar-action-btn--red" title="Delete">
            <FaTrash />
          </button>
        </div>
      </div>

      <div className="ar-card-body">
        <div className="ar-card-left">
          <div className="ar-card-row">
            <FaFilter className="ar-row-icon" />
            <span><strong>Filters-</strong> {report.filters}</span>
          </div>
          <div className="ar-card-row">
            <FaClock className="ar-row-icon" />
            <span><strong>Time Filter-</strong> {report.timeFilter}</span>
          </div>
        </div>
        <div className="ar-card-right">
          <div className="ar-card-row">
            <FaCalendarAlt className="ar-row-icon" />
            <span>
              <strong>Created By-</strong> {report.createdBy}&nbsp;
              <strong>On-</strong> {report.createdOn}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
)

const AnalyticsReportsPage = () => {
  const { user } = useAuth()
  const [activeFilter, setActiveFilter] = useState('Accounts')
  const [caretOpen, setCaretOpen] = useState(false)
  const splitBtnRef = useRef(null)

  useEffect(() => {
    const handleOutside = (e) => {
      if (splitBtnRef.current && !splitBtnRef.current.contains(e.target)) {
        setCaretOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  const visibleReports = ANALYTICS_DATA[activeFilter] || []

  return (
    <div className="ar-page">

      {/* ── Top bar ───────────────────────────────────────── */}
      <div className="ar-topbar">
        <h1 className="ar-topbar-title">Analytics Reports</h1>
        <div className="ar-split-btn" ref={splitBtnRef}>
          <button type="button" className="ar-btn ar-btn--blue">New Report</button>
          <button
            type="button"
            className="ar-btn ar-btn--blue ar-split-caret"
            onClick={() => setCaretOpen((v) => !v)}
          >
            <FaCaretDown />
          </button>
          {caretOpen && (
            <div className="ar-dropdown">
              {NEW_REPORT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="ar-dropdown-item"
                  onClick={() => setCaretOpen(false)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ──────────────────────────────────────────── */}
      <div className="ar-body">

        {/* Left filter panel */}
        <aside className="ar-filter-panel">
          {LEFT_FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`ar-filter-item${activeFilter === f ? ' ar-filter-item--active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </aside>

        {/* Right content */}
        <main className="ar-main">
          <div className="ar-content-panel">
            {visibleReports.length > 0 ? (
              visibleReports.map((report) => (
                <AnalyticsCard key={report.id} report={report} />
              ))
            ) : (
              <p className="ar-empty">No analytics reports available for {activeFilter}.</p>
            )}
          </div>
        </main>

      </div>
    </div>
  )
}

export default AnalyticsReportsPage
