import React, { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import {
  FaBuilding,
  FaChartBar,
  FaChartLine,
  FaChartPie,
  FaFileInvoiceDollar,
  FaHandshake,
  FaHistory,
  FaRegClock,
  FaUsers,
} from 'react-icons/fa'
import Badge from '../common/Badge'
import { formatCurrency, formatDate, getStatusColor } from '../../utils/helpers'
import './AnalyticsSection.css'
import { chartApi } from '../../services/chartApi'
import DynamicChartWidget from './DynamicChartWidget'
import ChartRenderer from './ChartRenderer'

const COLORS = ['#0284c7', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04']

const normalize = (value) => String(value || '').trim().toLowerCase()
const amountOf = (item) => Number(item?.total || item?.grandTotal || item?.value || item?.amount || 0) || 0
const dateOf = (item) => item?.createdAt || item?.accountDate || item?.customerDate || item?.date || item?.dealDate || item?.quotationDate || item?.updatedAt

const monthKey = (date) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
}

const isCurrentMonth = (date) => {
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return false
  const now = new Date()
  return parsed.getFullYear() === now.getFullYear() && parsed.getMonth() === now.getMonth()
}

const buildMonthlyData = (deals, quotations) => {
  const keys = Array.from(new Set([...deals, ...quotations].map((item) => monthKey(dateOf(item))).filter(Boolean))).sort().slice(-6)
  return keys.map((key) => {
    const [year, month] = key.split('-')
    const scopedDeals = deals.filter((item) => monthKey(dateOf(item)) === key)
    const scopedQuotations = quotations.filter((item) => monthKey(dateOf(item)) === key)
    return {
      name: new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-IN', { month: 'short' }),
      newDeals: scopedDeals.length,
      wonDeals: scopedDeals.filter((item) => ['won', 'closed'].includes(normalize(item.status || item.stage))).length,
      lostDeals: scopedDeals.filter((item) => ['lost', 'rejected', 'order_lost'].includes(normalize(item.status || item.stage))).length,
      quotationValue: scopedQuotations.reduce((sum, item) => sum + amountOf(item), 0),
    }
  })
}

const CustomChartTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="analytics-tooltip">
        <div className="analytics-tooltip-title">{label}</div>
        {payload.map((entry, index) => (
          <div key={`tooltip-${index}`} className="analytics-tooltip-item">
            <span className="analytics-tooltip-dot" style={{ backgroundColor: entry.color || entry.fill }} />
            <span className="analytics-tooltip-name">{entry.name}:</span>
            <span className="analytics-tooltip-val">
              {typeof entry.value === 'number' && entry.name.toLowerCase().includes('value')
                ? formatCurrency(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

const AnalyticsSection = ({ accounts = [], deals = [], customers = [], quotations = [], activities = [], users = [] }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [period, setPeriod] = useState('month')
  const [dbCharts, setDbCharts] = useState([])
  const [chartDataMap, setChartDataMap] = useState({})
  const [loadingCharts, setLoadingCharts] = useState(true)
  const chartData = useMemo(() => buildMonthlyData(deals, quotations), [deals, quotations])
  const visibleDbCharts = useMemo(() => dbCharts.slice(0, 5), [dbCharts])
  const chartListPath = location.pathname.startsWith('/admin') ? '/admin/charts' : '/charts'

  const pipeline = useMemo(() => {
    const counts = deals.reduce((result, deal) => {
      const key = String(deal.stage || deal.status || 'unknown').replace(/_/g, ' ')
      result[key] = (result[key] || 0) + 1
      return result
    }, {})
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [deals])

  const recentDeals = useMemo(() => [...deals].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))).slice(0, 8), [deals])
  const recentQuotations = useMemo(() => [...quotations].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))).slice(0, 8), [quotations])

  const totalQuotationVal = useMemo(() => quotations.reduce((sum, q) => sum + amountOf(q), 0), [quotations])
  const kpiCards = useMemo(() => ([
    {
      key: 'accounts',
      label: 'Accounts',
      collection: 'leads',
      value: accounts.length,
      monthValue: accounts.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaBuilding,
    },
    {
      key: 'deals',
      label: 'Deals',
      collection: 'deals',
      value: deals.length,
      monthValue: deals.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaHandshake,
    },
    {
      key: 'customers',
      label: 'Customers',
      collection: 'customers',
      value: customers.length,
      monthValue: customers.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaUsers,
    },
    {
      key: 'quotations',
      label: 'Quotations',
      collection: 'quotations',
      value: quotations.length,
      monthValue: quotations.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaFileInvoiceDollar,
    },
  ]), [accounts, customers, deals, quotations])

  useEffect(() => {
    let isMounted = true
    const loadCharts = async () => {
      try {
        setLoadingCharts(true)
        const charts = await chartApi.listCharts()
        if (!isMounted) return
        if (Array.isArray(charts) && charts.length > 0) {
          setDbCharts(charts)
          const dataPromises = charts.map(async (chart) => {
            try {
              const data = await chartApi.getChartData(chart._id || chart.id, { period })
              return { id: chart._id || chart.id, data }
            } catch (err) {
              console.error(`Failed to load data for chart ${chart._id}:`, err)
              return { id: chart._id || chart.id, data: null }
            }
          })
          const results = await Promise.all(dataPromises)
          if (!isMounted) return
          const map = {}
          results.forEach((r) => {
            if (r.id) map[r.id] = r.data
          })
          setChartDataMap(map)
        } else {
          setDbCharts([])
        }
      } catch (err) {
        console.warn('Could not load dynamic charts from DB:', err)
        setDbCharts([])
      } finally {
        if (isMounted) setLoadingCharts(false)
      }
    }
    loadCharts()
    return () => {
      isMounted = false
    }
  }, [period])

  return (
    <section className="analytics-section" aria-label="Analytics">
      <div className="analytics-section__header">
        <div className="analytics-title-group">
          <div className="analytics-header-icon">
            <FaChartPie aria-hidden="true" />
          </div>
          <div>
            <span className="analytics-eyebrow">Performance & Insights</span>
            <h2>Sales Analytics Dashboard</h2>
          </div>
        </div>

        <div className="analytics-header-right">
          <button
            type="button"
            className="analytics-view-all-charts-btn"
            onClick={() => navigate(chartListPath)}
          >
            View All Charts
          </button>

          {false && (
            <div className="analytics-header-pills">
              {kpiCards.map((card) => (
                <div key={card.key} className="analytics-header-pill">
                  <span className="analytics-pill-label">{card.label}</span>
                  <span className="analytics-pill-val">{card.value}</span>
                </div>
              ))}
            </div>
          )}

          <div className="analytics-filter-wrap">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Analytics period"
              className="analytics-select"
            >
              <option value="month">Month wise</option>
              <option value="week">Week wise</option>
              <option value="day">Day wise</option>
            </select>
          </div>
        </div>
      </div>

      {false && (
        <div className="analytics-kpi-grid">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <article key={card.key} className="analytics-kpi-card">
                <div className="analytics-kpi-icon">
                  <Icon />
                </div>
                <div className="analytics-kpi-body">
                  <span className="analytics-kpi-label">{card.label}</span>
                  <strong>{card.value}</strong>
                  <span className="analytics-kpi-collection">Collection: {card.collection}</span>
                  <span className="analytics-kpi-month">+{card.monthValue} this month</span>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div className="analytics-grid analytics-grid--charts">
        {dbCharts.length > 0 ? (
          visibleDbCharts.map((chart) => (
            <ChartRenderer
              key={chart._id || chart.id}
              config={chart}
              data={chartDataMap[chart._id || chart.id]}
              loading={loadingCharts}
            />
          ))
        ) : (
          <>
        <article className="analytics-card analytics-card--wide">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaChartLine /></span>
              Deal Volume Trend
            </h3>
            <span className="analytics-card-subbadge">{chartData.length} Months</span>
          </div>
          <div className="analytics-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNewDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradWonDeals" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Line type="monotone" dataKey="newDeals" name="New Deals" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="wonDeals" name="Won Deals" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="lostDeals" name="Lost Deals" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaChartBar /></span>
              Pipeline Stages
            </h3>
            <span className="analytics-card-subbadge">{pipeline.length} Stages</span>
          </div>
          <div className="analytics-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar dataKey="value" name="Deals" radius={[8, 8, 0, 0]}>
                  {pipeline.map((entry, index) => (
                    <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card analytics-card--wide">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaFileInvoiceDollar /></span>
              Quotation Value Trend
            </h3>
            <span className="analytics-card-subbadge">{formatCurrency(totalQuotationVal)}</span>
          </div>
          <div className="analytics-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(value) => formatCurrency(value)} content={<CustomChartTooltip />} />
                <Bar dataKey="quotationValue" name="Quotation Value" fill="#dc2626" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="analytics-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaChartPie /></span>
              Distribution Summary
            </h3>
            <span className="analytics-card-subbadge">Overview</span>
          </div>
          <div className="analytics-chart-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={users.length ? users.map((user) => ({ name: user.department || user.role || 'Other', value: 1 })).reduce((all, item) => { const found = all.find((entry) => entry.name === item.name); if (found) found.value += 1; else all.push(item); return all }, []) : pipeline}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={85}
                  paddingAngle={4}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(users.length ? users : pipeline).map((entry, index) => (
                    <Cell key={`pie-${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
          </>
        )}
      </div>

      <div className="analytics-grid analytics-grid--tables">
        <article className="analytics-card analytics-table-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaHandshake /></span>
              Recent Deals
            </h3>
            <span className="analytics-card-subbadge">{recentDeals.length} Deals</span>
          </div>
          <div className="analytics-table-wrap">
            {recentDeals.length === 0 ? (
              <div className="analytics-empty-state">No recent deals available</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Owner</th>
                    <th>Stage</th>
                    <th style={{ textAlign: 'right' }}>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recentDeals.map((deal) => (
                    <tr key={deal.id || deal._id}>
                      <td className="analytics-td-bold">{deal.name || deal.dealName || deal.title || '-'}</td>
                      <td>{deal.ownerName || deal.dealOwner || '-'}</td>
                      <td>
                        <Badge variant={getStatusColor(deal.stage || deal.status)}>
                          {deal.stage || deal.status || '-'}
                        </Badge>
                      </td>
                      <td className="analytics-td-value" style={{ textAlign: 'right' }}>{formatCurrency(amountOf(deal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="analytics-card analytics-table-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaFileInvoiceDollar /></span>
              Quotations
            </h3>
            <span className="analytics-card-subbadge">{recentQuotations.length} Records</span>
          </div>
          <div className="analytics-table-wrap">
            {recentQuotations.length === 0 ? (
              <div className="analytics-empty-state">No quotations available</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Quotation #</th>
                    <th>Account</th>
                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentQuotations.map((quotation) => (
                    <tr key={quotation.id || quotation._id}>
                      <td className="analytics-td-bold">{quotation.quotationNumber || quotation.number || '-'}</td>
                      <td>{quotation.accountName || quotation.customerName || '-'}</td>
                      <td className="analytics-td-value" style={{ textAlign: 'right' }}>{formatCurrency(amountOf(quotation))}</td>
                      <td>{formatDate(dateOf(quotation))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="analytics-card analytics-table-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaBuilding /></span>
              Accounts
            </h3>
            <span className="analytics-card-subbadge">{accounts.length} Total</span>
          </div>
          <div className="analytics-table-wrap">
            {accounts.length === 0 ? (
              <div className="analytics-empty-state">No accounts available</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th className="analytics-col-account">Account</th>
                    <th className="analytics-col-contact">Contact Person</th>
                    <th className="analytics-col-industry">Industry</th>
                    <th className="analytics-col-status">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.slice(0, 8).map((account) => (
                    <tr key={account.id || account._id}>
                      <td className="analytics-td-bold analytics-col-account">{account.name || '-'}</td>
                      <td className="analytics-col-contact">{account.contactPerson || '-'}</td>
                      <td className="analytics-col-industry">{account.industryType || '-'}</td>
                      <td className="analytics-col-status">
                        <Badge variant={getStatusColor(account.status || account.stage)}>
                          {account.status || account.stage || 'Active'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </article>

        <article className="analytics-card analytics-table-card">
          <div className="analytics-card-header">
            <h3>
              <span className="analytics-card-badge-icon"><FaHistory /></span>
              Recent Activity Log
            </h3>
            <span className="analytics-card-subbadge">Live</span>
          </div>
          <div className="analytics-activity-list">
            {activities.length === 0 ? (
              <div className="analytics-empty-state">No recent activities</div>
            ) : (
              activities.slice(0, 8).map((activity) => (
                <div key={activity.id || activity._id} className="analytics-activity-item">
                  <div className="analytics-act-icon-wrapper">
                    <FaRegClock className="analytics-act-icon" />
                  </div>
                  <div className="analytics-act-content">
                    <strong>{activity.title || activity.action || 'Activity Recorded'}</strong>
                    <span>{activity.message || activity.description || activity.entityType || ''}</span>
                  </div>
                  <time>{formatDate(activity.createdAt || activity.timestamp)}</time>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      <div className="analytics-footer-note">
        <span>Viewing {period}-wise synchronized metrics backed by live CRM database records.</span>
      </div>
    </section>
  )
}

export default AnalyticsSection
