import React, { useMemo } from 'react'
import { FaBullseye, FaCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { useData } from '../../context/DataContext'
import { formatCurrency } from '../../utils/helpers'
import './SalesDashboards.css'

const TargetProgress = () => {
  const { deals, users: teamUsers } = useData()

  // Monthly target (configurable)
  const MONTHLY_TARGET = 500000

  const targetData = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    // Calculate monthly targets for each team member
    const userTargets = {}

    teamUsers?.forEach(u => {
      const userDeals = deals.filter(d => 
        (d.assigned_to === u.id || d.createdBy === u.id) && 
        d.status === 'won'
      )

      const currentMonthDeals = userDeals.filter(d => {
        const dealDate = new Date(d.createdAt)
        return dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear
      })

      const achievedValue = currentMonthDeals.reduce((sum, d) => sum + (d.value || 0), 0)
      const target = MONTHLY_TARGET / (teamUsers.length || 1)
      const percentage = target > 0 ? ((achievedValue / target) * 100).toFixed(1) : 0

      userTargets[u.id] = {
        name: u.name,
        target,
        achieved: achievedValue,
        percentage: Math.min(percentage, 100),
        status: percentage >= 100 ? 'achieved' : percentage >= 75 ? 'on-track' : 'behind',
        dealsCount: currentMonthDeals.length,
      }
    })

    const teamAchieved = Object.values(userTargets).reduce((sum, t) => sum + t.achieved, 0)
    const teamPercentage = ((teamAchieved / MONTHLY_TARGET) * 100).toFixed(1)

    return {
      userTargets: Object.entries(userTargets)
        .map(([userId, data]) => ({ userId, ...data }))
        .sort((a, b) => b.achieved - a.achieved),
      monthlyTarget: MONTHLY_TARGET,
      teamAchieved,
      teamPercentage: Math.min(teamPercentage, 100),
      currentMonth,
    }
  }, [deals, teamUsers])

  const achievedCount = targetData.userTargets.filter(u => u.status === 'achieved').length
  const onTrackCount = targetData.userTargets.filter(u => u.status === 'on-track').length
  const behindCount = targetData.userTargets.filter(u => u.status === 'behind').length

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Target Progress Dashboard</h1>
        <p className="dashboard-subtitle">Achievement vs targets for team members</p>
      </div>

      <div className="target-summary">
        <div className="target-card">
          <FaBullseye className="target-icon" style={{ color: '#3498db' }} />
          <div className="target-info">
            <span className="target-label">Monthly Target</span>
            <span className="target-value">{formatCurrency(targetData.monthlyTarget)}</span>
          </div>
        </div>

        <div className="target-card">
          <FaCheckCircle className="target-icon" style={{ color: '#27ae60' }} />
          <div className="target-info">
            <span className="target-label">Team Achieved</span>
            <span className="target-value">{formatCurrency(targetData.teamAchieved)}</span>
          </div>
        </div>

        <div className="target-card">
          <FaTimesCircle className="target-icon" style={{ color: '#e74c3c' }} />
          <div className="target-info">
            <span className="target-label">Remaining</span>
            <span className="target-value">
              {formatCurrency(Math.max(0, targetData.monthlyTarget - targetData.teamAchieved))}
            </span>
          </div>
        </div>
      </div>

      <div className="team-target-progress">
        <h3>Team Progress: {targetData.teamPercentage}%</h3>
        <div className="progress-bar-container">
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{
                width: `${targetData.teamPercentage}%`,
                background: targetData.teamPercentage >= 100 ? '#27ae60' : 
                           targetData.teamPercentage >= 75 ? '#f39c12' : '#e74c3c',
              }}
            />
          </div>
          <div className="progress-text">
            {formatCurrency(targetData.teamAchieved)} / {formatCurrency(targetData.monthlyTarget)}
          </div>
        </div>
      </div>

      <div className="status-overview">
        <div className="status-item" style={{ borderColor: '#27ae60' }}>
          <span className="status-count achieved">{achievedCount}</span>
          <span className="status-label">Achieved Target</span>
        </div>
        <div className="status-item" style={{ borderColor: '#f39c12' }}>
          <span className="status-count on-track">{onTrackCount}</span>
          <span className="status-label">On Track</span>
        </div>
        <div className="status-item" style={{ borderColor: '#e74c3c' }}>
          <span className="status-count behind">{behindCount}</span>
          <span className="status-label">Behind Target</span>
        </div>
      </div>

      <div className="individual-targets">
        <h3>Individual Target Progress</h3>
        <div className="targets-list">
          {targetData.userTargets.map(user => (
            <div key={user.userId} className="target-item">
              <div className="target-item-header">
                <span className="target-item-name">{user.name}</span>
                <span className={`target-item-status status-${user.status}`}>
                  {user.status === 'achieved' ? '✓ Achieved' : 
                   user.status === 'on-track' ? '◐ On Track' : '✗ Behind'}
                </span>
              </div>

              <div className="target-item-progress">
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{
                      width: `${user.percentage}%`,
                      background: user.status === 'achieved' ? '#27ae60' :
                                 user.status === 'on-track' ? '#f39c12' : '#e74c3c',
                    }}
                  />
                </div>
                <span className="progress-percent">{user.percentage}%</span>
              </div>

              <div className="target-item-details">
                <span>Achieved: {formatCurrency(user.achieved)}</span>
                <span>Target: {formatCurrency(user.target)}</span>
                <span>Deals: {user.dealsCount}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TargetProgress
