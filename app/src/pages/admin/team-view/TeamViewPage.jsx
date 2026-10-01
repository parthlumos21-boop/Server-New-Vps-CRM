import React, { useEffect, useMemo, useState } from 'react'
import {
  FaCheckCircle,
  FaHistory,
  FaListAlt,
  FaRegClock,
  FaSignInAlt,
  FaSyncAlt,
  FaTimesCircle,
  FaTh,
  FaUserCheck,
  FaUserClock,
  FaUserTimes,
  FaExpandAlt,
  FaCompressAlt,
  FaCogs,
  FaChartLine,
} from 'react-icons/fa'
import { FiChevronDown, FiChevronRight } from 'react-icons/fi'
import { ExcelExportActionButton } from '../../../components/common/ExcelExportButton'
import { authService } from '../../../services/authService'
import { enrichUsersForTeamView, getAttendanceRows, getTeamViewGroups, getTeamViewTypes } from '../../../features/adminTeamView/teamViewData'
import { exportExcelWorkbook } from '../../../utils/excelExport'
import './TeamViewPage.css'

const TOP_TABS = [
  { key: 'team-view', label: 'Team View' },
  { key: 'user-group', label: 'User Group' },
  { key: 'user-type', label: 'User Type' },
  { key: 'users', label: 'Users' },
  { key: 'attendance', label: 'Attendance' },
]

const USER_TOP_TABS = TOP_TABS.filter((tab) => ['team-view', 'users'].includes(tab.key))

const INNER_TREE_TABS = [
  { key: 'group', label: 'User Group-wise' },
  { key: 'type', label: 'User Type-wise' },
]

const VIEW_MODES = ['Users', 'User Groups']
const REPORT_MODES = ['Month Wise', 'Day Wise']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const YEARS = ['2024', '2025', '2026', '2027']

const isAdminTeamUser = (user = {}) => {
  const role = String(user.role || '').trim().toLowerCase()
  const userType = String(user.userType || '').trim().toLowerCase()
  const name = String(user.name || '').trim().toLowerCase()

  return role === 'admin' || userType === 'admin' || name === 'system administrator'
}

const TeamViewPage = ({ isAdminView = true }) => {
  const [activeTopTab, setActiveTopTab] = useState('team-view')
  const [activeTreeTab, setActiveTreeTab] = useState('group')
  const [expandedGroupIds, setExpandedGroupIds] = useState(() => new Set(['ahmedabad']))
  const [expandedTypeIds, setExpandedTypeIds] = useState(() => new Set(['admin']))

  // Filters & State
  const [selectedGroup, setSelectedGroup] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedUser, setSelectedUser] = useState('')

  // User Group Dashboard State
  const [ugActiveView, setUgActiveView] = useState('summary')
  const [ugLoginPeriod, setUgLoginPeriod] = useState('this-month')
  const [ugLoginDropOpen, setUgLoginDropOpen] = useState(false)
  const [ugIdleTab, setUgIdleTab] = useState('10min')
  const [collapsedWidgets, setCollapsedWidgets] = useState(new Set())

  // Attendance State
  const [selectedAttendanceView, setSelectedAttendanceView] = useState('Users')
  const [selectedReportMode, setSelectedReportMode] = useState('Month Wise')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedMonth, setSelectedMonth] = useState('May')
  const [isAttendanceVisible, setIsAttendanceVisible] = useState(false)

  const topTabs = isAdminView ? TOP_TABS : USER_TOP_TABS
  const innerTreeTabs = isAdminView ? INNER_TREE_TABS : INNER_TREE_TABS.filter((tab) => tab.key === 'group')

  const baseAvailableUsers = useMemo(
    () => authService.getAvailableUsers().filter((user) => user.name !== 'System Administrator'),
    []
  )

  const availableUsers = useMemo(() => {
    if (isAdminView) {
      return baseAvailableUsers
    }

    return enrichUsersForTeamView(baseAvailableUsers).filter((user) => !isAdminTeamUser(user))
  }, [baseAvailableUsers, isAdminView])

  const teamUsers = useMemo(() => enrichUsersForTeamView(availableUsers), [availableUsers])
  const teamGroups = useMemo(
    () => getTeamViewGroups(availableUsers).filter((group) => isAdminView || group.users.length > 0),
    [availableUsers, isAdminView]
  )
  const teamTypes = useMemo(
    () => getTeamViewTypes(availableUsers).filter((type) => isAdminView || (type.id !== 'admin' && type.users.length > 0)),
    [availableUsers, isAdminView]
  )
  const attendanceRows = useMemo(
    () => (activeTopTab === 'attendance' ? getAttendanceRows(availableUsers, selectedReportMode, selectedYear, selectedMonth) : []),
    [availableUsers, selectedMonth, selectedReportMode, selectedYear]
  )

  const attendanceStats = useMemo(() => ({ present: 12, absent: 2, late: 1, halfDay: 0, leave: 1 }), [])

  const now = new Date()
  const todayStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })

  useEffect(() => {
    if (!topTabs.some((tab) => tab.key === activeTopTab)) {
      setActiveTopTab(topTabs[0]?.key || 'team-view')
    }
  }, [activeTopTab, topTabs])

  useEffect(() => {
    if (!innerTreeTabs.some((tab) => tab.key === activeTreeTab)) {
      setActiveTreeTab(innerTreeTabs[0]?.key || 'group')
    }
  }, [activeTreeTab, innerTreeTabs])

  const groupUsers = useMemo(() => {
    if (!selectedGroup) return []
    return teamUsers.filter((user) => user.userGroup === selectedGroup)
  }, [selectedGroup, teamUsers])

  const loggedInTodayUsers = useMemo(() => (
    groupUsers.filter((u) => u.attendanceStatus === 'Present')
      .map((u) => ({
        loginName: u.name,
        userGroup: u.userGroup,
        userType: u.userType,
        loginTime: u.punchIn,
        logoutTime: u.punchOut !== '-' ? u.punchOut : '',
        device: 'Desktop',
      }))
  ), [groupUsers])

  const activeUsers = useMemo(() => (
    groupUsers.filter((u) => u.attendanceStatus === 'Present' && u.punchOut === '-')
  ), [groupUsers])

  const idleUsers10 = useMemo(() => [], [])
  const idleUsers30 = useMemo(() => [], [])
  const idleUsers60 = useMemo(() => [], [])
  const notLoggedInUsers = useMemo(() => (
    groupUsers.filter((u) => u.attendanceStatus !== 'Present')
  ), [groupUsers])

  const groupSummary = useMemo(() => {
    if (!selectedGroup) return null
    const accounts = {
      total: 133, byStatus: [
        ['New', 53], ['Follow-up', 2], ['Technical Offer', 5],
        ['Priority 1', 2], ['Commercial Offer', 12], ['Priority 2', 2],
        ['Quotation Sent', 15], ['Quote Revision', 1], ['Order Received', 0],
        ['Convert To PO', 1], ['Order Lost', 18], ['Converted', 0],
        ['Rejected', 15], ['Contracted', 1], ['Closed', 6],
      ]
    }
    const customers = {
      total: 361, byStatus: [
        ['New', 228], ['Active', 105], ['Future Prospect', 4],
        ['Rejected', 3], ['Advance Payment Received', 0], ['Converted', 2],
        ['OLD', 4], ['Closed', 15],
      ]
    }
    const support = {
      total: 5, byStatus: [
        ['Active', 0], ['Attending', 0], ['On Site', 0],
        ['In Progress', 3], ['On Hold', 1], ['Postponed', 1],
        ['Closed', 0],
      ]
    }
    const deals = {
      total: 534, byStatus: [
        ['New', 125], ['Quotation Sent', 257], ['Quotation Revision', 8],
        ['Closed-Won', 34], ['Closed-Lost', 110],
      ]
    }
    return { accounts, customers, support, deals }
  }, [selectedGroup])

  const userSummary = useMemo(() => {
    if (!selectedUser) return null
    const accounts = { total: 10, byStatus: [['New', 5], ['Follow-up', 5]] }
    const customers = { total: 20, byStatus: [['Active', 15], ['New', 5]] }
    const support = { total: 2, byStatus: [['In Progress', 2]] }
    const deals = { total: 5, byStatus: [['New', 5]] }
    return { accounts, customers, support, deals }
  }, [selectedUser])

  const typeSummary = useMemo(() => {
    if (!selectedType) return null
    const accounts = { total: 200, byStatus: [['New', 100], ['Closed', 100]] }
    const customers = { total: 500, byStatus: [['Active', 400], ['OLD', 100]] }
    const support = { total: 10, byStatus: [['Closed', 10]] }
    const deals = {
      total: 100, byStatus: [
        ['New', 125], ['Quotation Sent', 257], ['Quotation Revision', 8],
        ['Closed-Won', 34], ['Closed-Lost', 110],
      ]
    }
    return { accounts, customers, support, deals }
  }, [selectedGroup])

  const LOGIN_HISTORY_DATA = useMemo(() => {
    const days = []
    for (let d = 1; d <= 31; d++) {
      days.push({ day: d, logins: d === 1 ? groupUsers.filter((u) => u.attendanceStatus === 'Present').length : 0 })
    }
    return days
  }, [groupUsers])

  const selectedTypeUsers = selectedType
    ? teamUsers.filter((user) => user.userType === selectedType)
    : []

  const toggleWidget = (id) => {
    setCollapsedWidgets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const refreshWidget = (_label) => {
    // Placeholder: wire to the real widget refresh handler when available.
    // Intentionally a no-op so the button stays functional in the UI.
  }

  const toggleExpandedGroup = (id) => {
    setExpandedGroupIds((currentValue) => {
      const nextValue = new Set(currentValue)
      if (nextValue.has(id)) {
        nextValue.delete(id)
      } else {
        nextValue.add(id)
      }
      return nextValue
    })
  }

  const toggleExpandedType = (id) => {
    setExpandedTypeIds((currentValue) => {
      const nextValue = new Set(currentValue)
      if (nextValue.has(id)) {
        nextValue.delete(id)
      } else {
        nextValue.add(id)
      }
      return nextValue
    })
  }

  const exportAttendanceReport = () => {
    exportExcelWorkbook({
      filename: `Team_Attendance_${selectedYear}_${selectedMonth}.xlsx`,
      title: 'Team Attendance Report',
      subtitle: `${selectedMonth} ${selectedYear}`,
      sheetName: 'Attendance',
      metadata: [
        { label: 'Year', value: String(selectedYear) },
        { label: 'Month', value: String(selectedMonth) },
        { label: 'Total Records', value: String(attendanceRows.length) },
        { label: 'Generated On', value: new Date().toLocaleString('en-IN') },
      ],
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'userType', label: 'User Type' },
        { key: 'userGroup', label: 'User Group' },
        { key: 'mode', label: 'Mode' },
        { key: 'year', label: 'Year', align: 'center' },
        { key: 'month', label: 'Month', align: 'center' },
        { key: 'punchIn', label: 'Punch In', align: 'center' },
        { key: 'punchOut', label: 'Punch Out', align: 'center' },
        { key: 'status', label: 'Status', align: 'center' },
      ],
      rows: attendanceRows,
    })
  }

  return (
    <div className="team-view-page">
      <section className="team-view-shell">
        <header className="team-view-header">
          <h1>Team View</h1>
        </header>

        <div className={`team-view-top-tabs${isAdminView ? '' : ' team-view-top-tabs--user'}`} role="tablist" aria-label="Team view sections">
          {topTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTopTab === tab.key}
              className={`team-view-top-tab ${activeTopTab === tab.key ? 'team-view-top-tab-active' : ''}`}
              onClick={() => setActiveTopTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="team-view-body">
          {activeTopTab === 'team-view' ? (
            <div className="team-view-panel">
              <div className="team-view-inner-tabs">
                {innerTreeTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={`team-view-inner-tab ${activeTreeTab === tab.key ? 'team-view-inner-tab-active' : ''}`}
                    onClick={() => setActiveTreeTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="team-view-tree-shell">
                <div className="team-view-company-pill">Swati Switchgears India Pvt Ltd</div>

                {(activeTreeTab === 'group' ? teamGroups : teamTypes).map((entry) => {
                  const isExpanded = activeTreeTab === 'group'
                    ? expandedGroupIds.has(entry.id)
                    : expandedTypeIds.has(entry.id)

                  return (
                    <div key={entry.id} className="team-view-tree-node">
                      <button
                        type="button"
                        className="team-view-tree-trigger"
                        onClick={() => {
                          if (activeTreeTab === 'group') {
                            toggleExpandedGroup(entry.id)
                          } else {
                            toggleExpandedType(entry.id)
                          }
                        }}
                      >
                        <span className="team-view-tree-chevron">
                          {isExpanded ? <FiChevronDown /> : <FiChevronRight />}
                        </span>
                        <span className="team-view-tree-node-pill">{entry.label}</span>
                      </button>

                      {isExpanded ? (
                        <div className="team-view-tree-children">
                          {entry.users.map((user) => (
                            <div key={user.id} className="team-view-tree-user">
                              {user.name}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : null}

          {activeTopTab === 'user-group' ? (
            <div className="team-view-select-panel">
              <div className="team-view-select-row">
                <label htmlFor="team-view-user-group">Select User Group:</label>
                <select
                  id="team-view-user-group"
                  value={selectedGroup}
                  onChange={(event) => setSelectedGroup(event.target.value)}
                >
                  <option value="">Select</option>
                  {teamGroups.map((group) => (
                    <option key={group.id} value={group.label}>
                      {group.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* ── UG action buttons ── */}
              <div className="ug-action-bar">
                <div className="ug-action-row ug-action-row--top">
                  <button type="button" className={`ug-btn${ugActiveView === 'summary' ? ' ug-btn--active' : ''}`} onClick={() => setUgActiveView('summary')}>
                    <FaListAlt /> Summary
                  </button>
                  <button type="button" className={`ug-btn${ugActiveView === 'login-history' ? ' ug-btn--active' : ''}`} onClick={() => setUgActiveView('login-history')}>
                    <FaHistory /> Login History
                  </button>
                  <button type="button" className={`ug-btn${ugActiveView === 'logged-in-today' ? ' ug-btn--active' : ''}`} onClick={() => setUgActiveView('logged-in-today')}>
                    <FaSignInAlt /> Logged In Today
                  </button>
                  <button type="button" className={`ug-btn${ugActiveView === 'active-users' ? ' ug-btn--active' : ''}`} onClick={() => setUgActiveView('active-users')}>
                    <FaUserCheck /> Active Users
                  </button>
                </div>
                <div className="ug-action-row ug-action-row--bottom">
                  <button type="button" className={`ug-btn${ugActiveView === 'idle-users' ? ' ug-btn--active' : ''}`} onClick={() => setUgActiveView('idle-users')}>
                    <FaUserClock /> Idle Users
                  </button>
                </div>
              </div>

              {/* ── UG sub-panels ── */}
              {ugActiveView === 'summary' && groupSummary ? (
                <div className="ug-panel">
                  <h3 className="ug-panel-title">Summary</h3>
                  {[
                    { label: 'Total Accounts', total: groupSummary.accounts.total, items: groupSummary.accounts.byStatus },
                    { label: 'Total Customers', total: groupSummary.customers.total, items: groupSummary.customers.byStatus },
                    { label: 'Total Support Requests', total: groupSummary.support.total, items: groupSummary.support.byStatus },
                    { label: 'Total Deals', total: groupSummary.deals.total, items: groupSummary.deals.byStatus },
                  ].map((section) => (
                    <div key={section.label} className="ug-summary-section">
                      <div className="ug-summary-section-head">
                        <strong>{section.label}: {section.total}</strong>
                        <div className="ug-summary-section-actions">
                          <button type="button" onClick={() => toggleWidget(section.label)} title={collapsedWidgets.has(section.label) ? 'Expand' : 'Collapse'}>
                            {collapsedWidgets.has(section.label) ? <FaExpandAlt /> : <FaCompressAlt />}
                          </button>
                          <button type="button" onClick={() => refreshWidget(section.label)} title="Refresh"><FaSyncAlt /></button>
                        </div>
                      </div>
                      {!collapsedWidgets.has(section.label) && (
                        <div className="ug-summary-items">
                          {section.items.map(([name, count]) => (
                            <div key={name} className="ug-summary-item">
                              <span className="ug-summary-item-label">{name}</span>
                              <span className={`ug-summary-item-count${name === 'Closed' || name === 'Rejected' || name === 'Order Lost' ? ' ug-summary-item-count--red' : ''}`}>:{count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}

              {ugActiveView === 'summary' && !groupSummary ? (
                <div className="ug-panel ug-panel--empty">Select a user group to view summary.</div>
              ) : null}

              {ugActiveView === 'login-history' ? (
                <div className="ug-panel">
                  <div className="ug-login-history-header">
                    <span className="ug-login-history-title"><FaHistory /> Login History</span>
                    <div className="ug-login-period-wrap">
                      <button
                        type="button"
                        className="ug-login-period-btn"
                        onClick={() => setUgLoginDropOpen((prev) => !prev)}
                      >
                        {ugLoginPeriod === 'this-month' ? 'This Month' : 'Last Month'}
                        <span className="ug-login-period-caret">▼</span>
                      </button>
                      {ugLoginDropOpen ? (
                        <div className="ug-login-period-drop">
                          <button type="button" className="ug-login-period-opt" onClick={() => { setUgLoginPeriod('this-month'); setUgLoginDropOpen(false) }}>
                            <span className="ug-login-period-dot ug-login-period-dot--orange" /> This Month
                          </button>
                          <button type="button" className="ug-login-period-opt" onClick={() => { setUgLoginPeriod('last-month'); setUgLoginDropOpen(false) }}>
                            <span className="ug-login-period-dot ug-login-period-dot--green" /> Last Month
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                  {!selectedGroup ? (
                    <p className="ug-info">Select a user group to view login history.</p>
                  ) : (
                    <div className="ug-login-chart-wrap">
                      <div className="ug-login-chart-axis-y">
                        {[...Array(6)].map((_, i) => (
                          <span key={i}>{(5 - i) * 0.5}</span>
                        ))}
                      </div>
                      <div className="ug-login-chart">
                        {LOGIN_HISTORY_DATA.map((pt) => (
                          <div key={pt.day} className="ug-login-chart-col">
                            <div
                              className="ug-login-chart-bar"
                              style={{ height: `${Math.min(pt.logins / 2.5, 1) * 100}%` }}
                              title={`Day ${pt.day}: ${pt.logins} logins`}
                            />
                            {pt.day % 2 === 0 ? <span className="ug-login-chart-label">{pt.day}</span> : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : null}

              {ugActiveView === 'logged-in-today' ? (
                <div className="ug-panel">
                  <div className="ug-panel-titlebar">
                    <h3 className="ug-panel-title">Logged In Today</h3>
                    <button type="button" className="ug-refresh-btn" title="Refresh"><FaSyncAlt /></button>
                  </div>
                  {!selectedGroup ? (
                    <p className="ug-info">Select a user group to view logins.</p>
                  ) : (
                    <>
                      <div className="ug-table-controls">
                        <label>
                          <select className="ug-per-page-select" defaultValue="10">
                            {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
                          </select>
                          {' '}records per page
                        </label>
                        <label className="ug-search-wrap">
                          Search: <input type="text" className="ug-search-input" />
                        </label>
                      </div>
                      <table className="ug-table">
                        <thead>
                          <tr>
                            {['Login Name', 'User Group', 'User Type', 'Login Time', 'Logout Time', 'Device'].map((h) => (
                              <th key={h}>⇅ {h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {loggedInTodayUsers.length === 0 ? (
                            <tr><td colSpan={6} className="ug-table-empty">No users logged in today.</td></tr>
                          ) : (
                            loggedInTodayUsers.map((u, idx) => (
                              <tr key={idx}>
                                <td>{u.loginName}</td>
                                <td>{u.userGroup}</td>
                                <td>{u.userType}</td>
                                <td>{u.loginTime}</td>
                                <td>{u.logoutTime}</td>
                                <td>{u.device}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                      <div className="ug-table-footer">
                        <span>Showing 1 to {loggedInTodayUsers.length} of {loggedInTodayUsers.length} entries</span>
                        <div className="ug-pagination">
                          <button type="button" disabled>← Previous</button>
                          <button type="button" className="ug-page-active">1</button>
                          <button type="button" disabled>Next →</button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ) : null}

              {ugActiveView === 'active-users' ? (
                <div className="ug-panel">
                  <div className="ug-panel-titlebar">
                    <h3 className="ug-panel-title">Active Users ({activeUsers.length})</h3>
                    <button type="button" className="ug-refresh-btn" title="Refresh"><FaSyncAlt /></button>
                  </div>
                  {!selectedGroup ? (
                    <p className="ug-info">Select a user group to view active users.</p>
                  ) : activeUsers.length === 0 ? (
                    <div className="ug-alert ug-alert--danger">No active users found.</div>
                  ) : (
                    <div className="ug-active-users-grid">
                      {activeUsers.map((u) => (
                        <div key={u.id} className="ug-active-user-card">
                          <strong>{u.name}</strong>
                          <span>{u.userType}</span>
                          <span className="ug-active-badge"><FaCheckCircle /> Online</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {ugActiveView === 'idle-users' ? (
                <div className="ug-panel">
                  <p className="ug-info-blue"><FaRegClock style={{ marginRight: '0.3rem' }} />Mobile App logins are not included in idle users listing.</p>
                  <div className="ug-panel-titlebar">
                    <h3 className="ug-panel-title">Idle Users</h3>
                    <button type="button" className="ug-refresh-btn" title="Refresh"><FaSyncAlt /></button>
                  </div>
                  <div className="ug-idle-tabs">
                    {[
                      { key: '10min', label: '10+ Min', count: idleUsers10.length },
                      { key: '30min', label: '30+ Min', count: idleUsers30.length },
                      { key: '1hr', label: '1+ Hour', count: idleUsers60.length },
                      { key: 'notlogged', label: 'Not Logged-In Today', count: notLoggedInUsers.length },
                    ].map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        className={`ug-idle-tab${ugIdleTab === t.key ? ' ug-idle-tab--active' : ''}`}
                        onClick={() => setUgIdleTab(t.key)}
                      >
                        {t.label} <span className="ug-idle-tab-count">[{t.count}]</span>
                      </button>
                    ))}
                  </div>
                  <div className="ug-idle-body">
                    {ugIdleTab === '10min' && idleUsers10.length === 0 && (
                      <p className="ug-info-blue"><FaRegClock style={{ marginRight: '0.3rem' }} />No users found idle for 10+ mins.</p>
                    )}
                    {ugIdleTab === '30min' && idleUsers30.length === 0 && (
                      <p className="ug-info-blue"><FaRegClock style={{ marginRight: '0.3rem' }} />No users found idle for 30+ mins.</p>
                    )}
                    {ugIdleTab === '1hr' && idleUsers60.length === 0 && (
                      <p className="ug-info-blue"><FaRegClock style={{ marginRight: '0.3rem' }} />No users found idle for 1+ hour.</p>
                    )}
                    {ugIdleTab === 'notlogged' && (
                      notLoggedInUsers.length === 0
                        ? <p className="ug-info-blue"><FaUserCheck style={{ marginRight: '0.3rem' }} />All users have logged in today.</p>
                        : <div className="ug-idle-user-list">
                          {notLoggedInUsers.map((u) => (
                            <div key={u.id} className="ug-idle-user-row">
                              <span><FaUserTimes className="ug-idle-user-icon" /> {u.name}</span>
                              <span className="ug-idle-user-meta">{u.userType} - {u.userGroup}</span>
                            </div>
                          ))}
                        </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTopTab === 'user-type' ? (
            <div className="team-view-select-panel">
              <div className="team-view-select-row">
                <label htmlFor="team-view-user-type">Select User Type:</label>
                <select
                  id="team-view-user-type"
                  value={selectedType}
                  onChange={(event) => setSelectedType(event.target.value)}
                >
                  <option value="">Select</option>
                  {teamTypes.map((type) => (
                    <option key={type.id} value={type.label}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedType && typeSummary ? (
                <div className="ug-panel">
                  <h3 className="ug-panel-title">Summary for {selectedType}</h3>
                  {[
                    { label: 'Total Accounts', total: typeSummary.accounts.total, items: typeSummary.accounts.byStatus },
                    { label: 'Total Customers', total: typeSummary.customers.total, items: typeSummary.customers.byStatus },
                    { label: 'Total Support Requests', total: typeSummary.support.total, items: typeSummary.support.byStatus },
                    { label: 'Total Deals', total: typeSummary.deals.total, items: typeSummary.deals.byStatus },
                  ].map((section) => (
                    <div key={section.label} className="ug-summary-section">
                      <div className="ug-summary-section-head">
                        <strong>{section.label}: {section.total}</strong>
                      </div>
                      <div className="ug-summary-items">
                        {section.items.map(([name, count]) => (
                          <div key={name} className="ug-summary-item">
                            <span className="ug-summary-item-label">{name}</span>
                            <span className="ug-summary-item-count">:{count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {activeTopTab === 'users' ? (
            <div className="team-view-select-panel">
              <div className="team-view-select-row">
                <label htmlFor="team-view-individual-user">Select User:</label>
                <select
                  id="team-view-individual-user"
                  value={selectedUser}
                  onChange={(event) => setSelectedUser(event.target.value)}
                >
                  <option value="">Select</option>
                  {teamUsers.map((u) => (
                    <option key={u.id} value={u.name}>{u.name}</option>
                  ))}
                </select>
              </div>

              {selectedUser && userSummary ? (
                <div className="ug-panel">
                  <h3 className="ug-panel-title">User Summary: {selectedUser}</h3>
                  <div className="ug-summary-items">
                    <div className="ug-summary-item"><strong>Accounts:</strong> {userSummary.accounts.total}</div>
                    <div className="ug-summary-item"><strong>Customers:</strong> {userSummary.customers.total}</div>
                    <div className="ug-summary-item"><strong>Support:</strong> {userSummary.support.total}</div>
                    <div className="ug-summary-item"><strong>Deals:</strong> {userSummary.deals.total}</div>
                  </div>
                </div>
              ) : null}

              <div className="team-view-users-panel" style={{ marginTop: '1.5rem' }}>
                <table className="team-view-users-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>User Group</th>
                      <th>User Type</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamUsers.map((user) => (
                      <tr key={user.id} onClick={() => setSelectedUser(user.name)} style={{ cursor: 'pointer' }}>
                        <td>{user.name}</td>
                        <td>{user.userGroup}</td>
                        <td>{user.userType}</td>
                        <td>{user.attendanceStatus}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {activeTopTab === 'attendance' ? (
            <div className="team-view-attendance-panel">
              <div className="attendance-stats-strip">
                <div className="attendance-stat-box attendance-stat-box--present">
                  <FaUserCheck className="attendance-stat-icon" />
                  <div className="attendance-stat-main">
                    <strong>{attendanceStats.present}</strong>
                    <span>Present</span>
                  </div>
                </div>
                <div className="attendance-stat-box attendance-stat-box--absent">
                  <FaUserTimes className="attendance-stat-icon" />
                  <div className="attendance-stat-main">
                    <strong>{attendanceStats.absent}</strong>
                    <span>Absent</span>
                  </div>
                </div>
                <div className="attendance-stat-box attendance-stat-box--late">
                  <FaUserClock className="attendance-stat-icon" />
                  <div className="attendance-stat-main">
                    <strong>{attendanceStats.late}</strong>
                    <span>Late</span>
                  </div>
                </div>
                <div className="attendance-stat-box attendance-stat-box--half">
                  <FaRegClock className="attendance-stat-icon" />
                  <div className="attendance-stat-main">
                    <strong>{attendanceStats.halfDay}</strong>
                    <span>Half Day</span>
                  </div>
                </div>
                <div className="attendance-stat-box attendance-stat-box--leave">
                  <FaListAlt className="attendance-stat-icon" />
                  <div className="attendance-stat-main">
                    <strong>{attendanceStats.leave}</strong>
                    <span>Leave</span>
                  </div>
                </div>
              </div>

              <div className="team-view-attendance-report-box">
                <h2><FaRegClock /> Punch In - Punch Out Report</h2>

                <div className="team-view-attendance-controls">
                  <span>In</span>
                  <select value={selectedAttendanceView} onChange={(event) => setSelectedAttendanceView(event.target.value)}>
                    {VIEW_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>

                  <span>Get</span>
                  <select value={selectedReportMode} onChange={(event) => setSelectedReportMode(event.target.value)}>
                    {REPORT_MODES.map((mode) => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>

                  <span>for the Year</span>
                  <select value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)}>
                    {YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>

                  <span>Month</span>
                  <select value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)}>
                    {MONTHS.map((month) => (
                      <option key={month} value={month}>{month}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className="team-view-attendance-view-btn"
                    onClick={() => setIsAttendanceVisible(true)}
                  >
                    View Report
                  </button>

                  <ExcelExportActionButton
                    label="Export"
                    title="Export attendance report"
                    className="team-view-attendance-export-btn"
                    onClick={exportAttendanceReport}
                  />
                </div>

                {isAttendanceVisible ? (
                  <div className="team-view-attendance-table-wrap">
                    <table className="team-view-attendance-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>User Type</th>
                          <th>User Group</th>
                          <th>Mode</th>
                          <th>Year</th>
                          <th>Month</th>
                          <th>Punch In</th>
                          <th>Punch Out</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.name}</td>
                            <td>{row.userType}</td>
                            <td>{row.userGroup}</td>
                            <td>{selectedAttendanceView}</td>
                            <td>{row.year}</td>
                            <td>{row.month}</td>
                            <td>{row.punchIn}</td>
                            <td>{row.punchOut}</td>
                            <td>{row.status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

export default TeamViewPage
