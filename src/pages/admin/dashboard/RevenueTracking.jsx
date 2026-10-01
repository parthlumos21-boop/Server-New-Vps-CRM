import React, { useMemo } from 'react'
import { FaMoneyBillWave, FaTrendingUp, FaCalendarAlt } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { formatCurrency } from '../../utils/helpers'
import './SalesDashboards.css'

const RevenueTracking = () => {
  const { deals } = useData()

  const revenueData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    const months = [
      { label: 'Jan', month: 0 },
      { label: 'Feb', month: 1 },
      { label: 'Mar', month: 2 },
      { label: 'Apr', month: 3 },
      { label: 'May', month: 4 },
      { label: 'Jun', month: 5 },
      { label: 'Jul', month: 6 },
      { label: 'Aug', month: 7 },
      { label: 'Sep', month: 8 },
      { label: 'Oct', month: 9 },
      { label: 'Nov', month: 10 },
      { label: 'Dec', month: 11 },
    ]

    const monthlyRevenue = {}
    const monthlyWon = {}

    months.forEach(({ label, month }) => {
      monthlyRevenue[month] = 0
      monthlyWon[month] = 0
    })

    deals.forEach(deal => {
      if (deal.createdAt) {
        const dealDate = new Date(deal.createdAt)
        if (dealDate.getFullYear() === currentYear) {
          const month = dealDate.getMonth()
          monthlyRevenue[month] += deal.value || 0
          if (deal.status === 'won') {
            monthlyWon[month] += deal.value || 0
          }
        }
      }
    })

    const monthlyData = months.map(({ label, month }) => ({
      label,
      month,
      revenue: monthlyRevenue[month] || 0,
      won: monthlyWon[month] || 0,
    }))

    const totalYearlyRevenue = Object.values(monthlyRevenue).reduce((sum, v) => sum + v, 0)
    const totalYearlyWon = Object.values(monthlyWon).reduce((sum, v) => sum + v, 0)
    const avgMonthlyRevenue = currentMonth > 0 ? totalYearlyRevenue / (currentMonth + 1) : 0

    return {
      monthlyData,
      totalYearlyRevenue,
      totalYearlyWon,
      avgMonthlyRevenue,
      currentMonth,
    }
  }, [deals])

  const maxRevenue = Math.max(...revenueData.monthlyData.map(m => m.revenue), 1)

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Revenue Tracking Dashboard</h1>
        <p className="dashboard-subtitle">Monthly and quarterly revenue trends</p>
      </div>

      <div className="revenue-overview">
        <div className="overview-card">
          <FaMoneyBillWave className="overview-icon" style={{ color: '#27ae60' }} />
          <div className="overview-content">
            <span className="overview-label">Yearly Revenue</span>
            <span className="overview-value">{formatCurrency(revenueData.totalYearlyRevenue)}</span>
          </div>
        </div>

        <div className="overview-card">
          <FaTrendingUp className="overview-icon" style={{ color: '#3498db' }} />
          <div className="overview-content">
            <span className="overview-label">Average Monthly</span>
            <span className="overview-value">{formatCurrency(revenueData.avgMonthlyRevenue)}</span>
          </div>
        </div>

        <div className="overview-card">
          <FaCalendarAlt className="overview-icon" style={{ color: '#f39c12' }} />
          <div className="overview-content">
            <span className="overview-label">Won Revenue</span>
            <span className="overview-value">{formatCurrency(revenueData.totalYearlyWon)}</span>
          </div>
        </div>
      </div>

      <div className="monthly-revenue-section">
        <h3>Monthly Revenue Breakdown</h3>
        <div className="monthly-chart">
          <div className="chart-bars">
            {revenueData.monthlyData.map(month => (
              <div key={month.label} className="month-bar-container">
                <div className="month-bars">
                  <div 
                    className="bar total-bar"
                    style={{
                      height: `${(month.revenue / maxRevenue) * 200}px`,
                    }}
                    title={`${month.label}: ${formatCurrency(month.revenue)}`}
                  />
                  {month.won > 0 && (
                    <div 
                      className="bar won-bar"
                      style={{
                        height: `${(month.won / maxRevenue) * 200}px`,
                      }}
                      title={`${month.label} Won: ${formatCurrency(month.won)}`}
                    />
                  )}
                </div>
                <span className="month-label">{month.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="chart-legend">
          <div className="legend-item">
            <div className="legend-box total-bar" />
            <span>Total Revenue</span>
          </div>
          <div className="legend-item">
            <div className="legend-box won-bar" />
            <span>Won Revenue</span>
          </div>
        </div>
      </div>

      <div className="quarterly-section">
        <h3>Quarterly Summary</h3>
        <div className="quarterly-grid">
          {[
            { quarter: 'Q1', months: [0, 1, 2] },
            { quarter: 'Q2', months: [3, 4, 5] },
            { quarter: 'Q3', months: [6, 7, 8] },
            { quarter: 'Q4', months: [9, 10, 11] },
          ].map(q => {
            const quarterlyRevenue = q.months.reduce((sum, m) => {
              const monthData = revenueData.monthlyData.find(md => md.month === m)
              return sum + (monthData?.revenue || 0)
            }, 0)

            return (
              <div key={q.quarter} className="quarterly-card">
                <h4>{q.quarter}</h4>
                <p className="quarterly-value">{formatCurrency(quarterlyRevenue)}</p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default RevenueTracking
