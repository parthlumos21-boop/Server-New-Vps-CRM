import React, { useMemo } from 'react'
import Badge from '../../../components/common/Badge'
import Card from '../../../components/common/Card'
import Table from '../../../components/common/Table'
import { useData } from '../../../context/DataContext'
import { authService } from '../../../services/authService'
import { matchesUserScope } from '../../../services/realtimeSync'
import { formatDate, formatRelativeTime, getStatusColor } from '../../../utils/helpers'
import './AdminWorkStatusPage.css'

const AdminWorkStatusPage = () => {
  const { accounts, deals, tasks, activities } = useData()
  const users = useMemo(() => authService.getAvailableUsers(), [])
  const now = new Date()

  const userNameMap = useMemo(() => (
    users.reduce((acc, entry) => {
      acc[entry.id] = entry.name
      return acc
    }, {})
  ), [users])

  const workloadRows = useMemo(() => (
    users
      .filter((user) => user.role !== 'admin')
      .map((user) => {
        const ownedAccounts = accounts.filter((account) => matchesUserScope(account, user))
        const ownedDeals = deals.filter((deal) => matchesUserScope(deal, user))
        const ownedTasks = tasks.filter((task) => matchesUserScope(task, user))
        const pendingTasks = ownedTasks.filter((task) => task.status !== 'completed')
        const overdueTasks = pendingTasks.filter((task) => task.dueDate && new Date(task.dueDate) < now)
        const lastActivity = activities.find((activity) => activity.userName === user.name)

        return {
          id: user.id,
          user: user.name,
          accounts: ownedAccounts.length,
          deals: ownedDeals.length,
          pendingTasks: pendingTasks.length,
          overdueTasks: overdueTasks.length,
          lastActivity: lastActivity ? formatRelativeTime(lastActivity.timestamp) : 'No activity'
        }
      })
  ), [accounts, activities, deals, now, tasks, users])

  const overdueTasks = useMemo(() => (
    tasks
      .filter((task) => task.status !== 'completed' && task.dueDate && new Date(task.dueDate) < now)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
  ), [now, tasks])

  const activityFeed = useMemo(() => activities.slice(0, 8), [activities])
  const totalPendingTasks = tasks.filter((task) => task.status !== 'completed').length

  const workloadColumns = [
    { key: 'user', label: 'User' },
    { key: 'accounts', label: 'Accounts', width: '110px' },
    { key: 'deals', label: 'Deals', width: '110px' },
    { key: 'pendingTasks', label: 'Pending Tasks', width: '140px' },
    {
      key: 'overdueTasks',
      label: 'Overdue',
      width: '120px',
      render: (value) => (
        <Badge variant={value > 0 ? 'danger' : 'success'}>{value}</Badge>
      )
    },
    { key: 'lastActivity', label: 'Last Activity', width: '150px' }
  ]

  const overdueColumns = [
    { key: 'title', label: 'Task' },
    {
      key: 'userId',
      label: 'Owner',
      width: '180px',
      render: (value) => userNameMap[value] || 'Unassigned'
    },
    {
      key: 'status',
      label: 'Status',
      width: '140px',
      render: (value) => (
        <Badge variant={getStatusColor(value)}>{value || 'Pending'}</Badge>
      )
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      width: '150px',
      render: (value) => formatDate(value)
    }
  ]

  return (
    <div className="admin-work-status-page">
      <div className="admin-work-status-header">
        <h1>My Work & Status</h1>
        <p>Review team workload, overdue items, and recent CRM activity from one place.</p>
      </div>

      <div className="admin-work-status-stats">
        <Card className="admin-work-status-stat">
          <h3>{accounts.length}</h3>
          <p>Total Accounts</p>
        </Card>
        <Card className="admin-work-status-stat">
          <h3>{deals.length}</h3>
          <p>Total Deals</p>
        </Card>
        <Card className="admin-work-status-stat">
          <h3>{totalPendingTasks}</h3>
          <p>Open Tasks</p>
        </Card>
        <Card className="admin-work-status-stat">
          <h3>{overdueTasks.length}</h3>
          <p>Overdue Tasks</p>
        </Card>
      </div>

      <div className="admin-work-status-grid">
        <Card
          title="Workload By User"
          subtitle="Accounts, deals, and pending work split by assigned owner."
        >
          <Table
            columns={workloadColumns}
            data={workloadRows}
            emptyMessage="No user workload available"
          />
        </Card>

        <Card
          title="Overdue Task Queue"
          subtitle="Tasks that need immediate follow-up."
        >
          <Table
            columns={overdueColumns}
            data={overdueTasks}
            emptyMessage="No overdue tasks"
          />
        </Card>
      </div>

      <Card
        title="Recent Activity"
        subtitle="Latest visible CRM activity events."
      >
        <div className="admin-work-status-activity-list">
          {activityFeed.length === 0 ? (
            <p className="admin-work-status-empty">No activity captured yet.</p>
          ) : (
            activityFeed.map((activity) => (
              <div key={activity.id} className="admin-work-status-activity-item">
                <div className="admin-work-status-activity-card-main">
                  <div className="admin-work-status-activity-avatar">
                    {String(activity.userName || 'U').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="admin-work-status-activity-copy">
                    <strong>{activity.userName}</strong>
                    <p>{activity.type}</p>
                  </div>
                </div>
                <span className="admin-work-status-activity-time">{formatRelativeTime(activity.timestamp)}</span>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  )
}

export default AdminWorkStatusPage
