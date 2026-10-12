import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import workManagementService from '../../services/workManagementService'
import { ProfessionalTaskModal } from '../../components/common/ProfessionalTaskModal'
import AddReminderModal from '../../components/common/AddReminderModal'

export const MyWorkPage = () => {
  const { user } = useAuth()
  const { tasks, updateTask } = useData()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [addReminderOpen, setAddReminderOpen] = useState(false)

  const userEmail = String(user?.email || user?.username || '').trim().toLowerCase()
  const userName = user?.name || user?.username || 'Team Member'

  const fetchOverview = async () => {
    try {
      setLoading(true)
      const data = await workManagementService.getOverview()
      setOverview(data)
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
    <TaskWorkspaceLayout activeTabKey="my-work">
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

      {/* Top Micro-KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.85rem',
          marginBottom: '1.25rem',
        }}
      >
        <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>My Active Tasks</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#1e293b', marginTop: '0.2rem' }}>{activeTasks.length}</div>
        </div>

        <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Overdue Attention</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: overdueTasks.length > 0 ? '#dc2626' : '#15803d', marginTop: '0.2rem' }}>
            {overdueTasks.length}
          </div>
        </div>

        <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>SLA At Risk</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: slaAtRisk.length > 0 ? '#d97706' : '#64748b', marginTop: '0.2rem' }}>
            {slaAtRisk.length}
          </div>
        </div>

        <div className="ap-dashboard-card" style={{ padding: '1rem', borderRadius: '16px', border: '1.5px solid #e2e8f0', background: '#ffffff' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase' }}>Completed</span>
          <div style={{ fontSize: '1.65rem', fontWeight: '800', color: '#15803d', marginTop: '0.2rem' }}>{completedToday.length}</div>
        </div>
      </div>

      {/* Today's Scheduled Agenda List */}
      <TaskCardShell
        title="My Today's Action Agenda"
        icon={<FaBriefcase />}
        subtitle="Prioritized tasks and deliverables assigned to your email"
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
                      className="ap-header-item-btn"
                      style={{ padding: '0.35rem 0.65rem', minHeight: '1.9rem', fontSize: '0.75rem' }}
                      onClick={() => navigate(user?.role === 'admin' ? '/admin/tasks/all' : '/tasks/all')}
                    >
                      Open Task
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </TaskCardShell>

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
    </TaskWorkspaceLayout>
  )
}

export default MyWorkPage
