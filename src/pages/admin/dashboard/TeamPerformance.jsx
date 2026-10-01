import React, { useMemo } from 'react'
import { FaUsers, FaStar, FaTarget, FaMedal } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import './SalesDashboards.css'

const TeamPerformance = () => {
  const { deals, users: teamUsers } = useData()
  const { user } = useAuth()

  const teamMetrics = useMemo(() => {
    // Group deals by assigned user
    const userDeals = {}
    
    teamUsers?.forEach(u => {
      userDeals[u.id] = {
        name: u.name,
        deals: deals.filter(d => d.assigned_to === u.id || d.createdBy === u.id),
      }
    })

    const metrics = Object.entries(userDeals).map(([userId, data]) => {
      const totalDeals = data.deals.length
      const wonDeals = data.deals.filter(d => d.status === 'won').length
      const totalValue = data.deals.reduce((sum, d) => sum + (d.value || 0), 0)
      const winRate = totalDeals > 0 ? ((wonDeals / totalDeals) * 100).toFixed(1) : 0

      return {
        userId,
        name: data.name,
        totalDeals,
        wonDeals,
        totalValue,
        winRate,
      }
    }).filter(m => m.totalDeals > 0)
      .sort((a, b) => b.totalValue - a.totalValue)

    return metrics
  }, [deals, teamUsers])

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Team Performance Dashboard</h1>
        <p className="dashboard-subtitle">Individual and collective team performance metrics</p>
      </div>

      <div className="performance-stats">
        <div className="stat-box">
          <FaUsers className="stat-icon" style={{ color: '#3498db' }} />
          <div className="stat-info">
            <span className="stat-label">Team Members</span>
            <span className="stat-number">{teamMetrics.length}</span>
          </div>
        </div>

        <div className="stat-box">
          <FaStar className="stat-icon" style={{ color: '#f39c12' }} />
          <div className="stat-info">
            <span className="stat-label">Total Deals</span>
            <span className="stat-number">{teamMetrics.reduce((sum, m) => sum + m.totalDeals, 0)}</span>
          </div>
        </div>

        <div className="stat-box">
          <FaMedal className="stat-icon" style={{ color: '#27ae60' }} />
          <div className="stat-info">
            <span className="stat-label">Won Deals</span>
            <span className="stat-number">{teamMetrics.reduce((sum, m) => sum + m.wonDeals, 0)}</span>
          </div>
        </div>
      </div>

      <div className="performance-table-section">
        <h3>Team Rankings</h3>
        <div className="performance-table">
          <div className="table-header">
            <div className="table-cell col-rank">Rank</div>
            <div className="table-cell col-name">Team Member</div>
            <div className="table-cell col-deals">Total Deals</div>
            <div className="table-cell col-won">Won Deals</div>
            <div className="table-cell col-rate">Win Rate</div>
            <div className="table-cell col-value">Total Value</div>
          </div>

          {teamMetrics.map((metric, index) => (
            <div key={metric.userId} className="table-row">
              <div className="table-cell col-rank">
                <span className="rank-badge">{index + 1}</span>
              </div>
              <div className="table-cell col-name">
                <strong>{metric.name}</strong>
              </div>
              <div className="table-cell col-deals">
                <span className="cell-badge">{metric.totalDeals}</span>
              </div>
              <div className="table-cell col-won">
                <span className="cell-badge" style={{ background: '#27ae60' }}>{metric.wonDeals}</span>
              </div>
              <div className="table-cell col-rate">
                <span className="cell-badge" style={{ background: '#3498db' }}>{metric.winRate}%</span>
              </div>
              <div className="table-cell col-value">
                <strong className="value-text">${(metric.totalValue / 1000).toFixed(1)}K</strong>
              </div>
            </div>
          ))}
        </div>
      </div>

      {teamMetrics.length === 0 && (
        <div className="empty-state">
          <FaUsers className="empty-icon" />
          <p>No team performance data available</p>
        </div>
      )}
    </div>
  )
}

export default TeamPerformance
