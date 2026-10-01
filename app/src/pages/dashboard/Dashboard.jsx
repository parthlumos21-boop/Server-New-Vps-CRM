import React, { useMemo } from 'react'
import {
  FaUsers,
  FaBriefcase,
  FaRupeeSign,
  FaTasks,
  FaArrowUp,
  FaArrowDown,
  FaEllipsisV,
  FaCircle,
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
  const { accounts, deals, tasks } = useData()
  const { user } = useAuth()

  const stats = useMemo(() => ({
    totalAccounts: accounts.length,
    activeAccounts: accounts.filter((a) => a.status === 'active').length,
    totalDeals: deals.length,
    activeDeals: deals.filter((d) => !['won', 'lost'].includes(d.status)).length,
    wonDeals: deals.filter((d) => d.status === 'won').length,
    dealValue: deals.reduce((sum, d) => sum + (d.value || 0), 0),
    wonValue: deals.filter((d) => d.status === 'won').reduce((sum, d) => sum + (d.value || 0), 0),
    totalTasks: tasks.length,
    pendingTasks: tasks.filter((t) => t.status === 'pending').length,
    completedTasks: tasks.filter((t) => t.status === 'completed').length,
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
      .filter((t) => t.status === 'pending')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
  ), [tasks])

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

  return (
    <div className="md-dashboard">
      <div className="md-dashboard__topbar">
        <div>
          <h1 className="md-dashboard__title">Dashboard</h1>
          <p className="md-dashboard__subtitle">
            Welcome back, {user?.name || 'User'} - here is your CRM dashboard.
          </p>
        </div>
        <div className="md-dashboard__topbar-actions">
          <button type="button" className="md-btn md-btn--outline">Export</button>
          <button type="button" className="md-btn md-btn--primary">New Deal</button>
        </div>
      </div>

      <div className="md-kpi-grid">
        {kpiCards.map((card) => {
          const TrendIcon = card.trend >= 0 ? FaArrowUp : FaArrowDown
          return (
            <div key={card.label} className="md-card md-kpi">
              <div className="md-kpi__header">
                <span className={`md-kpi__icon md-kpi__icon--${card.color}`}>{card.icon}</span>
                <span className={`md-kpi__trend ${card.trend >= 0 ? 'is-up' : 'is-down'}`}>
                  <TrendIcon /> {Math.abs(card.trend)}%
                </span>
              </div>
              <div className="md-kpi__value">{card.value}</div>
              <div className="md-kpi__label">{card.label}</div>
              <div className="md-kpi__sub">{card.sub}</div>
            </div>
          )
        })}
      </div>

      <div className="md-grid md-grid--charts">
        <div className="md-card md-chart-card">
          <div className="md-card__header">
            <div>
              <h3 className="md-card__title">Revenue Overview</h3>
              <p className="md-card__subtitle">Last 6 months pipeline trend</p>
            </div>
            <button type="button" className="md-icon-btn" aria-label="More options"><FaEllipsisV /></button>
          </div>
          <div className="md-chart-card__body">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={trendData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1976d2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#1976d2" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID_STROKE} vertical={false} />
                <XAxis dataKey="name" stroke={CHART_AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={CHART_AXIS_STROKE} fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={CHART_TOOLTIP_STYLE}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#1976d2"
                  strokeWidth={2.5}
                  fill="url(#revGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="md-card md-chart-card">
          <div className="md-card__header">
            <div>
              <h3 className="md-card__title">Pipeline by Stage</h3>
              <p className="md-card__subtitle">{stats.totalDeals} deals tracked</p>
            </div>
            <button type="button" className="md-icon-btn" aria-label="More options"><FaEllipsisV /></button>
          </div>
          <div className="md-chart-card__body md-chart-card__body--pie">
            <div className="md-pie-wrap">
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={pipelineData.length ? pipelineData : [{ name: 'No data', value: 1 }]}
                    dataKey="value"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {(pipelineData.length ? pipelineData : [{ name: 'No data', value: 1 }]).map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="md-pie-center">
                <span className="md-pie-center__value">{conversionRate}%</span>
                <span className="md-pie-center__label">Won rate</span>
              </div>
            </div>
            <ul className="md-legend">
              {pipelineData.slice(0, 6).map((entry, idx) => (
                <li key={entry.name} className="md-legend__item">
                  <span className="md-legend__dot" style={{ color: PIE_COLORS[idx % PIE_COLORS.length] }}>
                    <FaCircle />
                  </span>
                  <span className="md-legend__name">{entry.name}</span>
                  <span className="md-legend__value">{entry.value}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="md-grid md-grid--lists">
        <div className="md-card md-list-card">
          <div className="md-card__header">
            <div>
              <h3 className="md-card__title">Recent Accounts</h3>
              <p className="md-card__subtitle">Latest additions</p>
            </div>
            <button type="button" className="md-link-btn">View all</button>
          </div>
          <ul className="md-list">
            {recentAccounts.length === 0 ? (
              <li className="md-list__empty">No accounts yet</li>
            ) : recentAccounts.map((account) => (
              <li key={account.id} className="md-list__item">
                <span className="md-avatar md-avatar--blue">
                  {(account.name || '?').charAt(0).toUpperCase()}
                </span>
                <div className="md-list__main">
                  <span className="md-list__title">{account.name}</span>
                  <span className="md-list__meta">{account.industry || '-'}</span>
                </div>
                <span className={`md-chip md-chip--${getStatusColor(account.status)}`}>
                  {account.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md-card md-list-card">
          <div className="md-card__header">
            <div>
              <h3 className="md-card__title">Recent Deals</h3>
              <p className="md-card__subtitle">Latest pipeline activity</p>
            </div>
            <button type="button" className="md-link-btn">View all</button>
          </div>
          <ul className="md-list">
            {recentDeals.length === 0 ? (
              <li className="md-list__empty">No deals yet</li>
            ) : recentDeals.map((deal) => (
              <li key={deal.id} className="md-list__item">
                <span className="md-avatar md-avatar--green">
                  <FaBriefcase />
                </span>
                <div className="md-list__main">
                  <span className="md-list__title">{deal.name}</span>
                  <span className="md-list__meta">{formatCurrency(deal.value)}</span>
                </div>
                <span className={`md-chip md-chip--${getStatusColor(deal.status)}`}>
                  {deal.status}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md-card md-list-card">
          <div className="md-card__header">
            <div>
              <h3 className="md-card__title">Upcoming Tasks</h3>
              <p className="md-card__subtitle">{stats.pendingTasks} pending</p>
            </div>
            <button type="button" className="md-link-btn">View all</button>
          </div>
          <ul className="md-list">
            {upcomingTasks.length === 0 ? (
              <li className="md-list__empty">No pending tasks</li>
            ) : upcomingTasks.map((task) => (
              <li key={task.id} className="md-list__item">
                <span className="md-avatar md-avatar--orange">
                  <FaTasks />
                </span>
                <div className="md-list__main">
                  <span className="md-list__title">{task.title}</span>
                  <span className="md-list__meta">Due {formatDate(task.dueDate)}</span>
                </div>
                <span className={`md-chip md-chip--${getStatusColor(task.priority)}`}>
                  {task.priority}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
