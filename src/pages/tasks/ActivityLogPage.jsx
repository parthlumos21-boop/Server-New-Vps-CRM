import React, { useState, useEffect } from 'react'
import {
  FaHistory,
  FaSyncAlt,
  FaCircle,
  FaTasks,
} from 'react-icons/fa'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import apiClient from '../../services/apiClient'

export const ActivityLogPage = () => {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const res = await apiClient.get('/activities')
      setActivities(Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []))
    } catch (err) {
      console.error('Failed to load activity stream', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return (
    <TaskWorkspaceLayout activeTabKey="activity">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            Work & Task Activity Feed
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Real-time chronological audit trail of team actions, status updates, and milestone progression
          </p>
        </div>
        <button
          type="button"
          className="ap-header-item-btn"
          onClick={fetchActivities}
          title="Refresh Activity"
        >
          <FaSyncAlt />
          <span>Refresh</span>
        </button>
      </div>

      <TaskCardShell
        title="Event Stream"
        icon={<FaHistory />}
        subtitle="Live socket events and system audit recordings"
      >
        {activities.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            {loading ? 'Streaming team activities...' : 'No recent activity recorded today.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {activities.map((act, index) => {
              const actTime = act.timestamp ? new Date(act.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : 'Recently'
              const userEmail = act.userEmail || act.email || act.user?.email || ''
              const userName = act.userName || act.user?.name || act.actorName || userEmail.split('@')[0] || 'System'

              return (
                <div
                  key={act.id || index}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.85rem',
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#ffffff',
                  }}
                >
                  <div style={{ marginTop: '0.15rem' }}>
                    <UserEmailBadge email={userEmail} name={userName} size="small" />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.84rem', color: '#1e293b', fontWeight: '600' }}>
                      {act.message || act.description || act.title || 'Updated work item'}
                    </div>
                    {act.details && (
                      <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '0.15rem' }}>
                        {typeof act.details === 'string' ? act.details : JSON.stringify(act.details)}
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.72rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {actTime}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TaskCardShell>
    </TaskWorkspaceLayout>
  )
}

export default ActivityLogPage
