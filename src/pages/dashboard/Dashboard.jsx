import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUsers,
  FaBriefcase,
  FaRupeeSign,
  FaTasks,
  FaArrowUp,
  FaArrowDown,
  FaEllipsisV,
  FaCircle,
  FaUserFriends,
  FaFileAlt,
  FaCalendarAlt,
  FaClock,
  FaClipboardList,
  FaCogs,
  FaEnvelope,
  FaHeadset,
  FaArrowRight,
  FaChevronDown,
  FaComments,
} from 'react-icons/fa'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers'
import { remarkApi } from '../../services/remarkApi'
import { filterCommunicationActivitiesForUser } from '../../utils/communicationActivityAccess'
import './Dashboard.css'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const buildMonthlyTrend = (deals) => {
  const now = new Date()
  const points = []
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`
    const matching = deals.filter((deal) => {
      if (!deal.createdAt) return false
      const created = new Date(deal.createdAt)
      return `${created.getFullYear()}-${created.getMonth()}` === monthKey
    })
    points.push({
      name: MONTHS[date.getMonth()],
      revenue: matching.reduce((sum, deal) => sum + (deal.value || 0), 0),
      deals: matching.length,
    })
  }
  return points
}

const PIE_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#d32f2f', '#0288d1']
const CHART_GRID_STROKE = 'var(--chart-grid-stroke, #eef0f3)'
const CHART_AXIS_STROKE = 'var(--chart-axis-stroke, #90a4ae)'
const CHART_TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid var(--chart-tooltip-border, #e0e0e0)',
  background: 'var(--chart-tooltip-bg, #ffffff)',
  color: 'var(--chart-tooltip-text, #1f2d3d)',
  boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
  fontSize: 12,
}

const Dashboard = () => {
  const navigate = useNavigate()
  const { accounts, deals, tasks, reminders = [] } = useData()
  const { user } = useAuth()
  const [communicationRemarks, setCommunicationRemarks] = useState([])

  useEffect(() => {
    let mounted = true
    remarkApi.getAllRemarks({ limit: 10 }).then((res) => {
      if (mounted && Array.isArray(res)) {
        setCommunicationRemarks(filterCommunicationActivitiesForUser(res, user).slice(0, 10))
      }
    }).catch(() => {})
    return () => { mounted = false }
  }, [user])

  const stats = useMemo(() => ({
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a) => a.status === 'active').length,
    totalDeals: deals.length,
    activeDeals: deals.filter((d) => !['won', 'lost'].includes(d.status)).length,
    wonDeals: deals.filter((d) => d.status === 'won').length,
    dealValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
    wonValue: deals.filter((d) => d.status === 'won').reduce((sum, d) => sum + (d.value || 0), 0),
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => {
      const s = String(t.status || t.taskStatus || 'pending').toLowerCase()
      return s !== 'completed' && s !== 'closed' && s !== 'done'
    }).length,
    completedTasks: tasks.filter((t) => {
      const s = String(t.status || t.taskStatus || '').toLowerCase()
      return s === 'completed' || s === 'done'
    }).length,
  }), [accounts, deals, tasks])

  const trendData = useMemo(() => buildMonthlyTrend(deals), [deals])

  const pipelineData = useMemo(() => {
    const counts = deals.reduce((acc, deal) => {
      const key = deal.status || 'unknown'
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }))
  }, [deals])

  const recentAccounts = useMemo(() => (
    [...accounts]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  ), [accounts])

  const recentDeals = useMemo(() => (
    [...deals]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
  ), [deals])

  const upcomingTasks = useMemo(() => (
    [...tasks]
      .filter((t) => {
        const s = String(t.status || t.taskStatus || 'pending').toLowerCase()
        return s !== 'completed' && s !== 'closed' && s !== 'done'
      })
      .sort((a, b) => new Date(a.dueDate || a.createdAt) - new Date(b.dueDate || b.createdAt))
      .slice(0, 5)
  ), [tasks])

  const userIdentity = useMemo(() => [
    user?.id,
    user?.name,
    user?.username,
    user?.email,
  ].filter(Boolean).map((v) => String(v).trim().toLowerCase()), [user])

  const todoItems = useMemo(() => {
    const matchesUser = (target) => {
      if (!target) return false
      const norm = String(target).trim().toLowerCase()
      return userIdentity.some((id) => id === norm || norm.includes(id))
    }

    const reminderItems = (reminders || [])
      .filter((r) => String(r.status || '').toLowerCase() !== 'closed')
      .filter((r) => matchesUser(r.assignedTo) || matchesUser(r.createdBy) || !r.assignedTo)
      .map((r) => ({
        id: `reminder-${r.id}`,
        type: r.reminderMode || 'REMINDER',
        title: r.title || r.note || r.message || 'Reminder',
        meta: r.reminderDate ? `${r.reminderDate}` : 'Today',
        raw: r,
      }))

    const taskItems = (tasks || [])
      .filter((t) => String(t.status || '').toLowerCase() === 'pending' || String(t.status || '').toLowerCase() === 'open')
      .filter((t) => matchesUser(t.assignedTo) || matchesUser(t.createdBy) || matchesUser(t.userEmail) || matchesUser(t.ownerUserId) || !t.assignedTo)
      .map((t) => ({
        id: `task-${t.id || t._id}`,
        type: t.activityType === 're-assign-account' ? 'REASSIGNMENT' : 'TASK',
        title: t.title || t.name || 'Pending Task',
        meta: t.dueDate ? `${t.dueDate}` : 'Pending',
        raw: t,
      }))

    return [...reminderItems, ...taskItems].slice(0, 10)
  }, [reminders, tasks, userIdentity])

  const conversionRate = stats.totalDeals
    ? Math.round((stats.wonDeals / stats.totalDeals) * 100)
    : 0

  const kpiCards = [
    {
      label: 'Total Accounts',
      value: stats.totalAccounts,
      sub: `${stats.activeAccounts} active`,
      trend: 12,
      icon: <FaUsers />,
      color: 'blue',
    },
    {
      label: 'Active Deals',
      value: stats.activeDeals,
      sub: `${stats.totalDeals} total`,
      trend: 8,
      icon: <FaBriefcase />,
      color: 'green',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats.dealValue),
      sub: `${formatCurrency(stats.wonValue)} won`,
      trend: 24,
      icon: <FaRupeeSign />,
      color: 'purple',
    },
    {
      label: 'Pending Tasks',
      value: stats.pendingTasks,
      sub: `${stats.completedTasks} completed`,
      trend: -5,
      icon: <FaTasks />,
      color: 'orange',
    },
  ]

  const { quotations } = useData()
  const totalQuotations = quotations?.length || 0

  return (
    <div className="md-dashboard">
      <div className="md-dashboard__topbar">
        <div className="md-topbar-left">
          <p className="md-greeting"><span className="md-greeting__dot" aria-hidden="true" />GOOD TO SEE YOU</p>
          <h1 className="md-dashboard__title">Welcome back, <span>{user?.name || 'Keval V Shah'}</span></h1>
          <p className="md-dashboard__subtitle">Your workspace is ready for the next big move.</p>
        </div>
        <div className="md-topbar-right">
          <div className="md-topbar-icons">
            <button className="md-icon-btn-round" data-count="3" onClick={() => navigate(user?.role === 'admin' ? '/admin/reminders/my' : '/reminders/my')} title="Notifications">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <button className="md-icon-btn-round">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
            <button className="md-icon-btn-round" data-count="0">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </button>
            <button className="md-icon-btn-round">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </button>
          </div>
          <div className="md-user-profile">
            <div className="md-avatar-circle">KV</div>
            <div className="md-user-info">
              <span className="md-user-name">{user?.name || 'Keval V Shah'}</span>
              <span className="md-user-role">Director</span>
            </div>
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
          <div className="md-quotes-wrapper">
            <span className="md-quote-pills">IDEAS.<br />PEOPLE.<br />PROGRESS.</span>
            <span className="md-quote-accent" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="md-kpi-grid">
        <div className="md-kpi-card">
          <div className="md-kpi-icon-box bg-red">
            <FaUsers />
          </div>
          <div className="md-kpi-content">
            <h2 className="md-kpi-value">{stats.totalAccounts}</h2>
            <p className="md-kpi-label">Accounts</p>
          </div>
          <div className="md-kpi-trend trend-up"><FaArrowUp /> 12%</div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon-box bg-blue">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div className="md-kpi-content">
            <h2 className="md-kpi-value">0</h2>
            <p className="md-kpi-label">Customer</p>
          </div>
          <div className="md-kpi-trend trend-neutral">0%</div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon-box bg-green">
            <FaBriefcase />
          </div>
          <div className="md-kpi-content">
            <h2 className="md-kpi-value">{stats.totalDeals}</h2>
            <p className="md-kpi-label">Deal</p>
          </div>
          <div className="md-kpi-trend trend-up"><FaArrowUp /> 8%</div>
        </div>
        <div className="md-kpi-card">
          <div className="md-kpi-icon-box bg-orange">
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="md-kpi-content">
            <h2 className="md-kpi-value">{totalQuotations || '-'}</h2>
            <p className="md-kpi-label">Quotation Manager</p>
          </div>
        </div>
      </div>

      <div className="md-main-grid">
        {/* Left Column */}
        <div className="md-col md-col-left">
          <div className="md-widget md-todo-widget">
            <div className="md-widget-header">
              <h3 className="md-widget-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{marginRight: 6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                To Do List
              </h3>
              <div className="md-widget-actions">
                <button className="md-link-btn">View All &rarr;</button>
                <button className="md-btn-solid-red">+ Add Task</button>
              </div>
            </div>
            <div className="md-tabs">
              <button type="button" className="md-tab md-tab-active">All ({todoItems.length})</button>
            </div>
            <ul className="md-todo-list">
              {todoItems.length === 0 ? (
                <li className="md-todo-item" style={{ justifyContent: 'center', color: 'var(--text-muted, #6b7280)', padding: '1rem' }}>
                  No pending To-Do items.
                </li>
              ) : (
                todoItems.map((item) => (
                  <li key={item.id} className="md-todo-item">
                    <div className="md-todo-icon">
                      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="md-todo-badge">{String(item.type).toUpperCase()}</div>
                    <div className="md-todo-details">
                      <span className="md-todo-title">{item.title}</span>
                      <span className="md-todo-meta">{item.meta}</span>
                    </div>
                    <div className="md-todo-actions">
                      <button type="button" className="md-btn-solid-red" onClick={() => navigate('/reminders/my')}>Active</button>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </div>

        </div>

        {/* Right Column */}
        <div className="md-col md-col-right">
          <div className="md-widget md-integrations-widget">
            <div className="md-widget-header">
              <h3 className="md-widget-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{marginRight: 6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                Integrations
              </h3>
              <button className="md-link-btn">Manage &rarr;</button>
            </div>
            <div className="md-integration-cards">
              
          </div>

          <div className="md-widget md-activity-widget">
            <div className="md-widget-header">
              <h3 className="md-widget-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{marginRight: 6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Recent Activity
              </h3>
              <button className="md-link-btn">View All &rarr;</button>
            </div>
            <ul className="md-activity-timeline">
              <li className="md-activity-item">
                <div className="md-timeline-dot active"></div>
                <span className="md-activity-badge live">LIVE</span>
                <div className="md-activity-details">
                  <span className="md-activity-title">{user?.name || 'Keval V Shah'} is online</span>
                </div>
                <span className="md-activity-time">20/09/2026, 10:58 am</span>
              </li>
              {[1, 2, 3].map((item) => (
                <li key={item} className="md-activity-item">
                  <div className="md-timeline-dot"></div>
                  <span className="md-activity-badge reply">REPLY</span>
                  <div className="md-activity-details">
                    <span className="md-activity-title">rushabh@support.com</span>
                    <span className="md-activity-desc">hello</span>
                  </div>
                  <span className="md-activity-time">08 Aug, 03:11 pm</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="md-widget md-upcoming-widget">
            <div className="md-widget-header">
              <h3 className="md-widget-title">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{marginRight: 6}}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Upcoming Tasks
              </h3>
              <button className="md-link-btn">View All &rarr;</button>
            </div>
            <div className="md-upcoming-content">
              <div className="md-upcoming-icon">
                <svg width="32" height="32" fill="none" stroke="#fca5a5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <h4 className="md-upcoming-value"><span className="text-red">{stats.pendingTasks}</span> pending Tasks</h4>
              <p className="md-upcoming-sub">You're all caught up! Great work.</p>
            </div>
          </div>
        </div>

        {/* Communication Activity Summary Section */}
        <div className="md-widget md-communication-widget" style={{ marginTop: '1.5rem', background: '#ffffff', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e2e8f0' }}>
          <div className="md-widget-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h3 className="md-widget-title" style={{ fontSize: '1rem', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaComments style={{ color: '#740a03', fontSize: '1.1rem' }} />
              Communication Activity
            </h3>
            <button
              className="md-link-btn"
              onClick={() => navigate(user?.role === 'admin' ? '/admin/communication-activities' : '/communication-activities')}
              style={{ background: 'none', border: 'none', color: '#740a03', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              View All &rarr;
            </button>
          </div>
          <div className="md-communication-content">

            {communicationRemarks.length === 0 ? (
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
                No recent communication activities found.
              </div>
            ) : (
              <div className="md-communication-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {communicationRemarks.slice(0, 5).map((rmk) => (
                  <div
                    key={rmk.id || rmk._id}
                    style={{
                      padding: '0.625rem 0.875rem',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      borderLeft: '4px solid #740a03',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#740a03' }}>
                        {String(rmk.category || 'General').toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                        {rmk.createdAt ? new Date(rmk.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                      {rmk.content || '-'}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                      <span><strong>Account/Deal:</strong> {rmk.accountName || rmk.dealName || `ID: ${rmk.accountId || rmk.dealId || '-'}`}</span>
                      <span><strong>By:</strong> {rmk.createdByName || 'User'} ({rmk.createdByEmail || rmk.accountOwnerEmail || '-'})</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
