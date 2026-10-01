import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBell,
  FaChartLine,
  FaClipboardList,
  FaHandshake,
  FaUsers,
} from 'react-icons/fa'
import Badge from '../../components/common/Badge'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import {
  formatCurrency,
  formatDate,
  getPriorityColor,
  getStatusColor,
} from '../../utils/helpers'
import './UserDashboardPage.css'

const UserDashboardPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    accounts,
    deals,
    tasks,
    notifications,
    supportRequests,
  } = useData()

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
    }
  }, [accounts, deals, notifications.length, supportRequests, tasks])

  const recentDeals = useMemo(() => (
    [...deals]
      .sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime())
      .slice(0, 5)
  ), [deals])

  const upcomingTasks = useMemo(() => (
    tasks
      .filter((task) => task.status !== 'completed')
      .sort((left, right) => new Date(left.dueDate || left.createdAt || 0).getTime() - new Date(right.dueDate || right.createdAt || 0).getTime())
      .slice(0, 5)
  ), [tasks])

  const latestNotifications = useMemo(() => (
    [...notifications]
      .sort((left, right) => new Date(right.timestamp || 0).getTime() - new Date(left.timestamp || 0).getTime())
      .slice(0, 5)
  ), [notifications])

  return (
    <div className="ud-page">
      <div className="ud-header">
        <h1>Dashboard</h1>
        <p>Welcome back, {user?.name || 'User'}! Here&apos;s your live work summary.</p>
      </div>

      <div className="ud-stats-grid">
        <div className="ud-stat-card">
          <div className="ud-stat-icon ud-stat-icon--blue">
            <FaUsers />
          </div>
          <div className="ud-stat-details">
            <div className="ud-stat-value">{stats.accounts}</div>
            <div className="ud-stat-label">Accounts</div>
            <div className="ud-stat-subtext">Assigned to you</div>
          </div>
        </div>

        <div className="ud-stat-card">
          <div className="ud-stat-icon ud-stat-icon--green">
            <FaHandshake />
          </div>
          <div className="ud-stat-details">
            <div className="ud-stat-value">{stats.openDeals}</div>
            <div className="ud-stat-label">Open Deals</div>
            <div className="ud-stat-subtext">{formatCurrency(stats.dealValue)} pipeline</div>
          </div>
        </div>

        <div className="ud-stat-card">
          <div className="ud-stat-icon ud-stat-icon--red">
            <FaClipboardList />
          </div>
          <div className="ud-stat-details">
            <div className="ud-stat-value">{stats.pendingTasks}</div>
            <div className="ud-stat-label">Pending Tasks</div>
            <div className="ud-stat-subtext">{stats.tasks} total tasks</div>
          </div>
        </div>

        <div className="ud-stat-card">
          <div className="ud-stat-icon ud-stat-icon--purple">
            <FaBell />
          </div>
          <div className="ud-stat-details">
            <div className="ud-stat-value">{stats.notifications}</div>
            <div className="ud-stat-label">Notifications</div>
            <div className="ud-stat-subtext">{stats.openSupportRequests} active support requests</div>
          </div>
        </div>
      </div>

      <div className="ud-content-grid">
        <div className="ud-card">
          <div className="ud-card-header">
            <h3>Recent Deals</h3>
            <button type="button" className="ud-view-all-btn" onClick={() => navigate('/deals')}>
              View All &rarr;
            </button>
          </div>
          <div className="ud-list">
            {recentDeals.length > 0 ? recentDeals.map((deal) => (
              <div key={deal.id} className="ud-list-item">
                <div className="ud-item-info">
                  <div className="ud-item-title">{deal.name || '-'}</div>
                  <div className="ud-item-desc">
                    <Badge variant={getStatusColor(deal.status)}>
                      {deal.status || '-'}
                    </Badge>
                  </div>
                </div>
                <div className="ud-item-meta">
                  <div className="ud-item-value">{formatCurrency(deal.value || 0)}</div>
                  <div className="ud-item-date">{formatDate(deal.createdAt)}</div>
                </div>
              </div>
            )) : (
              <div className="ud-empty-state">No deals available</div>
            )}
          </div>
        </div>

        <div className="ud-card">
          <div className="ud-card-header">
            <h3>Upcoming Tasks</h3>
          </div>
          <div className="ud-list">
            {upcomingTasks.length > 0 ? upcomingTasks.map((task) => (
              <div key={task.id} className="ud-list-item">
                <div className="ud-item-info">
                  <div className="ud-item-title">{task.title}</div>
                  <div className="ud-item-desc">{task.description || 'No description'}</div>
                </div>
                <div className="ud-item-meta">
                  <Badge variant={getPriorityColor(task.priority)}>
                    {task.priority || 'medium'}
                  </Badge>
                  <div className="ud-item-date">{task.dueDate ? formatDate(task.dueDate) : '-'}</div>
                </div>
              </div>
            )) : (
              <div className="ud-empty-state">No upcoming tasks</div>
            )}
          </div>
        </div>
      </div>

      <div className="ud-card">
        <div className="ud-card-header">
          <h3>Live Notifications</h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{latestNotifications.length} items</span>
        </div>
        <div className="ud-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
          {latestNotifications.length > 0 ? latestNotifications.map((notification) => (
            <div key={notification.id} className="ud-list-item">
              <div className="ud-item-info">
                <div className="ud-item-title">{notification.title || 'Notification'}</div>
                <div className="ud-item-desc">{notification.message || '-'}</div>
              </div>
              <div className="ud-item-meta">
                <Badge variant={getStatusColor(notification.type === 'error' ? 'lost' : notification.type)}>
                  {notification.type || 'info'}
                </Badge>
                <div className="ud-item-date">{formatDate(notification.timestamp)}</div>
              </div>
            </div>
          )) : (
            <div className="ud-empty-state" style={{ gridColumn: '1 / -1' }}>No notifications yet</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDashboardPage
