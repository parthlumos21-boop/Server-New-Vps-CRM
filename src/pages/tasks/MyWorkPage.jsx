import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  FaBriefcase,
  FaTasks,
  FaProjectDiagram,
  FaRegClock,
  FaCheckCircle,
  FaPlus,
  FaPlay,
  FaCalendarAlt,
  FaExclamationCircle,
  FaUsers,
  FaArrowRight,
  FaEdit,
  FaTimes,
  FaUserCheck,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import workManagementService from '../../services/workManagementService'
import { ProfessionalTaskModal } from '../../components/common/ProfessionalTaskModal'
import AddReminderModal from '../../components/common/AddReminderModal'
import TaskDetailsWorkspaceModal from './components/details/TaskDetailsWorkspaceModal'

export const MyWorkPage = () => {
  const { user } = useAuth()
  const { tasks, updateTask } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin') || ['admin', 'super_admin'].includes(user?.role)

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [projects, setProjects] = useState([])
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [activeTaskDrawer, setActiveTaskDrawer] = useState(null)

  const userEmail = String(user?.email || user?.username || '').trim().toLowerCase()
  const userName = user?.name || user?.username || 'Team Member'

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const [overviewData, projsData] = await Promise.all([
        workManagementService.getOverview().catch(() => null),
        workManagementService.getProjects().catch(() => []),
      ])
      setOverview(overviewData)
      setProjects(Array.isArray(projsData) ? projsData : (Array.isArray(projsData?.data) ? projsData.data : []))
    } catch (err) {
      console.error('Failed to load my work overview', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  // Filter tasks specifically assigned to logged-in user email (supporting both single and multi-assignees)
  const myTasks = (tasks || []).filter((t) => {
    const assigned = String(t.assignedTo || '').trim().toLowerCase()
    const multiAssigned = Array.isArray(t.assignedToUserEmails)
      ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
      : []
    return (
      assigned === userEmail ||
      String(t.assignedTo) === String(user?.id) ||
      multiAssigned.includes(userEmail)
    )
  })

  const now = new Date()
  const activeTasks = myTasks.filter((t) => !['completed', 'closed'].includes(String(t.status || '').toLowerCase()))
  const overdueTasks = activeTasks.filter((t) => t.dueDate && new Date(t.dueDate) < now)
  const slaAtRisk = activeTasks.filter((t) => String(t.slaStatus || '').toLowerCase() === 'at_risk')
  const completedToday = myTasks.filter((t) => ['completed', 'closed'].includes(String(t.status || '').toLowerCase()))

  const handleToggleTaskDone = async (taskItem) => {
    try {
      const isDone = ['completed', 'closed'].includes(String(taskItem.status || '').toLowerCase())
      await updateTask(taskItem.id, {
        status: isDone ? 'in_progress' : 'completed',
        progress: isDone ? 50 : 100,
      })
      fetchOverview()
    } catch (err) {
      console.error('Failed to toggle task', err)
    }
  }

  return (
    <TaskWorkspaceLayout activeTabKey="dashboard">
      {/* Cockpit Greeting Banner */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          padding: '1.25rem 1.5rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)',
          borderRadius: '16px',
          border: '1.5px solid #fee2e2',
          boxShadow: '0 4px 18px rgba(198, 0, 22, 0.04)',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '800', color: '#1e293b' }}>
            Good Day, {userName}
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: '#64748b' }}>
            Here is your personal execution agenda and active workload for today.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            className="ap-tab-add"
            onClick={() => navigate(user?.role === 'admin' ? '/admin/tasks/add' : '/tasks/add')}
            style={{
              background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
              color: '#ffffff',
              border: 'none',
              padding: '0.52rem 1.1rem',
              borderRadius: '9px',
              fontWeight: '700',
              fontSize: '0.84rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 4px 12px rgba(198, 0, 22, 0.25)',
            }}
          >
            <FaPlus />
            <span>New Task</span>
          </button>
          <button
            type="button"
            className="ap-header-item-btn"
            onClick={() => setAddReminderOpen(true)}
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '9px',
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
            }}
          >
            <FaCalendarAlt />
            <span>Add Reminder</span>
          </button>
        </div>
      </div>

      {/* Top Micro-KPI Cards - 4-Card Single Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          width: '100%',
        }}
      >
        <div
          className="ap-dashboard-card"
          style={{
            padding: '1.15rem 0.95rem',
            minHeight: '115px',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>My Active Tasks</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#1e293b', marginTop: '0.35rem' }}>{activeTasks.length}</div>
        </div>

        <div
          className="ap-dashboard-card"
          style={{
            padding: '1.15rem 0.95rem',
            minHeight: '115px',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Overdue Attention</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: overdueTasks.length > 0 ? '#dc2626' : '#15803d', marginTop: '0.35rem' }}>
            {overdueTasks.length}
          </div>
        </div>

        <div
          className="ap-dashboard-card"
          style={{
            padding: '1.15rem 0.95rem',
            minHeight: '115px',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>SLA At Risk</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: slaAtRisk.length > 0 ? '#d97706' : '#64748b', marginTop: '0.35rem' }}>
            {slaAtRisk.length}
          </div>
        </div>

        <div
          className="ap-dashboard-card"
          style={{
            padding: '1.15rem 0.95rem',
            minHeight: '115px',
            borderRadius: '16px',
            border: '1.5px solid #e2e8f0',
            background: '#ffffff',
            boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.02em' }}>Completed</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#15803d', marginTop: '0.35rem' }}>{completedToday.length}</div>
        </div>
      </div>

      {/* Today's Scheduled Agenda List */}
      <TaskCardShell
        title="My Today's Action Agenda"
        icon={<FaBriefcase />}
        subtitle={isAdminRoute ? undefined : "Prioritized tasks and deliverables assigned to your email"}
        style={{ borderRadius: '20px', overflow: 'hidden' }}
      >
        {activeTasks.length === 0 ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
            <FaCheckCircle style={{ fontSize: '2rem', color: '#15803d', marginBottom: '0.5rem' }} />
            <div style={{ fontWeight: '700', fontSize: '1rem', color: '#1e293b' }}>All caught up!</div>
            <p style={{ fontSize: '0.82rem', margin: '0.25rem 0 1rem' }}>No pending tasks assigned to you at the moment.</p>
            <button
              type="button"
              className="ap-tab-add"
              onClick={() => setAddTaskOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                color: '#ffffff',
                border: 'none',
                padding: '0.55rem 1.25rem',
                borderRadius: '8px',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
              }}
            >
              <FaPlus />
              <span>Create a Task</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {activeTasks.map((t) => {
              const isOverdue = t.dueDate && new Date(t.dueDate) < now
              return (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.85rem 1rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: isOverdue ? 'rgba(239, 68, 68, 0.03)' : '#ffffff',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                    <input
                      type="checkbox"
                      checked={['completed', 'closed'].includes(String(t.status || '').toLowerCase())}
                      onChange={() => handleToggleTaskDone(t)}
                      style={{ cursor: 'pointer', width: '1.1rem', height: '1.1rem', accentColor: '#c60016' }}
                      title="Mark task done"
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '800', color: '#1e293b', fontSize: '0.86rem' }}>
                          {t.title}
                        </span>
                        <TaskStatusBadge value={t.priority} type="priority" />
                        <TaskStatusBadge value={t.status} type="status" />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.74rem', color: '#64748b' }}>
                        {t.dueDate && (
                          <span style={{ color: isOverdue ? '#dc2626' : '#64748b', fontWeight: isOverdue ? '700' : '400' }}>
                            Due: {new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        {t.projectId && <span style={{ color: '#c60016', fontWeight: '600' }}>Project #{t.projectId}</span>}
                        {t.dealId && <span style={{ color: '#2563eb', fontWeight: '600' }}>Deal #{t.dealId}</span>}
                        {t.accountId && <span style={{ color: '#7c3aed', fontWeight: '600' }}>Account #{t.accountId}</span>}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      type="button"
                      style={{
                        width: '84px',
                        minWidth: '84px',
                        height: '32px',
                        minHeight: '32px',
                        maxHeight: '32px',
                        padding: '0 0.75rem',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        background: 'rgba(198, 0, 22, 0.06)',
                        color: '#c60016',
                        border: '1.5px solid rgba(198, 0, 22, 0.25)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#c60016'
                        e.currentTarget.style.color = '#ffffff'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(198, 0, 22, 0.06)'
                        e.currentTarget.style.color = '#c60016'
                      }}
                      onClick={() => setActiveTaskDrawer(t)}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      style={{
                        width: '84px',
                        minWidth: '84px',
                        height: '32px',
                        minHeight: '32px',
                        maxHeight: '32px',
                        padding: '0 0.75rem',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        borderRadius: '8px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxSizing: 'border-box',
                        background: 'linear-gradient(135deg, #c60016 0%, #990011 100%)',
                        color: '#ffffff',
                        border: '1.5px solid #990011',
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(198, 0, 22, 0.22)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-1px)'
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(198, 0, 22, 0.35)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'none'
                        e.currentTarget.style.boxShadow = '0 2px 6px rgba(198, 0, 22, 0.22)'
                      }}
                      onClick={() => navigate(user?.role === 'admin' ? `/admin/tasks/edit/${t.id}` : `/tasks/edit/${t.id}`)}
                    >
                      Update
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TaskCardShell>

      {/* Projects Section (Changes-7) */}
      <div style={{ marginTop: '1.25rem' }}>
        <TaskCardShell
          title="Projects"
          icon={<FaProjectDiagram />}
          subtitle={isAdminRoute ? undefined : "Enterprise projects and delivery progress"}
          style={{ borderRadius: '20px', overflow: 'hidden' }}
          action={
            <button
              type="button"
              className="ap-header-item-btn"
              onClick={() => navigate('/tasks/projects')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                cursor: 'pointer',
                fontWeight: '700',
                padding: '0.45rem 0.9rem',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                background: '#ffffff',
                color: '#c60016',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
              title="View all projects"
            >
              <span>View All</span>
              <FaArrowRight style={{ fontSize: '0.72rem' }} />
            </button>
          }
        >
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
              <FaProjectDiagram style={{ fontSize: '2rem', color: '#cbd5e1', marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: '700', fontSize: '0.95rem', color: '#1e293b' }}>No projects available</div>
              <p style={{ fontSize: '0.82rem', margin: '0.25rem 0' }}>Projects will appear here once created or auto-generated.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {projects.slice(0, 2).map((proj) => {
                const completedMilestones = (proj.milestones || []).filter((m) => m.status === 'completed').length
                const totalMilestones = (proj.milestones || []).length
                const teamEmails = Array.isArray(proj.teamMemberEmails) ? proj.teamMemberEmails : []
                const projectTasks = (tasks || []).filter((t) => String(t.projectId) === String(proj.id))
                const openTasksCount = projectTasks.filter((t) => ['open', 'in_progress', 'review'].includes(String(t.status || '').toLowerCase())).length

                return (
                  <div
                    key={proj.id}
                    className="ap-dashboard-card"
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.35rem',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Project Header - Strictly NO Active Status Badge */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: '800',
                              color: '#c60016',
                              background: '#fef2f2',
                              padding: '0.2rem 0.5rem',
                              borderRadius: '6px',
                              border: '1px solid #fee2e2',
                            }}
                          >
                            {proj.projectCode}
                          </span>
                        </div>
                        <h3 style={{ margin: '0.35rem 0 0', fontSize: '1.1rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.3 }}>
                          {proj.name}
                        </h3>
                      </div>
                    </div>

                    {proj.description && (
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: 1.45 }}>
                        {proj.description}
                      </p>
                    )}

                    {/* Progress Bar */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.76rem' }}>
                        <span style={{ color: '#64748b', fontWeight: '600' }}>Overall Progress</span>
                        <span style={{ fontWeight: '800', color: '#c60016' }}>{proj.progress}%</span>
                      </div>
                      <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${proj.progress}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #c60016 0%, #e11d2e 100%)',
                            borderRadius: '4px',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </div>

                    {/* Milestones Stepper Mini */}
                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b', display: 'block', marginBottom: '0.4rem' }}>
                        Milestones ({completedMilestones} / {totalMilestones})
                      </span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        {(proj.milestones || []).slice(0, 3).map((ms) => (
                          <div
                            key={ms.id || ms.name}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.45rem',
                              fontSize: '0.76rem',
                              color: ms.status === 'completed' ? '#15803d' : '#334155',
                            }}
                          >
                            <FaCheckCircle style={{ color: ms.status === 'completed' ? '#15803d' : '#cbd5e1', fontSize: '0.75rem', flexShrink: 0 }} />
                            <span style={{ flex: 1, textDecoration: ms.status === 'completed' ? 'line-through' : 'none' }}>
                              {ms.name}
                            </span>
                            <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'capitalize', color: ms.status === 'completed' ? '#15803d' : '#64748b' }}>
                              {ms.status?.replace('_', ' ')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team Allocation */}
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '12px',
                        border: '1px solid #edf2f7',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: '700', color: '#334155', marginBottom: '0.5rem' }}>
                        <FaUsers style={{ color: '#c60016' }} />
                        <span>Project Team ({teamEmails.length})</span>
                      </div>
                      {teamEmails.length === 0 ? (
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          No team members assigned yet.
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                          {teamEmails.slice(0, 5).map((email) => {
                            const displayName = email.split('@')[0]
                            return (
                              <div
                                key={email}
                                title={email}
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  background: '#ffffff',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '20px',
                                  padding: '0.15rem 0.5rem',
                                  fontSize: '0.7rem',
                                  fontWeight: '600',
                                  color: '#334155',
                                }}
                              >
                                <span
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                                    color: '#ffffff',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.55rem',
                                    fontWeight: '800',
                                  }}
                                >
                                  {displayName.charAt(0).toUpperCase()}
                                </span>
                                <span>{displayName}</span>
                              </div>
                            )
                          })}
                          {teamEmails.length > 5 && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: '700',
                                color: '#64748b',
                                padding: '0.15rem 0.4rem',
                                alignSelf: 'center',
                              }}
                            >
                              +{teamEmails.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Tasks Summary */}
                    <div
                      style={{
                        background: '#fef2f2',
                        padding: '0.75rem 0.85rem',
                        borderRadius: '12px',
                        border: '1px solid #fee2e2',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.76rem', fontWeight: '700', color: '#991b1b' }}>
                          <FaTasks style={{ color: '#c60016' }} />
                          <span>
                            Tasks: {projectTasks.length} ({openTasksCount} active)
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => navigate(user?.role === 'admin' ? `/admin/tasks/add?projectId=${proj.id}&projectName=${encodeURIComponent(proj.name)}` : `/tasks/add?projectId=${proj.id}&projectName=${encodeURIComponent(proj.name)}`)}
                          style={{
                            background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '0.28rem 0.6rem',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            boxShadow: '0 2px 6px rgba(198, 0, 22, 0.2)',
                          }}
                        >
                          <FaPlus />
                          <span>Add Task</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TaskCardShell>
      </div>

      {/* Professional Task Modal with multi-user assignees from MongoDB */}
      <ProfessionalTaskModal
        isOpen={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
        onSuccess={() => {
          setAddTaskOpen(false)
          fetchOverview()
        }}
      />

      {/* Add Reminder Modal keeping existing mechanism 100% intact */}
      <AddReminderModal
        isOpen={addReminderOpen}
        onClose={() => setAddReminderOpen(false)}
      />

      {/* REDESIGNED TASK DETAILS TWO-PANEL WORKSPACE MODAL (MATCHING IMAGE 1) */}
      <TaskDetailsWorkspaceModal
        isOpen={Boolean(activeTaskDrawer)}
        task={activeTaskDrawer}
        initialTab="comments"
        onClose={() => setActiveTaskDrawer(null)}
        onUpdateTask={(updated) => {
          setActiveTaskDrawer(updated)
          if (updated && updated.id) {
            updateTask?.(updated.id, updated)
          }
        }}
        allTasks={myTasks}
        currentUser={user}
        availableUsers={overview?.teamMembers || []}
        isAdmin={isAdminRoute}
      />

    </TaskWorkspaceLayout>
  )
}

export default MyWorkPage
