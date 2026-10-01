import React, { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaChartLine,
  FaChevronDown,
  FaClipboardList,
  FaFilter,
  FaHandshake,
  FaSort,
  FaTrophy,
  FaUsers,
} from 'react-icons/fa'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import { useData } from '../../context/DataContext'
import { useClickOutside } from '../../hooks'
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers'
import './SalesDashboard.css'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Deals', meta: 'See the full pipeline pulse.' },
  { value: 'won', label: 'Won Deals', meta: 'Focus on converted opportunities.' },
  { value: 'lost', label: 'Lost Deals', meta: 'Review deals that slipped away.' },
  { value: 'negotiation', label: 'In Negotiation', meta: 'Track active decision-stage work.' },
  { value: 'proposal', label: 'Proposal', meta: 'Surface deals waiting on proposals.' },
]

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'All Time', meta: 'Keep the long-range revenue view.' },
  { value: 'today', label: 'Today', meta: 'Zoom into same-day activity.' },
  { value: 'week', label: 'Last 7 Days', meta: 'Watch fresh weekly movement.' },
  { value: 'month', label: 'Last 30 Days', meta: 'Review the current operating month.' },
  { value: 'quarter', label: 'Last Quarter', meta: 'Compare the broader sales cycle.' },
]

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent', meta: 'Newest deals appear first.' },
  { value: 'oldest', label: 'Oldest First', meta: 'Start with the oldest records.' },
  { value: 'value-high', label: 'High Value First', meta: 'Surface the biggest opportunities.' },
  { value: 'value-low', label: 'Low Value First', meta: 'Spot smaller deals quickly.' },
]

const HIGH_VALUE_THRESHOLD = 50000

const sectionMotion = {
  duration: 0.52,
  ease: [0.22, 1, 0.36, 1],
}

const itemMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: sectionMotion },
}

const listMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
}

const resolveOptionLabel = (options, value) => (
  options.find((option) => option.value === value)?.label || options[0].label
)

const SalesDashboard = () => {
  const { deals } = useData()
  const navigate = useNavigate()

  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [filterBy, setFilterBy] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [dateRange, setDateRange] = useState('all')
  const dropdownRef = useClickOutside(() => setIsDropdownOpen(false))

  const filteredDeals = useMemo(() => {
    let nextDeals = [...deals]

    if (dateRange !== 'all') {
      const filterDate = new Date()

      if (dateRange === 'today') {
        filterDate.setHours(0, 0, 0, 0)
      } else if (dateRange === 'week') {
        filterDate.setDate(filterDate.getDate() - 7)
      } else if (dateRange === 'month') {
        filterDate.setMonth(filterDate.getMonth() - 1)
      } else if (dateRange === 'quarter') {
        filterDate.setMonth(filterDate.getMonth() - 3)
      }

      nextDeals = nextDeals.filter((deal) => {
        const dealDate = new Date(deal.createdAt)
        return dealDate >= filterDate
      })
    }

    if (filterBy !== 'all') {
      nextDeals = nextDeals.filter((deal) => deal.status === filterBy)
    }

    return nextDeals
  }, [dateRange, deals, filterBy])

  const stats = useMemo(() => {
    const wonDeals = filteredDeals.filter((deal) => deal.status === 'won')
    const lostDeals = filteredDeals.filter((deal) => deal.status === 'lost')
    const activeDeals = filteredDeals.filter((deal) => !['won', 'lost'].includes(deal.status))

    return {
      totalDeals: filteredDeals.length,
      wonDeals: wonDeals.length,
      lostDeals: lostDeals.length,
      activeDeals: activeDeals.length,
      totalValue: filteredDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      wonValue: wonDeals.reduce((sum, deal) => sum + (deal.value || 0), 0),
      conversionRate: filteredDeals.length > 0
        ? ((wonDeals.length / filteredDeals.length) * 100).toFixed(1)
        : 0,
    }
  }, [filteredDeals])

  const recentDeals = useMemo(() => {
    const nextDeals = [...filteredDeals]

    if (sortBy === 'value-high') {
      nextDeals.sort((left, right) => (right.value || 0) - (left.value || 0))
    } else if (sortBy === 'value-low') {
      nextDeals.sort((left, right) => (left.value || 0) - (right.value || 0))
    } else if (sortBy === 'oldest') {
      nextDeals.sort((left, right) => new Date(left.createdAt) - new Date(right.createdAt))
    } else {
      nextDeals.sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
    }

    return nextDeals.slice(0, 5)
  }, [filteredDeals, sortBy])

  const dealsByStage = useMemo(() => {
    const stages = {}

    filteredDeals.forEach((deal) => {
      const stage = deal.status || 'other'
      stages[stage] = (stages[stage] || 0) + 1
    })

    return Object.entries(stages).map(([stage, count]) => ({ stage, count }))
  }, [filteredDeals])

  const highValueDeals = useMemo(() => (
    [...filteredDeals]
      .filter((deal) => deal.value > HIGH_VALUE_THRESHOLD)
      .sort((left, right) => right.value - left.value)
      .slice(0, 5)
  ), [filteredDeals])

  const controlSignals = useMemo(() => ([
    { label: 'Status', value: resolveOptionLabel(STATUS_OPTIONS, filterBy) },
    { label: 'Period', value: resolveOptionLabel(DATE_RANGE_OPTIONS, dateRange) },
    {
      label: 'Visible Deals',
      value: `${stats.totalDeals} ${stats.totalDeals === 1 ? 'deal' : 'deals'}`,
    },
  ]), [dateRange, filterBy, stats.totalDeals])

  const statCards = useMemo(() => ([
    {
      key: 'total-deals',
      icon: <FaChartLine />,
      iconClass: 'stat-icon-blue',
      value: stats.totalDeals,
      label: 'Total Deals',
      subtext: formatCurrency(stats.totalValue),
    },
    {
      key: 'won-deals',
      icon: <FaTrophy />,
      iconClass: 'stat-icon-green',
      value: stats.wonDeals,
      label: 'Won Deals',
      subtext: formatCurrency(stats.wonValue),
    },
    {
      key: 'lost-deals',
      icon: <FaClipboardList />,
      iconClass: 'stat-icon-red',
      value: stats.lostDeals,
      label: 'Lost Deals',
      subtext: `${stats.conversionRate}% Win Rate`,
    },
    {
      key: 'active-deals',
      icon: <FaHandshake />,
      iconClass: 'stat-icon-purple',
      value: stats.activeDeals,
      label: 'Active Deals',
      subtext: 'In Progress',
    },
  ]), [stats.activeDeals, stats.conversionRate, stats.lostDeals, stats.totalDeals, stats.totalValue, stats.wonDeals, stats.wonValue])

  const menuSections = [
    {
      key: 'status',
      title: 'Filter by Status',
      icon: FaFilter,
      currentValue: filterBy,
      options: STATUS_OPTIONS,
      onSelect: setFilterBy,
    },
    {
      key: 'range',
      title: 'Time Period',
      icon: FaCalendarAlt,
      currentValue: dateRange,
      options: DATE_RANGE_OPTIONS,
      onSelect: setDateRange,
    },
    {
      key: 'sort',
      title: 'Sort By',
      icon: FaSort,
      currentValue: sortBy,
      options: SORT_OPTIONS,
      onSelect: setSortBy,
    },
  ]

  const applyControl = (setter, nextValue) => {
    setter(nextValue)
    setIsDropdownOpen(false)
  }

  const resetControls = () => {
    setFilterBy('all')
    setDateRange('all')
    setSortBy('recent')
    setIsDropdownOpen(false)
  }

  return (
    <div className="sales-dashboard">
      <div className="sales-header-wrapper">
        <motion.div
          className="sales-header-panel"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={sectionMotion}
        >
          <div className="sales-header">
            <div className="sales-header-orbit sales-header-orbit--one" aria-hidden="true" />
            <div className="sales-header-orbit sales-header-orbit--two" aria-hidden="true" />

            <div className="sales-header-content">
              <span className="sales-header-kicker">Revenue command view</span>
              <h1>Sales Dashboard</h1>
              <p>
                Track pipeline performance with clean filters, clear totals, and aligned deal views.
              </p>
            </div>

            <div className="sales-header-signals">
              {controlSignals.map((signal) => (
                <div key={signal.label} className="sales-header-signal">
                  <span className="sales-header-signal-label">{signal.label}</span>
                  <strong className="sales-header-signal-value">{signal.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          ref={dropdownRef}
          className="sales-dropdown-container"
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ ...sectionMotion, delay: 0.08 }}
        >
          <button
            type="button"
            className="sales-dropdown-toggle"
            onClick={() => setIsDropdownOpen((currentValue) => !currentValue)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-label="Open dashboard controls"
          >
            <span className="sales-dropdown-toggle-copy">
              <span className="sales-dropdown-toggle-kicker">Control Center</span>
              <span className="sales-dropdown-toggle-label">Tune dashboard filters</span>
            </span>
            <span className="sales-dropdown-toggle-icon">
              <FaChevronDown className={isDropdownOpen ? 'open' : ''} />
            </span>
          </button>

          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                className="sales-dropdown-menu"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              >
                {menuSections.map((section, sectionIndex) => {
                  const SectionIcon = section.icon

                  return (
                    <div key={section.key} className="dropdown-section">
                      <div className="dropdown-section-title">
                        <SectionIcon />
                        <span>{section.title}</span>
                      </div>

                      <div className="dropdown-items">
                        {section.options.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            className={`dropdown-item ${section.currentValue === option.value ? 'active' : ''}`}
                            onClick={() => applyControl(section.onSelect, option.value)}
                          >
                            <span className="dropdown-item-copy">
                              <span className="dropdown-item-label">{option.label}</span>
                              <span className="dropdown-item-meta">{option.meta}</span>
                            </span>
                            {section.currentValue === option.value ? (
                              <span className="dropdown-item-state">Live</span>
                            ) : null}
                          </button>
                        ))}
                      </div>

                      {sectionIndex < menuSections.length - 1 ? (
                        <div className="dropdown-divider" />
                      ) : null}
                    </div>
                  )
                })}

                <div className="dropdown-footer">
                  <span className="dropdown-footer-copy">
                    {`${stats.totalDeals} ${stats.totalDeals === 1 ? 'deal' : 'deals'} visible`}
                    {' | '}
                    {formatCurrency(stats.totalValue)}
                  </span>
                  <button
                    type="button"
                    className="dropdown-reset-pill"
                    onClick={resetControls}
                  >
                    Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      <motion.div
        className="sales-stats-grid"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {statCards.map((card) => (
          <motion.div key={card.key} className="sales-stat-card" variants={itemMotion}>
            <div className={`stat-icon ${card.iconClass}`}>
              {card.icon}
            </div>
            <div className="stat-details">
              <div className="stat-value">{card.value}</div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-subtext">{card.subtext}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...sectionMotion, delay: 0.1 }}
      >
        <Card className="sales-card full-width sales-chart-card" padding={false}>
          <div className="card-header">
            <h3>Pipeline Overview</h3>
            <span className="deal-count">Deals by Stage</span>
          </div>
          <div className="sales-chart-wrapper">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dealsByStage}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="stage" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ 
                    borderRadius: '8px', 
                    border: 'none',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    backgroundColor: '#ffffff',
                    color: '#0f172a'
                  }}
                  itemStyle={{ color: '#0f9f9a', fontWeight: 600 }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#0f9f9a" 
                  radius={[4, 4, 0, 0]} 
                  barSize={40}
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </motion.div>

      <div className="sales-content-grid">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...sectionMotion, delay: 0.12 }}
        >
          <Card className="sales-card" padding={false}>
            <div className="card-header">
              <h3>Recent Deals</h3>
              <button
                type="button"
                className="view-all-btn"
                onClick={() => navigate('/admin/deals/view')}
              >
                View All {'->'}
              </button>
            </div>
            <div className="deals-table">
              <div className="table-header">
                <div className="col-name">Deal Name</div>
                <div className="col-value">Value</div>
                <div className="col-stage">Stage</div>
                <div className="col-date">Date</div>
              </div>
              {recentDeals.length > 0 ? (
                recentDeals.map((deal) => (
                  <div key={deal.id} className="table-row">
                    <div className="col-name">{deal.name}</div>
                    <div className="col-value">{formatCurrency(deal.value)}</div>
                    <div className="col-stage">
                      <Badge color={getStatusColor(deal.status)}>
                        {deal.status}
                      </Badge>
                    </div>
                    <div className="col-date">{formatDate(deal.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No deals yet</div>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ ...sectionMotion, delay: 0.18 }}
        >
          <Card className="sales-card" padding={false}>
            <div className="card-header">
              <h3>Deals by Stage</h3>
            </div>
            <div className="stage-list">
              {dealsByStage.length > 0 ? (
                dealsByStage.map((item) => (
                  <div key={item.stage} className="stage-item">
                    <div className="stage-info">
                      <div className="stage-name">{item.stage}</div>
                      <div className="stage-count">{item.count} deals</div>
                    </div>
                    <div className="stage-bar">
                      <div
                        className="stage-fill"
                        style={{
                          width: `${stats.totalDeals > 0 ? (item.count / stats.totalDeals) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div className="empty-state">No deals data</div>
              )}
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...sectionMotion, delay: 0.22 }}
      >
        <Card className="sales-card full-width" padding={false}>
          <div className="card-header">
            <h3>High Value Deals (Over {formatCurrency(HIGH_VALUE_THRESHOLD)})</h3>
            <span className="deal-count">{highValueDeals.length} deals</span>
          </div>
          <div className="high-value-deals">
            {highValueDeals.length > 0 ? (
              highValueDeals.map((deal) => (
                <div key={deal.id} className="high-value-item">
                  <div className="deal-info">
                    <div className="deal-name">{deal.name}</div>
                    <div className="deal-account">{deal.accountName}</div>
                  </div>
                  <div className="deal-middle">
                    <Badge color={getStatusColor(deal.status)}>
                      {deal.status}
                    </Badge>
                  </div>
                  <div className="deal-value">
                    <div className="value">{formatCurrency(deal.value)}</div>
                    <div className="date">{formatDate(deal.createdAt)}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">No high value deals yet</div>
            )}
          </div>
        </Card>
      </motion.div>

      <motion.div
        className="quick-actions"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...sectionMotion, delay: 0.28 }}
      >
        <button
          type="button"
          className="action-btn action-btn-primary"
          onClick={() => navigate('/admin/deals/view')}
        >
          <FaChartLine /> View All Deals
        </button>
        <button
          type="button"
          className="action-btn action-btn-secondary"
          onClick={() => navigate('/admin/customers/search')}
        >
          <FaUsers /> Manage Customers
        </button>
        <button
          type="button"
          className="action-btn action-btn-secondary"
          onClick={() => navigate('/admin/my-work-status')}
        >
          <FaCalendarAlt /> My Tasks
        </button>
      </motion.div>
    </div>
  )
}

export default SalesDashboard
