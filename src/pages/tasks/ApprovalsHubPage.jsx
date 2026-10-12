import React, { useState, useEffect } from 'react'
import {
  FaCheckCircle,
  FaTimesCircle,
  FaSyncAlt,
  FaClock,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import workManagementService from '../../services/workManagementService'

export const ApprovalsHubPage = () => {
  const { user } = useAuth()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchApprovals = async () => {
    try {
      setLoading(true)
      const data = await workManagementService.getApprovals()
      setApprovals(data || [])
    } catch (err) {
      console.error('Failed to load approvals', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApprovals()
  }, [])

  const handleDecide = async (id, decision) => {
    try {
      await workManagementService.decideApproval(id, decision, `Marked as ${decision} by ${user?.name || user?.email}`)
      fetchApprovals()
    } catch (err) {
      console.error('Failed to decide approval', err)
    }
  }

  const pendingApprovals = approvals.filter((a) => a.status === 'pending')
  const completedApprovals = approvals.filter((a) => a.status !== 'pending')

  return (
    <TaskWorkspaceLayout activeTabKey="approvals">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#1e293b' }}>
            Approvals Hub
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            Multi-tier approvals for timesheet cycles, project milestones, and discounts
          </p>
        </div>
        <button
          type="button"
          className="ap-header-item-btn"
          onClick={fetchApprovals}
          title="Refresh Approvals"
        >
          <FaSyncAlt />
          <span>Refresh</span>
        </button>
      </div>

      {/* Pending Approvals Section */}
      <TaskCardShell
        title={`Pending Approvals Queue (${pendingApprovals.length})`}
        icon={<FaClock />}
        subtitle="Requests awaiting authorization"
      >
        {pendingApprovals.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
            <FaCheckCircle style={{ fontSize: '1.75rem', color: '#15803d', marginBottom: '0.4rem' }} />
            <div style={{ fontWeight: '700', color: '#1e293b' }}>No Pending Approvals</div>
            <p style={{ fontSize: '0.8rem', margin: '0.2rem 0 0' }}>All approval submissions have been processed.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {pendingApprovals.map((appr) => (
              <div
                key={appr.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.9rem 1.1rem',
                  borderRadius: '12px',
                  border: '1.5px solid #fed7aa',
                  background: '#fffaf0',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.88rem' }}>
                      {appr.title}
                    </span>
                    <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.45rem', borderRadius: '8px', background: '#e0f2fe', color: '#0369a1', fontWeight: '700', textTransform: 'capitalize' }}>
                      {appr.type.replace('_', ' ')}
                    </span>
                  </div>
                  {appr.description && (
                    <p style={{ margin: '0.25rem 0', fontSize: '0.78rem', color: '#64748b' }}>
                      {appr.description}
                    </p>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '0.2rem' }}>
                    Requested by: <UserEmailBadge email={appr.requestedByEmail} size="small" />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="ap-tab-add"
                    style={{ background: '#15803d', borderColor: '#166534', minHeight: '2rem', padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => handleDecide(appr.id, 'approved')}
                  >
                    <FaCheckCircle />
                    <span>Approve</span>
                  </button>
                  <button
                    type="button"
                    className="ap-header-item-btn"
                    style={{ borderColor: '#fca5a5', color: '#dc2626', minHeight: '2rem', padding: '0.35rem 0.75rem', fontSize: '0.76rem' }}
                    onClick={() => handleDecide(appr.id, 'rejected')}
                  >
                    <FaTimesCircle />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </TaskCardShell>

      {/* Completed Approvals History */}
      {completedApprovals.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <TaskCardShell
            title="Approval History"
            icon={<FaCheckCircle />}
            subtitle="Processed submissions"
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Request</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Requested By</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Decision</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Comments</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {completedApprovals.map((a) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.75rem 1rem', fontWeight: '800', color: '#1e293b' }}>
                        {a.title}
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <UserEmailBadge email={a.requestedByEmail} size="small" />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <TaskStatusBadge value={a.status} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {a.decisionComments || '-'}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', color: '#64748b' }}>
                        {a.decidedAt ? new Date(a.decidedAt).toLocaleDateString('en-IN') : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TaskCardShell>
        </div>
      )}
    </TaskWorkspaceLayout>
  )
}

export default ApprovalsHubPage
