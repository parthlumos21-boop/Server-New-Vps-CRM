import React, { useMemo } from 'react'
import { FaCrystalBall, FaArrowTrendingUp, FaChartLine } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { formatCurrency } from '../../utils/helpers'
import './SalesDashboards.css'

const ForecastReports = () => {
  const { deals } = useData()

  const forecastData = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()

    // Calculate historical trends
    const monthlyData = {}
    for (let i = 0; i < 12; i++) {
      monthlyData[i] = { total: 0, count: 0, won: 0 }
    }

    deals.forEach(deal => {
      if (deal.createdAt) {
        const dealDate = new Date(deal.createdAt)
        if (dealDate.getFullYear() === currentYear) {
          const month = dealDate.getMonth()
          monthlyData[month].total += deal.value || 0
          monthlyData[month].count += 1
          if (deal.status === 'won') {
            monthlyData[month].won += deal.value || 0
          }
        }
      }
    })

    // Calculate average and trend
    const completedMonths = currentMonth + 1
    let totalRevenue = 0
    let totalWon = 0
    let dealCount = 0

    for (let i = 0; i < completedMonths; i++) {
      totalRevenue += monthlyData[i].total
      totalWon += monthlyData[i].won
      dealCount += monthlyData[i].count
    }

    const avgMonthlyRevenue = completedMonths > 0 ? totalRevenue / completedMonths : 0
    const avgMonthlyWon = completedMonths > 0 ? totalWon / completedMonths : 0
    const avgDealsPerMonth = completedMonths > 0 ? dealCount / completedMonths : 0

    // Forecast for remaining months
    const forecastedRevenue = avgMonthlyRevenue * (12 - completedMonths)
    const forecastedWon = avgMonthlyWon * (12 - completedMonths)
    const forecastedDeals = Math.round(avgDealsPerMonth * (12 - completedMonths))

    // Year-end projection
    const projectedYearlyRevenue = totalRevenue + forecastedRevenue
    const projectedYearlyWon = totalWon + forecastedWon
    const projectedWinRate = dealCount > 0 ? ((totalWon / totalRevenue) * 100).toFixed(1) : 0

    // Growth trend (compare last 3 months with previous 3 months if available)
    let recentTrend = 0
    if (completedMonths >= 6) {
      const recent3 = monthlyData[currentMonth].total + 
                     (currentMonth > 0 ? monthlyData[currentMonth - 1].total : 0) +
                     (currentMonth > 1 ? monthlyData[currentMonth - 2].total : 0)
      const previous3 = monthlyData[Math.max(0, currentMonth - 3)].total +
                       monthlyData[Math.max(0, currentMonth - 4)].total +
                       monthlyData[Math.max(0, currentMonth - 5)].total
      if (previous3 > 0) {
        recentTrend = (((recent3 - previous3) / previous3) * 100).toFixed(1)
      }
    }

    return {
      monthlyData,
      currentMonth,
      completedMonths,
      avgMonthlyRevenue,
      avgMonthlyWon,
      avgDealsPerMonth,
      totalYearRevenue: totalRevenue,
      totalYearWon: totalWon,
      forecastedRevenue,
      forecastedWon,
      forecastedDeals,
      projectedYearlyRevenue,
      projectedYearlyWon,
      projectedWinRate,
      recentTrend,
    }
  }, [deals])

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Forecast Reports Dashboard</h1>
        <p className="dashboard-subtitle">Sales forecasting and trend predictions</p>
      </div>

      <div className="forecast-stats">
        <div className="forecast-stat">
          <FaChartLine className="forecast-icon" style={{ color: '#3498db' }} />
          <div className="forecast-content">
            <span className="forecast-label">Year-to-Date Revenue</span>
            <span className="forecast-value">{formatCurrency(forecastData.totalYearRevenue)}</span>
          </div>
        </div>

        <div className="forecast-stat">
          <FaCrystalBall className="forecast-icon" style={{ color: '#9b59b6' }} />
          <div className="forecast-content">
            <span className="forecast-label">Forecasted Remaining</span>
            <span className="forecast-value">{formatCurrency(forecastData.forecastedRevenue)}</span>
          </div>
        </div>

        <div className="forecast-stat">
          <FaArrowTrendingUp className="forecast-icon" style={{ color: '#27ae60' }} />
          <div className="forecast-content">
            <span className="forecast-label">Projected Year-End</span>
            <span className="forecast-value">{formatCurrency(forecastData.projectedYearlyRevenue)}</span>
          </div>
        </div>
      </div>

      <div className="forecast-section">
        <h3>Monthly Forecast</h3>
        <div className="forecast-details">
          <div className="detail-row">
            <span className="detail-label">Completed Months:</span>
            <span className="detail-value">{forecastData.completedMonths}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Average Monthly Revenue:</span>
            <span className="detail-value">{formatCurrency(forecastData.avgMonthlyRevenue)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Average Deals per Month:</span>
            <span className="detail-value">{forecastData.avgDealsPerMonth.toFixed(1)}</span>
          </div>
          <div className="detail-row">
            <span className="detail-label">Recent Trend (last 3 months):</span>
            <span className={`detail-value ${forecastData.recentTrend >= 0 ? 'positive' : 'negative'}`}>
              {forecastData.recentTrend >= 0 ? '+' : ''}{forecastData.recentTrend}%
            </span>
          </div>
        </div>
      </div>

      <div className="forecast-section">
        <h3>Year-End Projection</h3>
        <div className="projection-grid">
          <div className="projection-card">
            <h4>Total Revenue</h4>
            <p className="projection-value">{formatCurrency(forecastData.projectedYearlyRevenue)}</p>
            <p className="projection-desc">Based on current trend</p>
          </div>

          <div className="projection-card">
            <h4>Won Revenue</h4>
            <p className="projection-value">{formatCurrency(forecastData.projectedYearlyWon)}</p>
            <p className="projection-desc">From closed deals</p>
          </div>

          <div className="projection-card">
            <h4>Projected Deals</h4>
            <p className="projection-value">{Math.round(
              (forecastData.totalYearRevenue / forecastData.avgMonthlyRevenue) * 
              (12 / forecastData.completedMonths)
            )}</p>
            <p className="projection-desc">For full year</p>
          </div>

          <div className="projection-card">
            <h4>Win Rate</h4>
            <p className="projection-value">{forecastData.projectedWinRate}%</p>
            <p className="projection-desc">Current rate</p>
          </div>
        </div>
      </div>

      <div className="forecast-chart">
        <h3>Revenue Trend</h3>
        <div className="trend-visualization">
          {[...Array(12)].map((_, month) => {
            const data = forecastData.monthlyData[month]
            const isCompleted = month < forecastData.completedMonths
            const maxValue = Math.max(...Object.values(forecastData.monthlyData).map(m => m.total), 1)
            const forecastHeight = isCompleted ? 0 : (forecastData.avgMonthlyRevenue / maxValue) * 200

            return (
              <div key={month} className="trend-bar">
                {isCompleted && (
                  <div 
                    className="bar actual"
                    style={{ height: `${(data.total / maxValue) * 200}px` }}
                    title={`Month ${month + 1}: ${formatCurrency(data.total)}`}
                  />
                )}
                {!isCompleted && (
                  <div 
                    className="bar forecast"
                    style={{ height: `${forecastHeight}px` }}
                    title={`Forecasted: ${formatCurrency(forecastData.avgMonthlyRevenue)}`}
                  />
                )}
                <span className="bar-label">M{month + 1}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="forecast-legend">
        <div className="legend-item">
          <div className="legend-box actual" />
          <span>Actual Revenue</span>
        </div>
        <div className="legend-item">
          <div className="legend-box forecast" />
          <span>Forecasted Revenue</span>
        </div>
      </div>
    </div>
  )
}

export default ForecastReports
