import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaBriefcase,
  FaTasks,
  FaProjectDiagram,
  FaRegClock,
  FaUsers,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSyncAlt,
  FaChartLine,
} from 'react-icons/fa'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import workManagementService from '../../services/workManagementService'

export const AdminTaskDashboard = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [selectedUserFilter, setSelectedUserFilter] = useState(null)
  const [workloadPage, setWorkloadPage] = useState(1)
  const [projectPage, setProjectPage] = useState(1)
  const PAGE_SIZE = 10

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await workManagementService.getOverview()
      setData(res)
    } catch (err) {
      console.error('Failed to fetch admin tasks overview', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const kpis = data?.kpis || {
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    slaBreached: 0,
    activeProjects: 0,
    trackedHours: 0,
    pendingApprovals: 0,
    teamWorkloadAverage: 0,
  }

  const kpiCards = [
    { label: 'Total Tasks', value: kpis.totalTasks, icon: <FaTasks />, color: '#1e293b' },
    { label: 'Completed', value: kpis.completedTasks, icon: <FaCheckCircle />, color: '#15803d' },
    { label: 'In Progress', value: kpis.inProgressTasks, icon: <FaSyncAlt />, color: '#2563eb' },
    { label: 'Overdue Tasks', value: kpis.overdueTasks, icon: <FaExclamationTriangle />, color: '#dc2626' },
    { label: 'SLA Breached', value: kpis.slaBreached, icon: <FaRegClock />, color: '#990011' },
    { label: 'Active Projects', value: kpis.activeProjects, icon: <FaProjectDiagram />, color: '#7c3aed' },
    { label: 'Tracked Hours', value: `${kpis.trackedHours}h`, icon: <FaRegClock />, color: '#0891b2' },
    { label: 'Team Workload', value: `${kpis.teamWorkloadAverage}%`, icon: <FaUsers />, color: kpis.teamWorkloadAverage > 100 ? '#dc2626' : '#d97706' },
  ]

  const usersList = data?.userPerformanceSummary || []
  const projectsList = data?.projectSummary || []

  const totalWorkloadPages = Math.ceil(usersList.length / PAGE_SIZE) || 1
  const pagedUsers = usersList.slice((workloadPage - 1) * PAGE_SIZE, workloadPage * PAGE_SIZE)

  const totalProjectPages = Math.ceil(projectsList.length / PAGE_SIZE) || 1
  const pagedProjects = projectsList.slice((projectPage - 1) * PAGE_SIZE, projectPage * PAGE_SIZE)

  return (
    <TaskWorkspaceLayout activeTabKey="dashboard">
      {/* LEVEL 1: ORGANIZATION KPI OVERVIEW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="ap-dashboard-card"
            style={{
              padding: '1rem',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>
                {kpi.label}
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: kpi.color, marginTop: '0.2rem' }}>
                {kpi.value}
              </div>
            </div>
            <div
              style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '12px',
                background: 'rgba(198, 0, 22, 0.06)',
                color: '#c60016',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.15rem',
              }}
            >
              {kpi.icon}
            </div>
          </div>
        ))}
      </div>

      {/* LEVEL 2: USER PERFORMANCE SUMMARY TABLE (MONGODB USERS COLLECTION) */}
      <TaskCardShell
        title="Team Workload & Execution Matrix"
        icon={<FaUsers />}
        subtitle="Real-time employee task distribution, SLA compliance, and capacity utilization"
        action={
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={fetchData}
            title="Refresh Performance Matrix"
          >
            <FaSyncAlt />
            <span>Refresh</span>
          </button>
        }
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Team Member</th>
                <th style={{ padding: '0.75rem 1rem' }}>Department / Role</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Active Tasks</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Completed</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Overdue</th>
                <th style={{ padding: '0.75rem 1rem' }}>Workload Capacity %</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>SLA Compliance</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersList.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                    {loading ? 'Loading team performance data...' : 'No users found in MongoDB users collection.'}
                  </td>
                </tr>
              ) : (
                pagedUsers.map((usr) => {
                  const isOverloaded = usr.workloadPercent > 100
                  const isModerate = usr.workloadPercent >= 75 && usr.workloadPercent <= 100
                  const barColor = isOverloaded ? '#dc2626' : isModerate ? '#d97706' : '#15803d'

                  return (
                    <tr
                      key={usr.email}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <UserEmailBadge email={usr.email} name={usr.name} showEmail />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: '600', color: '#334155' }}>{usr.department}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'capitalize' }}>{usr.role}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700' }}>
                        {usr.activeTasks}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#15803d', fontWeight: '700' }}>
                        {usr.completedTasks}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: usr.overdueTasks > 0 ? '#dc2626' : '#64748b', fontWeight: '700' }}>
                        {usr.overdueTasks}
                      </td>
                      <td style={{ padding: '0.75rem 1rem', minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.min(usr.workloadPercent, 100)}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: barColor }}>
                            {usr.workloadPercent}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <TaskStatusBadge
                          value={usr.slaComplianceRate >= 90 ? 'compliant' : usr.slaComplianceRate >= 75 ? 'at_risk' : 'breached'}
                          type="sla"
                        />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="ap-header-item-btn"
                          style={{ padding: '0.35rem 0.65rem', minHeight: '1.9rem', fontSize: '0.75rem' }}
                          onClick={() => navigate(`/admin/tasks/all?assignee=${encodeURIComponent(usr.email)}`)}
                        >
                          View Tasks
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {usersList.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.75rem 1rem',
              borderTop: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              fontSize: '0.82rem',
              color: '#64748b',
              flexWrap: 'wrap',
              gap: '0.5rem',
            }}
          >
            <div>
              Showing{' '}
              <strong style={{ color: '#1e293b' }}>
                {Math.min((workloadPage - 1) * PAGE_SIZE + 1, usersList.length)}
              </strong>{' '}
              to{' '}
              <strong style={{ color: '#1e293b' }}>
                {Math.min(workloadPage * PAGE_SIZE, usersList.length)}
              </strong>{' '}
              of <strong style={{ color: '#1e293b' }}>{usersList.length}</strong> members
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setWorkloadPage(1)}
                disabled={workloadPage === 1}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: workloadPage === 1 ? '#f1f5f9' : '#ffffff',
                  color: workloadPage === 1 ? '#94a3b8' : '#1e293b',
                  cursor: workloadPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  boxShadow: workloadPage === 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                First
              </button>
              <span style={{ padding: '0 0.5rem', fontWeight: '700', color: '#475569' }}>
                Page {workloadPage} of {totalWorkloadPages}
              </span>
              <button
                type="button"
                onClick={() => setWorkloadPage(totalWorkloadPages)}
                disabled={workloadPage === totalWorkloadPages}
                style={{
                  padding: '0.35rem 0.85rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: workloadPage === totalWorkloadPages ? '#f1f5f9' : '#ffffff',
                  color: workloadPage === totalWorkloadPages ? '#94a3b8' : '#1e293b',
                  cursor: workloadPage === totalWorkloadPages ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  boxShadow: workloadPage === totalWorkloadPages ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'all 0.15s ease',
                }}
              >
                Last
              </button>
            </div>
          </div>
        )}
      </TaskCardShell>

      {/* LEVEL 3: PROJECT PORTFOLIO SUMMARY TABLE */}
      <div style={{ marginTop: '1.25rem' }}>
        <TaskCardShell
          title="Project Portfolio & Milestone Execution"
          icon={<FaProjectDiagram />}
          subtitle="Portfolio health, milestone delivery progress, and SLA compliance"
          action={
            <button
              type="button"
              className="ap-tab-add"
              onClick={() => navigate('/admin/tasks/projects')}
            >
              <span>View All Projects</span>
            </button>
          }
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Project Code & Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Project Manager</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Milestones</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Overall Progress</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {projectsList.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      No projects currently active. Create projects via the Projects tab or Deal Won automation.
                    </td>
                  </tr>
                ) : (
                  pagedProjects.map((p) => (
                    <tr
                      key={p.id}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                    >
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <div style={{ fontWeight: '800', color: '#1e293b' }}>{p.name}</div>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>{p.projectCode}</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <UserEmailBadge email={p.projectManagerEmail} name={p.projectManager} size="small" />
                      </td>
                      <td style={{ padding: '0.75rem 1rem' }}>
                        <span style={{ fontWeight: '700', color: '#334155' }}>
                          {p.milestonesCompleted} / {p.milestonesCount}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '0.35rem' }}>milestones</span>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', minWidth: '150px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                            <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, #c60016 0%, #e11d2e 100%)', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016' }}>{p.progress}%</span>
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                        <TaskStatusBadge value={p.status} />
                      </td>
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="ap-header-item-btn"
                          style={{ padding: '0.35rem 0.65rem', minHeight: '1.9rem', fontSize: '0.75rem' }}
                          onClick={() => navigate('/admin/tasks/projects')}
                        >
                          Workspace
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {projectsList.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.75rem 1rem',
                borderTop: '1.5px solid #e2e8f0',
                background: '#f8fafc',
                fontSize: '0.82rem',
                color: '#64748b',
                flexWrap: 'wrap',
                gap: '0.5rem',
              }}
            >
              <div>
                Showing{' '}
                <strong style={{ color: '#1e293b' }}>
                  {Math.min((projectPage - 1) * PAGE_SIZE + 1, projectsList.length)}
                </strong>{' '}
                to{' '}
                <strong style={{ color: '#1e293b' }}>
                  {Math.min(projectPage * PAGE_SIZE, projectsList.length)}
                </strong>{' '}
                of <strong style={{ color: '#1e293b' }}>{projectsList.length}</strong> projects
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setProjectPage(1)}
                  disabled={projectPage === 1}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: projectPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: projectPage === 1 ? '#94a3b8' : '#1e293b',
                    cursor: projectPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    boxShadow: projectPage === 1 ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  First
                </button>
                <span style={{ padding: '0 0.5rem', fontWeight: '700', color: '#475569' }}>
                  Page {projectPage} of {totalProjectPages}
                </span>
                <button
                  type="button"
                  onClick={() => setProjectPage(totalProjectPages)}
                  disabled={projectPage === totalProjectPages}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: projectPage === totalProjectPages ? '#f1f5f9' : '#ffffff',
                    color: projectPage === totalProjectPages ? '#94a3b8' : '#1e293b',
                    cursor: projectPage === totalProjectPages ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    boxShadow: projectPage === totalProjectPages ? 'none' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </TaskCardShell>
      </div>
    </TaskWorkspaceLayout>
  )
}

export default AdminTaskDashboard
