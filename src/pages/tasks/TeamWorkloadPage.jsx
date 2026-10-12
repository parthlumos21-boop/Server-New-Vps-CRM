import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUsers,
  FaSyncAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTasks,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import workManagementService from '../../services/workManagementService'

export const TeamWorkloadPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [members, setMembers] = useState([])

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const currentUserEmail = String(user?.email || user?.username || '').trim().toLowerCase()

  const fetchWorkload = async () => {
    try {
      setLoading(true)
      const data = await workManagementService.getTeamWorkload()
      setMembers(data?.members || [])
    } catch (err) {
      console.error('Failed to load workload data', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWorkload()
  }, [])

  const visibleMembers = isAdmin
    ? members
    : members.filter((m) => String(m.email).toLowerCase() === currentUserEmail)

  const overloadedCount = visibleMembers.filter((m) => m.workloadPercent > 100).length
  const optimalCount = visibleMembers.filter((m) => m.workloadPercent >= 50 && m.workloadPercent <= 100).length
  const availableCount = visibleMembers.filter((m) => m.workloadPercent < 50).length

  return (
    <TaskWorkspaceLayout activeTabKey="workload">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            {isAdmin ? 'Team Workload & Resource Capacity Matrix' : 'My Personal Capacity'}
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Weekly 40-hour capacity allocation derived from active assigned tasks
          </p>
        </div>
        <button
          type="button"
          className="ap-header-item-btn"
          onClick={fetchWorkload}
          title="Refresh Workload Matrix"
        >
          <FaSyncAlt />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Overview */}
      {isAdmin && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.85rem',
            marginBottom: '1.25rem',
          }}
        >
          <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Overloaded Members (&gt;100%)</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: overloadedCount > 0 ? '#dc2626' : '#15803d', marginTop: '0.2rem' }}>
              {overloadedCount}
            </div>
          </div>

          <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Optimal Utilization (50-100%)</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#15803d', marginTop: '0.2rem' }}>
              {optimalCount}
            </div>
          </div>

          <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Available Capacity (&lt;50%)</span>
            <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#2563eb', marginTop: '0.2rem' }}>
              {availableCount}
            </div>
          </div>
        </div>
      )}

      {/* Capacity Bars Matrix */}
      <TaskCardShell
        title="Resource Capacity Utilization"
        icon={<FaUsers />}
        subtitle="Calculated as estimated hours on active tasks / 40h standard work week"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {visibleMembers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              {loading ? 'Calculating team capacity...' : 'No workload data available.'}
            </div>
          ) : (
            visibleMembers.map((m) => {
              const isOverloaded = m.workloadPercent > 100
              const isOptimal = m.workloadPercent >= 50 && m.workloadPercent <= 100
              const barColor = isOverloaded ? '#dc2626' : isOptimal ? '#15803d' : '#2563eb'
              const statusLabel = isOverloaded ? 'Overloaded' : isOptimal ? 'Optimal' : 'Available'

              return (
                <div
                  key={m.email}
                  style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '12px',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <UserEmailBadge email={m.email} name={m.name} role={m.role} showEmail />
                      <span style={{ fontSize: '0.76rem', color: '#64748b', fontWeight: '600' }}>
                        ({m.department})
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.78rem', color: '#334155', fontWeight: '700' }}>
                        {m.estimatedHours}h / 40h
                      </span>
                      <span
                        style={{
                          fontSize: '0.74rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          background: isOverloaded ? '#fef2f2' : isOptimal ? '#f0fdf4' : '#eff6ff',
                          color: barColor,
                          fontWeight: '800',
                          border: `1px solid ${barColor}40`,
                        }}
                      >
                        {m.workloadPercent}% • {statusLabel}
                      </span>
                      {isAdmin && (
                        <button
                          type="button"
                          className="ap-header-item-btn"
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.74rem' }}
                          onClick={() => navigate(`/admin/tasks/all?assignee=${encodeURIComponent(m.email)}`)}
                        >
                          View Tasks ({m.activeTasks})
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Horizontal Bar */}
                  <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${Math.min(m.workloadPercent, 100)}%`,
                        height: '100%',
                        background: barColor,
                        borderRadius: '5px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </TaskCardShell>
    </TaskWorkspaceLayout>
  )
}

export default TeamWorkloadPage
