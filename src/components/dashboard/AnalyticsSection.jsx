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
import { userApi } from '../../services/userApi'
import ChartRenderer from './ChartRenderer'
import { useAuth } from '../../context/AuthContext'

const COLORS = ['#0284c7', '#16a34a', '#ea580c', '#9333ea', '#dc2626', '#0891b2', '#4f46e5', '#ca8a04']

const normalize = (value) => String(value || '').trim().toLowerCase()
const amountOf = (item) => Number(item?.total || item?.grandTotal || item?.value || item?.amount || 0) || 0
const dateOf = (item) => item?.createdAt || item?.accountDate || item?.customerDate || item?.date || item?.dealDate || item?.quotationDate || item?.updatedAt
const ownerOf = (item) => (
  item?.ownerName
  || item?.accountOwner
  || item?.accountOwnerName
  || item?.dealOwner
  || item?.dealOwnerName
  || item?.customerOwner
  || item?.createdByName
  || item?.createdBy
  || item?.createdByEmail
  || item?.assignedToName
  || item?.assignedTo
  || item?.accountOwnerEmail
  || item?.dealOwnerEmail
  || item?.ownerEmail
  || item?.userEmail
  || item?.owner
  || ''
)

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

const formatStatusLabel = (value, fallback = 'Status') => {
  const text = String(value || '').trim()
  if (!text) return fallback
  return text
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

const matchesOwner = (item, ownerFilter) => {
  if (!ownerFilter || ownerFilter === 'all') return true
  const owner = normalize(ownerOf(item))
  return owner && owner === normalize(ownerFilter)
}

const buildOwnerOptions = (records, user, systemUsers = [], isAdmin = true) => {
  const currentUserName = String(user?.name || user?.ownerDisplayName || user?.fullName || user?.displayName || user?.username || user?.email || '').trim()
  if (!isAdmin && currentUserName) {
    return [currentUserName]
  }
  const ownerMap = new Map()
  const addOwner = (value) => {
    const name = String(value || '').trim()
    if (!name) return
    const key = normalize(name)
    if (!ownerMap.has(key)) ownerMap.set(key, name)
  }
  addOwner(currentUserName)
  records.forEach((record) => {
    addOwner(ownerOf(record))
  })
  systemUsers.forEach((u) => {
    const primaryName = u?.name || u?.ownerDisplayName || u?.fullName || u?.displayName || u?.username || u?.email
    if (primaryName) addOwner(primaryName)
  })
  return ['all', ...Array.from(ownerMap.values()).sort((a, b) => a.localeCompare(b))]
}

const buildWorkTrendData = (records, ownerFilter, period = 'month') => {
  const now = new Date()
  const isYear = period === 'year'
  const isDay = period === 'day'
  const isWeek = period === 'week'
  const length = isDay ? 7 : isYear ? 5 : 6

  const buckets = Array.from({ length }).map((_, index) => {
    const date = new Date(now)
    if (isDay) {
      date.setDate(now.getDate() - (6 - index))
      return { key: date.toISOString().slice(0, 10), name: date.toLocaleDateString('en-IN', { weekday: 'short' }), value: 0 }
    }
    if (isWeek) {
      date.setDate(now.getDate() - ((5 - index) * 7))
      const start = new Date(date)
      start.setDate(date.getDate() - date.getDay())
      return { key: start.toISOString().slice(0, 10), name: `W${index + 1}`, value: 0 }
    }
    if (isYear) {
      const targetYear = now.getFullYear() - (4 - index)
      return { key: String(targetYear), name: String(targetYear), value: 0 }
    }
    date.setMonth(now.getMonth() - (5 - index), 1)
    return { key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`, name: date.toLocaleDateString('en-IN', { month: 'short' }), value: 0 }
  })
  const lookup = buckets.reduce((acc, bucket) => ({ ...acc, [bucket.key]: bucket }), {})

  records.filter((record) => matchesOwner(record, ownerFilter)).forEach((record) => {
    const parsed = new Date(dateOf(record))
    if (Number.isNaN(parsed.getTime())) return
    let key = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}`
    if (isDay) {
      key = parsed.toISOString().slice(0, 10)
    } else if (isWeek) {
      const start = new Date(parsed)
      start.setDate(parsed.getDate() - parsed.getDay())
      key = start.toISOString().slice(0, 10)
    } else if (isYear) {
      key = String(parsed.getFullYear())
    }
    if (lookup[key]) lookup[key].value += 1
  })

  return buckets
}

const buildFunnelData = (deals, ownerFilter) => {
  const filtered = deals.filter((deal) => matchesOwner(deal, ownerFilter))
  const counts = filtered.reduce((acc, deal) => {
    const stage = formatStatusLabel(deal.stage || deal.status || deal.dealStatus, 'Lead Qualified')
    acc[stage] = (acc[stage] || 0) + 1
    return acc
  }, {})

  const stagesInOrder = [
    { name: 'Lead Qualified', value: counts['Lead Qualified'] || counts['Lead'] || counts['New'] || 0 },
    { name: 'Proposal Sent', value: counts['Proposal Sent'] || counts['Proposal'] || counts['Quotation'] || 0 },
    { name: 'Negotiation', value: counts['Negotiation'] || counts['In Negotiation'] || 0 },
    { name: 'Deal Won', value: counts['Deal Won'] || counts['Won'] || counts['Converted'] || 0 },
    { name: 'Deal Lost', value: counts['Deal Lost'] || counts['Lost'] || counts['Rejected'] || 0 },
  ]

  const hasAnyData = stagesInOrder.some((s) => s.value > 0)
  if (!hasAnyData && filtered.length > 0) {
    return Object.entries(counts).slice(0, 5).map(([name, value]) => ({ name, value }))
  }

  return stagesInOrder
}

const CustomChartTooltip = ({ active, payload, label, isAdmin = true, currentUser = null }) => {
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
  const { user, isAdmin } = useAuth()
  const [period, setPeriod] = useState('month')
  const [liveEntity, setLiveEntity] = useState('Accounts')
  const currentUserName = String(user?.name || user?.ownerDisplayName || user?.fullName || user?.displayName || user?.username || user?.email || '').trim()
  const [ownerFilter, setOwnerFilter] = useState(() => (isAdmin ? 'all' : currentUserName || 'all'))
  const [directoryUsers, setDirectoryUsers] = useState([])
  const activeOwnerFilter = isAdmin ? ownerFilter : (currentUserName || 'all')

  const [dbCharts, setDbCharts] = useState([])
  const [chartDataMap, setChartDataMap] = useState({})
  const [loadingCharts, setLoadingCharts] = useState(true)
  const scopedAccounts = useMemo(() => (isAdmin ? accounts : accounts.filter((item) => matchesOwner(item, activeOwnerFilter))), [accounts, activeOwnerFilter, isAdmin])
  const scopedDeals = useMemo(() => (isAdmin ? deals : deals.filter((item) => matchesOwner(item, activeOwnerFilter))), [deals, activeOwnerFilter, isAdmin])
  const scopedCustomers = useMemo(() => (isAdmin ? customers : customers.filter((item) => matchesOwner(item, activeOwnerFilter))), [customers, activeOwnerFilter, isAdmin])
  const scopedQuotations = useMemo(() => (isAdmin ? quotations : quotations.filter((item) => matchesOwner(item, activeOwnerFilter))), [quotations, activeOwnerFilter, isAdmin])
  const chartData = useMemo(() => buildMonthlyData(scopedDeals, scopedQuotations), [scopedDeals, scopedQuotations])
  const visibleDbCharts = useMemo(() => (isAdmin ? dbCharts.slice(0, 2) : []), [dbCharts, isAdmin])
  const chartListPath = location.pathname.startsWith('/admin') ? '/admin/charts' : '/charts'

  const liveRecords = useMemo(() => {
    switch (liveEntity) {
      case 'Deals':
        return scopedDeals
      case 'Quotations':
        return scopedQuotations
      case 'Customers':
        return scopedCustomers
      case 'Accounts':
      default:
        return scopedAccounts
    }
  }, [liveEntity, scopedAccounts, scopedDeals, scopedQuotations, scopedCustomers])

  const allAnalyticsRecords = useMemo(() => (
    [...scopedAccounts, ...scopedDeals, ...scopedCustomers, ...scopedQuotations]
  ), [scopedAccounts, scopedCustomers, scopedDeals, scopedQuotations])

  const ownerOptions = useMemo(() => buildOwnerOptions(allAnalyticsRecords, user, [...users, ...directoryUsers], isAdmin), [allAnalyticsRecords, directoryUsers, user, users, isAdmin])
  const ownerScopedDeals = useMemo(() => scopedDeals.filter((deal) => matchesOwner(deal, activeOwnerFilter)), [scopedDeals, activeOwnerFilter])
  const workTrendData = useMemo(() => buildWorkTrendData(liveRecords, activeOwnerFilter, period), [liveRecords, activeOwnerFilter, period])
  const dailyAccountsData = useMemo(() => buildWorkTrendData(scopedAccounts, activeOwnerFilter, period), [scopedAccounts, activeOwnerFilter, period])
  const dailyDealsData = useMemo(() => buildWorkTrendData(scopedDeals, activeOwnerFilter, period), [scopedDeals, activeOwnerFilter, period])
  const dailyQuotationsData = useMemo(() => buildWorkTrendData(scopedQuotations, activeOwnerFilter, period), [scopedQuotations, activeOwnerFilter, period])
  const dailyCustomersData = useMemo(() => buildWorkTrendData(scopedCustomers, activeOwnerFilter, period), [scopedCustomers, activeOwnerFilter, period])
  const funnelData = useMemo(() => buildFunnelData(scopedDeals, activeOwnerFilter), [scopedDeals, activeOwnerFilter])

  const pipeline = useMemo(() => {
    const counts = ownerScopedDeals.reduce((result, deal) => {
      const key = String(deal.stage || deal.status || 'unknown').replace(/_/g, ' ')
      result[key] = (result[key] || 0) + 1
      return result
    }, {})
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [ownerScopedDeals])

  const recentDeals = useMemo(() => [...scopedDeals].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))).slice(0, 8), [scopedDeals])
  const recentQuotations = useMemo(() => [...scopedQuotations].sort((a, b) => new Date(dateOf(b)) - new Date(dateOf(a))).slice(0, 8), [scopedQuotations])

  const totalQuotationVal = useMemo(() => scopedQuotations.reduce((sum, q) => sum + amountOf(q), 0), [scopedQuotations])
  const kpiCards = useMemo(() => ([
    {
      key: 'accounts',
      label: 'Accounts',
      collection: 'leads',
      value: scopedAccounts.length,
      monthValue: scopedAccounts.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaBuilding,
    },
    {
      key: 'deals',
      label: 'Deals',
      collection: 'deals',
      value: scopedDeals.length,
      monthValue: scopedDeals.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaHandshake,
    },
    {
      key: 'customers',
      label: 'Customers',
      collection: 'customers',
      value: scopedCustomers.length,
      monthValue: scopedCustomers.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaUsers,
    },
    {
      key: 'quotations',
      label: 'Quotations',
      collection: 'quotations',
      value: scopedQuotations.length,
      monthValue: scopedQuotations.filter((item) => isCurrentMonth(dateOf(item))).length,
      icon: FaFileInvoiceDollar,
    },
  ]), [scopedAccounts, scopedCustomers, scopedDeals, scopedQuotations])

  useEffect(() => {
    let isMounted = true
    userApi.listDirectory()
      .then((result) => {
        if (isMounted && Array.isArray(result)) setDirectoryUsers(result)
      })
      .catch(() => {
        if (isMounted) setDirectoryUsers([])
      })
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadCharts = async () => {
      try {
        setLoadingCharts(true)
        const [chartsRes, templatesRes] = await Promise.allSettled([chartApi.listCharts(), chartApi.listTemplates()])
        const chartsList = chartsRes.status === 'fulfilled' && Array.isArray(chartsRes.value) ? chartsRes.value : []
        const templatesList = templatesRes.status === 'fulfilled' && Array.isArray(templatesRes.value) ? templatesRes.value : []
        const charts = [...chartsList, ...templatesList]
        if (!isMounted) return
        if (Array.isArray(charts) && charts.length > 0) {
          setDbCharts(charts)
          const dataPromises = charts.map(async (chart) => {
            try {
              const data = await chartApi.getChartData(chart._id || chart.id, { period })
              return { id: chart._id || chart.id, data }
            } catch (err) {
              console.warn(`Chart data note for chart ${chart._id}:`, err?.message || err)
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
          <div className="analytics-filter-wrap">
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
              aria-label="Analytics period"
              className="analytics-select"
            >
              <option value="month">Month wise</option>
              <option value="day">Day wise</option>
              <option value="year">Year wise</option>
            </select>
          </div>

          <div className="analytics-filter-wrap">
            <select
              value={liveEntity}
              onChange={(event) => setLiveEntity(event.target.value)}
              aria-label="Live Chart Entity"
              className="analytics-select"
            >
              <option value="Accounts">Accounts</option>
              <option value="Deals">Deals</option>
              <option value="Quotations">Quotations</option>
              <option value="Customers">Customers</option>
            </select>
          </div>

          {isAdmin && (
            <div className="analytics-filter-wrap">
              <select
                value={activeOwnerFilter}
                onChange={(event) => setOwnerFilter(event.target.value)}
                aria-label="Analytics owner"
                className="analytics-select analytics-select--owner"
              >
                {ownerOptions.map((owner) => (
                  <option key={owner} value={owner}>
                    {owner === 'all' ? 'All Users' : owner}
                  </option>
                ))}
              </select>
            </div>
          )}

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
        <ChartRenderer
          config={{
            _id: 'live-owner-funnel',
            title: `Sales Conversion Funnel - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Funnel',
            entity: 'Deals',
          }}
          data={{
            data: funnelData.length ? funnelData : [{ name: 'No Deals', value: 0 }],
            labels: (funnelData.length ? funnelData : [{ name: 'No Deals', value: 0 }]).map((entry) => entry.name),
            values: (funnelData.length ? funnelData : [{ name: 'No Deals', value: 0 }]).map((entry) => entry.value),
          }}
          loading={false}
        />
        <ChartRenderer
          config={{
            _id: 'live-daily-work',
            title: `${period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} ${liveEntity} Work - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Line',
            entity: liveEntity,
          }}
          data={{ data: workTrendData }}
          loading={false}
        />
        <ChartRenderer
          config={{
            _id: 'live-daily-accounts',
            title: `${period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Accounts Added - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Bar',
            entity: 'Accounts',
          }}
          data={{ data: dailyAccountsData }}
          loading={false}
        />
        <ChartRenderer
          config={{
            _id: 'live-daily-deals',
            title: `${period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Deals Created - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Bar',
            entity: 'Deals',
          }}
          data={{ data: dailyDealsData }}
          loading={false}
        />
        <ChartRenderer
          config={{
            _id: 'live-daily-quotations',
            title: `${period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Quotations Generated - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Line',
            entity: 'Quotations',
          }}
          data={{ data: dailyQuotationsData }}
          loading={false}
        />
        <ChartRenderer
          config={{
            _id: 'live-daily-customers',
            title: `${period === 'day' ? 'Daily' : period === 'week' ? 'Weekly' : 'Monthly'} Customers Added - ${activeOwnerFilter === 'all' ? 'All Users' : activeOwnerFilter}`,
            chartType: 'Bar',
            entity: 'Customers',
          }}
          data={{ data: dailyCustomersData }}
          loading={false}
        />
        {visibleDbCharts.length > 0 ? (
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
            <ChartRenderer
              config={{ _id: 'fallback-funnel', title: 'Sales Conversion Funnel', chartType: 'Funnel', entity: 'Deals' }}
              data={{ data: pipeline.length ? pipeline : [{ name: 'No Deals', value: 0 }] }}
              loading={loadingCharts}
            />
            <ChartRenderer
              config={{ _id: 'fallback-trend', title: 'Deal Volume Trend', chartType: 'Line', entity: 'Deals' }}
              data={{ labels: chartData.map((d) => d.name), values: chartData.map((d) => d.newDeals) }}
              loading={loadingCharts}
            />
            <ChartRenderer
              config={{ _id: 'fallback-pipeline', title: 'Pipeline Stages', chartType: 'Bar', entity: 'Deals' }}
              data={{ labels: pipeline.map((d) => d.name), values: pipeline.map((d) => d.value) }}
              loading={loadingCharts}
            />
            <ChartRenderer
              config={{ _id: 'fallback-quotation', title: 'Quotation Value Trend', chartType: 'Bar', entity: 'Quotations' }}
              data={{ labels: chartData.map((d) => d.name), values: chartData.map((d) => d.quotationValue) }}
              loading={loadingCharts}
            />
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
