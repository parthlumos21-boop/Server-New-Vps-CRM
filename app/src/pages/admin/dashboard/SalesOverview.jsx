import React, { useMemo } from 'react'
import { FaChartLine, FaTrophy, FaChartBar, FaPercentage } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { formatCurrency } from '../../utils/helpers'
import './SalesDashboards.css'

const SalesOverview = () => {
  const { deals, accounts } = useData()
  const { user } = useAuth()

  const metrics = useMemo(() => {
    const totalDeals = deals.length
    const wonDeals = deals.filter(d => d.status === 'won').length
    const lostDeals = deals.filter(d => d.status === 'lost').length
    const activeDeal = totalDeals - wonDeals - lostDeals
    
    const totalRevenue = deals.reduce((sum, d) => sum + (d.value || 0), 0)
    const wonRevenue = deals
      .filter(d => d.status === 'won')
      .reduce((sum, d) => sum + (d.value || 0), 0)
    
    const conversionRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0
    const avgDealValue = totalDeals > 0 ? (totalRevenue / totalDeals).toFixed(2) : 0

    return {
      totalDeals,
      wonDeals,
      lostDeals,
      activeDeal,
      totalRevenue,
      wonRevenue,
      conversionRate,
      avgDealValue,
      totalAccounts: accounts.length,
    }
  }, [deals, accounts])

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Sales Overview Dashboard</h1>
        <p className="dashboard-subtitle">Complete sales metrics and performance overview</p>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
            <FaChartLine />
          </div>
          <div className="metric-content">
            <span className="metric-label">Total Deals</span>
            <span className="metric-value">{metrics.totalDeals}</span>
            <span className="metric-subtext">All opportunities</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #27ae60, #1e8449)' }}>
            <FaTrophy />
          </div>
          <div className="metric-content">
            <span className="metric-label">Won Deals</span>
            <span className="metric-value">{metrics.wonDeals}</span>
            <span className="metric-subtext">Closed successfully</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #e74c3c, #c0392b)' }}>
            <FaChartBar />
          </div>
          <div className="metric-content">
            <span className="metric-label">Lost Deals</span>
            <span className="metric-value">{metrics.lostDeals}</span>
            <span className="metric-subtext">Closed unsuccessful</span>
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-icon" style={{ background: 'linear-gradient(135deg, #f39c12, #d68910)' }}>
            <FaPercentage />
          </div>
          <div className="metric-content">
            <span className="metric-label">Conversion Rate</span>
            <span className="metric-value">{metrics.conversionRate}%</span>
            <span className="metric-subtext">Win rate</span>
          </div>
        </div>
      </div>

      <div className="revenue-section">
        <div className="revenue-card">
          <h3>Total Revenue</h3>
          <p className="revenue-value">{formatCurrency(metrics.totalRevenue)}</p>
          <p className="revenue-label">From all deals</p>
        </div>

        <div className="revenue-card">
          <h3>Won Revenue</h3>
          <p className="revenue-value">{formatCurrency(metrics.wonRevenue)}</p>
          <p className="revenue-label">From won deals</p>
        </div>

        <div className="revenue-card">
          <h3>Average Deal Value</h3>
          <p className="revenue-value">{formatCurrency(metrics.avgDealValue)}</p>
          <p className="revenue-label">Per deal</p>
        </div>

        <div className="revenue-card">
          <h3>Active Deals</h3>
          <p className="revenue-value">{metrics.activeDeal}</p>
          <p className="revenue-label">In progress</p>
        </div>
      </div>

      <div className="summary-section">
        <h3>Quick Summary</h3>
        <ul className="summary-list">
          <li>Total Accounts: <strong>{metrics.totalAccounts}</strong></li>
          <li>Total Deals: <strong>{metrics.totalDeals}</strong></li>
          <li>Win Rate: <strong>{metrics.conversionRate}%</strong></li>
          <li>Average Deal Value: <strong>{formatCurrency(metrics.avgDealValue)}</strong></li>
          <li>Total Revenue: <strong>{formatCurrency(metrics.totalRevenue)}</strong></li>
        </ul>
      </div>
    </div>
  )
}

export default SalesOverview
