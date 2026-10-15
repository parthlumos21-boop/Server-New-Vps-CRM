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
  FaThLarge,
  FaList,
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
  const [workloadView, setWorkloadView] = useState('cards') // 'cards' | 'table'
  const [projectView, setProjectView] = useState('cards') // 'cards' | 'table'
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
    { label: 'Active Projects', value: kpis.activeProjects, icon: <FaProjectDiagram />, color: '#7c3aed' },
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
      {/* LEVEL 1: ORGANIZATION KPI OVERVIEW - SINGLE ROW */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          width: '100%',
        }}
      >
        {kpiCards.map((kpi, idx) => (
          <div
            key={idx}
            className="ap-dashboard-card"
            style={{
              padding: '1.1rem 0.85rem',
              minHeight: '115px',
              borderRadius: '16px',
              border: '1.5px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.45rem',
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em', display: 'block' }}>
                {kpi.label}
              </span>
              <div style={{ fontSize: '1.6rem', fontWeight: '800', color: kpi.color, marginTop: '0.35rem' }}>
                {kpi.value}
              </div>
            </div>
            <div
              style={{
                width: '2.4rem',
                height: '2.4rem',
                borderRadius: '12px',
                background: 'rgba(198, 0, 22, 0.06)',
                color: '#c60016',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                flexShrink: 0,
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
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '2px', border: '1px solid #cbd5e1' }}>
              <button
                type="button"
                onClick={() => setWorkloadView('cards')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: workloadView === 'cards' ? '#ffffff' : 'transparent',
                  color: workloadView === 'cards' ? '#c60016' : '#64748b',
                  fontWeight: '700',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: workloadView === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <FaThLarge /> <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setWorkloadView('table')}
                style={{
                  padding: '0.25rem 0.6rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: workloadView === 'table' ? '#ffffff' : 'transparent',
                  color: workloadView === 'table' ? '#c60016' : '#64748b',
                  fontWeight: '700',
                  fontSize: '0.74rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  boxShadow: workloadView === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                <FaList /> <span>Table</span>
              </button>
            </div>
            <button
              type="button"
              className="ap-header-item-btn"
              onClick={fetchData}
              title="Refresh Performance Matrix"
            >
              <FaSyncAlt />
              <span>Refresh</span>
            </button>
          </div>
        }
      >
        {workloadView === 'table' ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}>No.</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Team Member</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Role</th>
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
                    <td colSpan="9" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                      {loading ? 'Loading team performance data...' : 'No users found in MongoDB users collection.'}
                    </td>
                  </tr>
                ) : (
                  pagedUsers.map((usr, idx) => {
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
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                          {(workloadPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <UserEmailBadge email={usr.email} name={usr.name} showEmail />
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: '700', color: '#1e293b', textTransform: 'capitalize' }}>{usr.role || 'User'}</div>
                          {usr.department && <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{usr.department}</span>}
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
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
            {pagedUsers.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
                {loading ? 'Loading team performance data...' : 'No users found.'}
              </div>
            ) : (
              pagedUsers.map((usr, idx) => {
                const isOverloaded = usr.workloadPercent > 100
                const isModerate = usr.workloadPercent >= 75 && usr.workloadPercent <= 100
                const barColor = isOverloaded ? '#dc2626' : isModerate ? '#d97706' : '#15803d'

                return (
                  <div
                    key={usr.email}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1rem',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016', background: '#ffffff', border: '1px solid #fecdd3', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                        {(workloadPage - 1) * PAGE_SIZE + idx + 1}
                      </span>
                      <TaskStatusBadge
                        value={usr.slaComplianceRate >= 90 ? 'compliant' : usr.slaComplianceRate >= 75 ? 'at_risk' : 'breached'}
                        type="sla"
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.55rem', marginTop: '0.15rem' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #c60016 0%, #990011 100%)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.78rem',
                          fontWeight: '800',
                          flexShrink: 0,
                          boxShadow: '0 2px 6px rgba(198, 0, 22, 0.25)',
                        }}
                      >
                        {(usr.name || usr.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.84rem', fontWeight: '800', color: '#1e293b' }}>
                            {usr.name || usr.email?.split('@')[0]}
                          </span>
                          <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'capitalize' }}>
                            {usr.role || 'User'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '1px' }}>
                          {usr.email}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '10px', textAlign: 'center' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Active</div>
                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.9rem' }}>{usr.activeTasks}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#15803d' }}>Done</div>
                        <div style={{ fontWeight: '800', color: '#15803d', fontSize: '0.9rem' }}>{usr.completedTasks}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: usr.overdueTasks > 0 ? '#dc2626' : '#64748b' }}>Overdue</div>
                        <div style={{ fontWeight: '800', color: usr.overdueTasks > 0 ? '#dc2626' : '#64748b', fontSize: '0.9rem' }}>{usr.overdueTasks}</div>
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b', fontWeight: '600' }}>Capacity</span>
                        <span style={{ fontWeight: '800', color: barColor }}>{usr.workloadPercent}%</span>
                      </div>
                      <div style={{ height: '7px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(usr.workloadPercent, 100)}%`, height: '100%', background: barColor, borderRadius: '4px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.4rem' }}>
                      <button
                        type="button"
                        className="ap-header-item-btn"
                        style={{ padding: '0.28rem 0.65rem', minHeight: '1.8rem', fontSize: '0.74rem' }}
                        onClick={() => navigate(`/admin/tasks/all?assignee=${encodeURIComponent(usr.email)}`)}
                      >
                        View Tasks
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <button
                type="button"
                onClick={() => setWorkloadPage(1)}
                disabled={workloadPage === 1}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: workloadPage === 1 ? '#f1f5f9' : '#ffffff',
                  color: workloadPage === 1 ? '#94a3b8' : '#1e293b',
                  cursor: workloadPage === 1 ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.76rem',
                }}
              >
                First
              </button>
              {Array.from({ length: totalWorkloadPages }, (_, i) => i + 1).map((pg) => (
                <button
                  key={pg}
                  type="button"
                  onClick={() => setWorkloadPage(pg)}
                  style={{
                    minWidth: '28px',
                    height: '28px',
                    padding: '0 0.45rem',
                    borderRadius: '6px',
                    border: pg === workloadPage ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                    background: pg === workloadPage ? '#c60016' : '#ffffff',
                    color: pg === workloadPage ? '#ffffff' : '#1e293b',
                    cursor: 'pointer',
                    fontWeight: '700',
                    fontSize: '0.78rem',
                    boxShadow: pg === workloadPage ? '0 2px 6px rgba(198,0,22,0.22)' : 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {pg}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWorkloadPage(totalWorkloadPages)}
                disabled={workloadPage === totalWorkloadPages}
                style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  background: workloadPage === totalWorkloadPages ? '#f1f5f9' : '#ffffff',
                  color: workloadPage === totalWorkloadPages ? '#94a3b8' : '#1e293b',
                  cursor: workloadPage === totalWorkloadPages ? 'not-allowed' : 'pointer',
                  fontWeight: '700',
                  fontSize: '0.76rem',
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
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '2px', border: '1px solid #cbd5e1' }}>
                <button
                  type="button"
                  onClick={() => setProjectView('cards')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: projectView === 'cards' ? '#ffffff' : 'transparent',
                    color: projectView === 'cards' ? '#c60016' : '#64748b',
                    fontWeight: '700',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    boxShadow: projectView === 'cards' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <FaThLarge /> <span>Cards</span>
                </button>
                <button
                  type="button"
                  onClick={() => setProjectView('table')}
                  style={{
                    padding: '0.25rem 0.6rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: projectView === 'table' ? '#ffffff' : 'transparent',
                    color: projectView === 'table' ? '#c60016' : '#64748b',
                    fontWeight: '700',
                    fontSize: '0.74rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                    boxShadow: projectView === 'table' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  <FaList /> <span>Table</span>
                </button>
              </div>
              <button
                type="button"
                className="ap-header-item-btn"
                style={{ padding: '0.35rem 0.75rem', minHeight: '1.9rem', fontSize: '0.74rem' }}
                onClick={() => navigate('/admin/tasks/projects')}
              >
                <span>View All Projects</span>
              </button>
            </div>
          }
        >
          {projectView === 'table' ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                    <th style={{ padding: '0.75rem 1rem', width: '50px', textAlign: 'center' }}>No.</th>
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
                      <td colSpan="7" style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
                        No projects currently active. Create projects via the Projects tab or Deal Won automation.
                      </td>
                    </tr>
                  ) : (
                    pagedProjects.map((p, idx) => (
                      <tr
                        key={p.id}
                        style={{ borderBottom: '1px solid #f1f5f9' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                      >
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>
                          {(projectPage - 1) * PAGE_SIZE + idx + 1}
                        </td>
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
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.85rem' }}>
              {pagedProjects.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
                  No projects currently active.
                </div>
              ) : (
                pagedProjects.map((p, idx) => (
                  <div
                    key={p.id}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1rem',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.65rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016', background: '#ffffff', border: '1px solid #fecdd3', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                        {(projectPage - 1) * PAGE_SIZE + idx + 1} &bull; {p.projectCode}
                      </span>
                      <TaskStatusBadge value={p.status} />
                    </div>

                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: '800', color: '#1e293b' }}>
                        {p.name}
                      </h4>
                      <div style={{ marginTop: '0.35rem' }}>
                        <UserEmailBadge email={p.projectManagerEmail} name={p.projectManager} size="small" />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.74rem', background: '#f8fafc', padding: '0.45rem 0.65rem', borderRadius: '8px' }}>
                      <span style={{ color: '#64748b' }}>Milestones</span>
                      <span style={{ fontWeight: '700', color: '#1e293b' }}>
                        {p.milestonesCompleted} / {p.milestonesCount}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem', fontSize: '0.72rem' }}>
                        <span style={{ color: '#64748b', fontWeight: '600' }}>Overall Progress</span>
                        <span style={{ fontWeight: '800', color: '#c60016' }}>{p.progress}%</span>
                      </div>
                      <div style={{ height: '7px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${p.progress}%`, height: '100%', background: 'linear-gradient(90deg, #c60016 0%, #e11d2e 100%)', borderRadius: '4px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.4rem' }}>
                      <button
                        type="button"
                        className="ap-header-item-btn"
                        style={{ padding: '0.28rem 0.65rem', minHeight: '1.8rem', fontSize: '0.74rem' }}
                        onClick={() => navigate('/admin/tasks/projects')}
                      >
                        Workspace
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setProjectPage(1)}
                  disabled={projectPage === 1}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: projectPage === 1 ? '#f1f5f9' : '#ffffff',
                    color: projectPage === 1 ? '#94a3b8' : '#1e293b',
                    cursor: projectPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '0.76rem',
                  }}
                >
                  First
                </button>
                {Array.from({ length: totalProjectPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    type="button"
                    onClick={() => setProjectPage(pg)}
                    style={{
                      minWidth: '28px',
                      height: '28px',
                      padding: '0 0.45rem',
                      borderRadius: '6px',
                      border: pg === projectPage ? '1.5px solid #c60016' : '1px solid #cbd5e1',
                      background: pg === projectPage ? '#c60016' : '#ffffff',
                      color: pg === projectPage ? '#ffffff' : '#1e293b',
                      cursor: 'pointer',
                      fontWeight: '700',
                      fontSize: '0.78rem',
                      boxShadow: pg === projectPage ? '0 2px 6px rgba(198,0,22,0.22)' : 'none',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {pg}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setProjectPage(totalProjectPages)}
                  disabled={projectPage === totalProjectPages}
                  style={{
                    padding: '0.35rem 0.65rem',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    background: projectPage === totalProjectPages ? '#f1f5f9' : '#ffffff',
                    color: projectPage === totalProjectPages ? '#94a3b8' : '#1e293b',
                    cursor: projectPage === totalProjectPages ? 'not-allowed' : 'pointer',
                    fontWeight: '700',
                    fontSize: '0.76rem',
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
