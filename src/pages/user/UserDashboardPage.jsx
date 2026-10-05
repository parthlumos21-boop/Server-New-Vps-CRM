import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowRight,
  FaBell,
  FaBriefcase,
  FaCalendarAlt,
  FaCheckCircle,
  FaClipboardList,
  FaEnvelope,
  FaFileAlt,
  FaHandshake,
  FaHeadset,
  FaHome,
  FaThLarge,
  FaUser,
  FaUsers,
  FaComments,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import apiClient from '../../services/apiClient'
import { remarkApi } from '../../services/remarkApi'
import { customerService } from '../../services/customerService'
import { formatCurrency, formatDate } from '../../utils/helpers'
import { filterCommunicationActivitiesForUser } from '../../utils/communicationActivityAccess'
import './UserDashboardPage.css'
import AnalyticsSection from '../../components/dashboard/AnalyticsSection'

const formatTodoDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const UserDashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    accounts,
    deals,
    tasks,
    notifications,
    supportRequests,
    reminders,
    quotations,
    activities,
    updateReminder,
  } = useData()
  const [todoReplies, setTodoReplies] = useState([])
  const [communicationRemarks, setCommunicationRemarks] = useState([])
  const customers = useMemo(() => customerService.getCustomers(), [])

  const fetchTodoReplies = useCallback(async () => {
    try {
      const res = await apiClient.get('/support-requests/todo/replies')
      setTodoReplies(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
    } catch (error) {
      console.error('Failed to fetch todo replies:', error)
    }
  }, [])

  useEffect(() => {
    fetchTodoReplies()
    let isMounted = true
    remarkApi.getAllRemarks({ limit: 10 }).then((res) => {
      if (isMounted && Array.isArray(res)) {
        setCommunicationRemarks(filterCommunicationActivitiesForUser(res, user).slice(0, 10))
      }
    }).catch(() => {})
    return () => { isMounted = false }
  }, [fetchTodoReplies, user])

  const stats = useMemo(() => {
    const pendingTasks = tasks.filter((task) => task.status === 'pending')
    const openDeals = deals.filter((deal) => !['won', 'lost'].includes(String(deal.status || '').toLowerCase()))
    const openSupportRequests = supportRequests.filter((supportRequest) => String(supportRequest.status || '').toLowerCase() !== 'closed')

    return {
      accounts: accounts.length,
      deals: deals.length,
      dealValue: deals.reduce((sum, deal) => sum + (Number(deal.value) || 0), 0),
      openDeals: openDeals.length,
      tasks: tasks.length,
      pendingTasks: pendingTasks.length,
      supportRequests: supportRequests.length,
      openSupportRequests: openSupportRequests.length,
      notifications: notifications.length,
      quotations: quotations.length,
    }
  }, [accounts, deals, notifications.length, quotations.length, supportRequests, tasks])

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
      .filter((reminder) => String(reminder.status || '').toLowerCase() !== 'closed')
      .filter((reminder) => matchesUser(reminder.assignedTo) || matchesUser(reminder.createdBy) || !reminder.assignedTo)
      .slice(0, 6)
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: 'REMINDER (NONE)',
        title: reminder.title || reminder.message || 'abc',
        meta: formatTodoDateTime(reminder.remindAt || reminder.reminderDate) || '30 Sept, 05:30 am',
        message: reminder.message || reminder.note || 'abc',
        date: reminder.remindAt || reminder.reminderDate,
        reminder,
        onClick: () => navigate('/reminders/my', {
          state: {
            activeMyReminderTab: 'today',
            reminderId: reminder.id,
          },
        }),
      }))

    const replyItems = todoReplies.slice(0, 6).map((reply, index) => {
      const requestId = reply.support_request_id || reply.supportRequestId || ''
      const matchedRequest = supportRequests.find((request) => (
        [request.id, request.mongoId, request._id, request.legacyId].some((value) => String(value || '') === String(requestId || ''))
      ))
      const targetRequestId = matchedRequest?.id || requestId
      return {
        id: `reply-${reply._id || reply.id || index}`,
        type: 'REPLY',
        title: reply.sender_email || reply.senderEmail || 'Support Reply',
        meta: formatTodoDateTime(reply.created_at || reply.createdAt),
        message: reply.message || 'abc',
        date: reply.created_at || reply.createdAt,
        onClick: () => navigate('/tickets', {
          state: {
            activeTab: 'replied',
            expandedTicketId: targetRequestId,
            supportRequestId: targetRequestId,
          },
        }),
      }
    })

    const taskItems = (tasks || [])
      .filter((task) => String(task.status || '').toLowerCase() === 'pending' || String(task.status || '').toLowerCase() === 'open')
      .filter((task) => matchesUser(task.assignedTo) || matchesUser(task.createdBy) || matchesUser(task.userEmail) || matchesUser(task.ownerUserId) || !task.assignedTo)
      .slice(0, 6)
      .map((task) => ({
        id: `task-${task.id || task._id}`,
        type: 'TASK',
        title: task.title || task.name || 'abc',
        meta: formatTodoDateTime(task.dueDate || task.createdAt) || '30 Sept, 05:30 am',
        message: task.description || task.note || 'abc',
        date: task.dueDate || task.createdAt,
        task,
        onClick: () => navigate('/accounts/my-accounts'),
      }))

    return [...reminderItems, ...replyItems, ...taskItems]
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
      .slice(0, 8)
  }, [navigate, reminders, supportRequests, tasks, todoReplies, user?.id, userIdentity])

  const handleTodoReminderActive = (reminder, event) => {
    event?.stopPropagation()
    navigate('/reminders/active', {
      state: {
        reminderId: reminder.id,
      },
    })
  }

  const handleTodoReminderClose = async (reminder, event) => {
    event?.stopPropagation()
    await updateReminder(reminder.id, { status: 'closed' })
    navigate('/reminders/closed', {
      state: {
        reminderId: reminder.id,
      },
    })
  }

  const [todoFilter, setTodoFilter] = useState('all')

  const counts = useMemo(() => {
    const reminderCount = todoItems.filter((item) => item.type.includes('REMINDER')).length
    const taskCount = todoItems.filter((item) => item.type === 'TASK').length
    const replyCount = todoItems.filter((item) => item.type === 'REPLY').length
    return { all: todoItems.length, reminder: reminderCount, task: taskCount, reply: replyCount }
  }, [todoItems])

  const displayedTodoItems = useMemo(() => {
    if (todoFilter === 'reminder') {
      return todoItems.filter((item) => item.type.includes('REMINDER'))
    }
    if (todoFilter === 'task') {
      return todoItems.filter((item) => item.type === 'TASK')
    }
    if (todoFilter === 'reply') {
      return todoItems.filter((item) => item.type === 'REPLY')
    }
    return todoItems
  }, [todoItems, todoFilter])

  const currentFormattedDateTime = useMemo(() => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-GB')
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
    return `${dateStr}, ${timeStr}`
  }, [])

  return (
    <div className="ud-page">
      {/* Welcome Section */}
      <div className="ud-welcome-section">
        <span className="ud-welcome-kicker">WELCOME,</span>
        <h1 className="ud-welcome-heading">{user?.name || 'Keval V Shah'}!</h1>
        <p className="ud-welcome-subtext">Here&apos;s what&apos;s happening with your business today.</p>
      </div>

      {/* 4 Stat Cards Row */}
      <div className="ud-stats-grid">
        {/* Card 1: Accounts */}
        <div className="ud-stat-card ud-stat-card--accounts" onClick={() => navigate('/accounts/my-accounts')}>
          <div className="ud-stat-icon-wrapper ud-stat-icon-wrapper--red">
            <FaUsers />
          </div>
          <div className="ud-stat-content">
            <div className="ud-stat-num-row">
              <span className="ud-stat-number">{stats.accounts || 14}</span>
              <span className="ud-stat-badge ud-stat-badge--green">↗ +12%</span>
            </div>
            <span className="ud-stat-title">Accounts</span>
          </div>
          <div className="ud-stat-curve ud-stat-curve--red" />
        </div>

        {/* Card 2: Customer */}
        <div className="ud-stat-card ud-stat-card--customer" onClick={() => navigate('/customers/my-customers')}>
          <div className="ud-stat-icon-wrapper ud-stat-icon-wrapper--blue">
            <FaUser />
          </div>
          <div className="ud-stat-content">
            <div className="ud-stat-num-row">
              <span className="ud-stat-number">0</span>
              <span className="ud-stat-badge ud-stat-badge--gray">0%</span>
            </div>
            <span className="ud-stat-title">Customer</span>
          </div>
          <div className="ud-stat-curve ud-stat-curve--blue" />
        </div>

        {/* Card 3: Deal */}
        <div className="ud-stat-card ud-stat-card--deal" onClick={() => navigate('/deals/view')}>
          <div className="ud-stat-icon-wrapper ud-stat-icon-wrapper--green">
            <FaHandshake />
          </div>
          <div className="ud-stat-content">
            <div className="ud-stat-num-row">
              <span className="ud-stat-number">{stats.openDeals || 18}</span>
              <span className="ud-stat-badge ud-stat-badge--green">↗ +8%</span>
            </div>
            <span className="ud-stat-title">Deal</span>
          </div>
          <div className="ud-stat-curve ud-stat-curve--green" />
        </div>

        {/* Card 4: Quotation Manager */}
        <div className="ud-stat-card ud-stat-card--quotation" onClick={() => navigate('/quotation-manager/view')}>
          <div className="ud-stat-icon-wrapper ud-stat-icon-wrapper--orange">
            <FaFileAlt />
          </div>
          <div className="ud-stat-content">
            <div className="ud-stat-num-row">
              <span className="ud-stat-number">{stats.quotations || 23}</span>
            </div>
            <span className="ud-stat-title">Quotation Manager</span>
          </div>
          <div className="ud-stat-curve ud-stat-curve--orange" />
        </div>
      </div>

      {/* Full Width To Do List Card */}
      <div className="ud-todo-full-container">
        <div className="ud-card ud-todo-card ud-todo-card--expansive">
          <div className="ud-card-header ud-todo-header-expansive">
            <div className="ud-card-header-left">
              <div className="ud-todo-header-icon-box">
                <FaClipboardList className="ud-card-header-icon" />
              </div>
              <div>
                <div className="ud-todo-title-row">
                  <h3>To Do List</h3>
                  <span className="ud-todo-count-badge">{counts.all} items</span>
                </div>
                <p className="ud-todo-subtitle">Prioritized follow-ups, pending tasks, and support updates</p>
              </div>
            </div>

            <div className="ud-todo-filter-tabs">
              <button
                type="button"
                className={`ud-todo-tab ${todoFilter === 'all' ? 'active' : ''}`}
                onClick={() => setTodoFilter('all')}
              >
                All ({counts.all})
              </button>
              <button
                type="button"
                className={`ud-todo-tab ${todoFilter === 'reminder' ? 'active' : ''}`}
                onClick={() => setTodoFilter('reminder')}
              >
                Reminders ({counts.reminder})
              </button>
              <button
                type="button"
                className={`ud-todo-tab ${todoFilter === 'task' ? 'active' : ''}`}
                onClick={() => setTodoFilter('task')}
              >
                Tasks ({counts.task})
              </button>
              <button
                type="button"
                className={`ud-todo-tab ${todoFilter === 'reply' ? 'active' : ''}`}
                onClick={() => setTodoFilter('reply')}
              >
                Replies ({counts.reply})
              </button>
            </div>

            <div className="ud-card-header-right">
              <button
                type="button"
                className="ud-link-btn"
                onClick={() => navigate('/reminders/my')}
              >
                View All &rarr;
              </button>
              <button
                type="button"
                className="ud-red-btn"
                onClick={() => navigate('/tasks')}
              >
                + Add Task
              </button>
            </div>
          </div>

          <div className="ud-todo-list ud-todo-list--expansive">
            {displayedTodoItems.length > 0 ? displayedTodoItems.map((item) => (
              <div key={item.id} className={`ud-todo-row ud-todo-row--${item.type.toLowerCase().replace(/[^a-z]/g, '')}`} onClick={item.onClick}>
                <button
                  type="button"
                  className={`ud-todo-icon-box ud-todo-icon-box--${item.type.toLowerCase().includes('reminder') ? 'reminder' : item.type.toLowerCase().includes('task') ? 'task' : 'reply'}`}
                  onClick={item.onClick}
                  aria-label={`Open ${item.type}`}
                  title={`Open ${item.type}`}
                >
                  <FaCalendarAlt />
                </button>
                <div className="ud-todo-body">
                  <div className="ud-todo-meta-line">
                    <span className={`ud-todo-badge ud-todo-badge--${item.type.toLowerCase().includes('reminder') ? 'reminder' : item.type.toLowerCase().includes('task') ? 'task' : 'reply'}`}>
                      {item.type}
                    </span>
                    <span className="ud-todo-date">{item.meta}</span>
                  </div>
                  <div className="ud-todo-title-text">{item.title || item.message}</div>
                  {item.message && item.title && item.message !== item.title ? (
                    <div className="ud-todo-desc-text">{item.message}</div>
                  ) : null}
                </div>
                {item.reminder ? (
                  <div className="ud-todo-btn-group">
                    <button
                      type="button"
                      className="ud-active-pill-btn"
                      onClick={(e) => handleTodoReminderActive(item.reminder, e)}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className="ud-close-pill-btn"
                      onClick={(e) => handleTodoReminderClose(item.reminder, e)}
                    >
                      Close
                    </button>
                  </div>
                ) : (
                  <div className="ud-todo-btn-group">
                    <button
                      type="button"
                      className="ud-view-action-btn"
                      onClick={item.onClick}
                    >
                      Open &rarr;
                    </button>
                  </div>
                )}
              </div>
            )) : (
              <div className="ud-todo-empty-state">
                <FaClipboardList className="ud-todo-empty-icon" />
                <p>No {todoFilter !== 'all' ? todoFilter : ''} to-do items found right now.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Integrations & Live Activity Row */}
      <div className="ud-side-widgets-row">
        {/* Integrations Card */}
        <div className="ud-card ud-integrations-card">
          <div className="ud-card-header">
            <div className="ud-card-header-left">
              <FaThLarge className="ud-card-header-icon" />
              <h3>Integrations</h3>
            </div>
          </div>
          <div className="ud-integrations-grid">
            <div className="ud-integration-box" onClick={() => navigate('/support-requests/add')}>
              <div className="ud-integ-icon-box ud-integ-icon-box--red">
                <FaHeadset />
              </div>
              <div className="ud-integ-info">
                <div className="ud-integ-title">CRM Support</div>
                <div className="ud-integ-subtext">Open help desk & tickets...</div>
              </div>
              <FaArrowRight className="ud-integ-arrow" />
            </div>
          </div>
        </div>

        {/* Live Activity Card */}
        <div className="ud-card ud-live-card">
          <div className="ud-card-header">
            <div className="ud-card-header-left">
              <span className="ud-green-dot" />
              <h3>Live Activity</h3>
            </div>
            <button
              type="button"
              className="ud-link-btn"
              onClick={() => navigate('/team-view')}
            >
              Team View &rarr;
            </button>
          </div>
          <div className="ud-live-card-body">
            <div className="ud-live-user-pill">
              <div className="ud-live-user-left">
                <span className="ud-live-status-chip">• LIVE</span>
                <div className="ud-live-user-details">
                  <span className="ud-live-user-name">{user?.name || 'Keval V Shah...'}</span>
                  <span className="ud-live-user-sub">{user?.role || 'Director'} • Active...</span>
                </div>
              </div>
              <span className="ud-live-time-chip">{currentFormattedDateTime}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Communication Activity Section */}
      <div className="ud-card ud-communication-card" style={{ marginTop: '1.25rem', marginBottom: '1.5rem' }}>
        <div className="ud-card-header">
          <div className="ud-card-header-left">
            <FaComments className="ud-card-header-icon" style={{ color: '#740a03' }} />
            <h3>Communication Activity</h3>
          </div>
          <button
            type="button"
            className="ud-link-btn"
            onClick={() => navigate('/communication-activities')}
          >
            View All &rarr;
          </button>
        </div>
        <div className="ud-card-body" style={{ padding: '1.25rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem 0' }}>
            Track all recent calls, general remarks, feedback notes, and discussion threads across Accounts and Deals.
          </p>

          {communicationRemarks.length === 0 ? (
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
              No recent communication activities found.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              {communicationRemarks.slice(0, 5).map((rmk) => (
                <div
                  key={rmk.id || rmk._id}
                  style={{
                    padding: '0.75rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    borderLeft: '4px solid #740a03',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.35rem',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#740a03', letterSpacing: '0.5px' }}>
                      {String(rmk.category || 'General').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {rmk.createdAt ? new Date(rmk.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500', lineHeight: '1.4' }}>
                    {rmk.content || '-'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem' }}>
                    <span><strong>Account/Deal:</strong> {rmk.accountName || rmk.dealName || `ID: ${rmk.accountId || rmk.dealId || '-'}`}</span>
                    <span><strong>By:</strong> {rmk.createdByName || 'User'} ({rmk.createdByEmail || rmk.accountOwnerEmail || '-'})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics Section Component */}
      <AnalyticsSection
        accounts={accounts}
        deals={deals}
        customers={customers}
        quotations={quotations}
        activities={activities}
      />
    </div>
  )
}

export default UserDashboardPage
