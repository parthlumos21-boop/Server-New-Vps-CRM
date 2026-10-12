import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  FaTasks,
  FaList,
  FaColumns,
  FaCheckCircle,
  FaPlus,
  FaTimes,
  FaFolderOpen,
  FaPlay,
  FaEdit,
  FaCheck,
  FaUserCheck,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { TaskFilterBar } from './components/common/TaskFilterBar'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import ProfessionalTaskModal from '../../components/common/ProfessionalTaskModal'
import workManagementService from '../../services/workManagementService'

export const TasksWorkspacePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tasks, updateTask } = useData()
  const [searchParams] = useSearchParams()

  const [activeView, setActiveView] = useState('list') // 'list' | 'kanban'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAssignee, setSelectedAssignee] = useState(searchParams.get('assignee') || '')
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('')
  const [userList, setUserList] = useState([])
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [modalInitialStatus, setModalInitialStatus] = useState('open')
  const [editingTask, setEditingTask] = useState(null)
  const [activeTaskDrawer, setActiveTaskDrawer] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const currentUserEmail = String(user?.email || user?.username || '').trim().toLowerCase()

  // Fetch users directory from MongoDB
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const overview = await workManagementService.getOverview()
        if (overview?.teamMembers) {
          setUserList(overview.teamMembers)
        }
      } catch (err) {
        console.error('Failed to fetch team members', err)
      }
    }
    fetchTeam()
  }, [])

  // Filter tasks based on role and active search/filters
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      // Role scope: If not admin, restrict to tasks where user email is assignedTo, in assignedToUserEmails, createdBy, or follower
      if (!isAdmin) {
        const assigned = String(t.assignedTo || '').trim().toLowerCase()
        const assignedList = Array.isArray(t.assignedToUserEmails)
          ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
          : []
        const created = String(t.createdBy || '').trim().toLowerCase()
        const isFollower = Array.isArray(t.followers) && t.followers.some((f) => String(f).trim().toLowerCase() === currentUserEmail)
        if (
          assigned !== currentUserEmail &&
          !assignedList.includes(currentUserEmail) &&
          created !== currentUserEmail &&
          !isFollower &&
          String(t.assignedTo) !== String(user?.id)
        ) {
          return false
        }
      }

      // Assignee dropdown filter
      if (selectedAssignee) {
        const assigned = String(t.assignedTo || '').trim().toLowerCase()
        const assignedList = Array.isArray(t.assignedToUserEmails)
          ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
          : []
        const target = selectedAssignee.toLowerCase()
        if (assigned !== target && !assignedList.includes(target)) return false
      }

      // Status filter
      if (selectedStatus) {
        if (String(t.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false
      }

      // Priority filter
      if (selectedPriority) {
        if (String(t.priority || '').toLowerCase() !== selectedPriority.toLowerCase()) return false
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = String(t.title || '').toLowerCase().includes(q)
        const matchDesc = String(t.description || '').toLowerCase().includes(q)
        const matchDeal = String(t.dealId || '').toLowerCase().includes(q)
        const matchAccount = String(t.accountId || '').toLowerCase().includes(q)
        if (!matchTitle && !matchDesc && !matchDeal && !matchAccount) return false
      }

      return true
    })
  }, [tasks, isAdmin, currentUserEmail, selectedAssignee, selectedStatus, selectedPriority, searchQuery, user?.id])

  // Drag and drop for Kanban board
  const handleDragStart = (e, taskItem) => {
    e.dataTransfer.setData('text/plain', String(taskItem.id))
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const matchedTask = tasks.find((t) => String(t.id) === String(taskId))
    if (!matchedTask || matchedTask.status === targetStatus) return

    try {
      setIsUpdating(true)
      const isComplete = targetStatus === 'completed'
      await updateTask(taskId, {
        status: targetStatus,
        progress: isComplete ? 100 : (matchedTask.progress || (targetStatus === 'in_progress' ? 50 : 25)),
      })
    } catch (err) {
      console.error('Failed to drag-drop update task status in MongoDB', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  // Toggle subtask in drawer
  const handleToggleSubtask = async (taskItem, subtaskId) => {
    if (!taskItem) return
    const updatedSubtasks = (taskItem.subtasks || []).map((st) => {
      if (st.id === subtaskId) {
        return { ...st, completed: !st.completed, completedBy: !st.completed ? currentUserEmail : null }
      }
      return st
    })
    const completedCount = updatedSubtasks.filter((s) => s.completed).length
    const newProgress = Math.round((completedCount / updatedSubtasks.length) * 100)

    try {
      await updateTask(taskItem.id, {
        subtasks: updatedSubtasks,
        progress: newProgress,
      })
      setActiveTaskDrawer((prev) => prev ? { ...prev, subtasks: updatedSubtasks, progress: newProgress } : null)
    } catch (err) {
      console.error('Failed to update subtask', err)
    }
  }

  const kanbanColumns = [
    { key: 'open', label: 'Open', color: '#1d4ed8', bg: '#eff6ff' },
    { key: 'in_progress', label: 'In Progress', color: '#047857', bg: '#ecfdf5' },
    { key: 'review', label: 'Under Review', color: '#b45309', bg: '#fef3c7' },
    { key: 'completed', label: 'Completed', color: '#15803d', bg: '#f0fdf4' },
  ]

  const handleOpenAddModal = (statusKey = 'open') => {
    navigate(isAdmin ? `/admin/tasks/add?status=${statusKey}` : `/tasks/add?status=${statusKey}`)
  }

  return (
    <TaskWorkspaceLayout activeTabKey="all">
      {/* Workspace Header Toolbar with Maroon Accents */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            className={`ap-tab ${activeView === 'list' ? 'ap-tab--active' : ''}`}
            style={{
              borderRadius: '12px',
              minHeight: '2.2rem',
              padding: '0.4rem 0.85rem',
              color: activeView === 'list' ? '#c60016' : '#475569',
              background: activeView === 'list' ? '#fef2f2' : '#ffffff',
              border: activeView === 'list' ? '1.5px solid #c60016' : '1px solid #cbd5e1',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => setActiveView('list')}
          >
            <FaList style={{ fontSize: '0.8rem', marginRight: '0.4rem', color: activeView === 'list' ? '#c60016' : '#64748b' }} />
            <span>List View</span>
          </button>
          <button
            type="button"
            className={`ap-tab ${activeView === 'kanban' ? 'ap-tab--active' : ''}`}
            style={{
              borderRadius: '12px',
              minHeight: '2.2rem',
              padding: '0.4rem 0.85rem',
              color: activeView === 'kanban' ? '#c60016' : '#475569',
              background: activeView === 'kanban' ? '#fef2f2' : '#ffffff',
              border: activeView === 'kanban' ? '1.5px solid #c60016' : '1px solid #cbd5e1',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
            }}
            onClick={() => setActiveView('kanban')}
          >
            <FaColumns style={{ fontSize: '0.8rem', marginRight: '0.4rem', color: activeView === 'kanban' ? '#c60016' : '#64748b' }} />
            <span>Kanban Board</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => handleOpenAddModal('open')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 1rem',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
            color: '#ffffff',
            border: 'none',
            fontSize: '0.82rem',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(198, 0, 22, 0.25)',
          }}
        >
          <FaPlus />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter Bar */}
      <TaskFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedAssignee={selectedAssignee}
        onAssigneeChange={setSelectedAssignee}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedPriority={selectedPriority}
        onPriorityChange={setSelectedPriority}
        userList={userList}
        showAddButton={false}
      />

      {/* VIEW 1: LIST VIEW */}
      {activeView === 'list' && (
        <TaskCardShell
          title={`${isAdmin ? 'Organization Tasks' : 'My Tasks'} (${filteredTasks.length})`}
          icon={<FaTasks style={{ color: '#c60016' }} />}
        >
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Task Name & Relations</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Assignees (MongoDB Users)</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Priority</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Checklist Progress</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                      No tasks match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => {
                    const assignees = Array.isArray(t.assignedToUserEmails) && t.assignedToUserEmails.length > 0
                      ? t.assignedToUserEmails
                      : (t.assignedTo ? [t.assignedTo] : [])

                    return (
                      <tr
                        key={t.id}
                        style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s ease' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                        onClick={() => setActiveTaskDrawer(t)}
                      >
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ fontWeight: '800', color: '#1e293b' }}>{t.title}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', fontSize: '0.72rem', color: '#64748b' }}>
                            {t.projectId && <span style={{ color: '#c60016', fontWeight: '700' }}>Project #{t.projectId}</span>}
                            {t.dealId && <span style={{ color: '#2563eb', fontWeight: '600' }}>Deal #{t.dealId}</span>}
                            {t.accountId && <span style={{ color: '#7c3aed', fontWeight: '600' }}>Account #{t.accountId}</span>}
                            {t.quotationId && <span style={{ color: '#059669', fontWeight: '600' }}>QT #{t.quotationId}</span>}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                            {assignees.slice(0, 2).map((email) => (
                              <UserEmailBadge key={email} email={email} size="small" showEmail />
                            ))}
                            {assignees.length > 2 && (
                              <span style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c60016', background: '#fef2f2', padding: '0.1rem 0.4rem', borderRadius: '8px' }}>
                                +{assignees.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <TaskStatusBadge value={t.priority} type="priority" />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                          {t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                        </td>
                        <td style={{ padding: '0.75rem 1rem', minWidth: '130px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                              <div style={{ width: `${t.progress || 0}%`, height: '100%', background: '#c60016', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '0.72rem', fontWeight: '700', color: '#c60016' }}>{t.progress || 0}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                          <TaskStatusBadge value={t.status} type="status" />
                        </td>
                        <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            className="ap-header-item-btn"
                            style={{ padding: '0.35rem 0.65rem', minHeight: '1.9rem', fontSize: '0.75rem' }}
                            onClick={(e) => {
                              e.stopPropagation()
                              setActiveTaskDrawer(t)
                            }}
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </TaskCardShell>
      )}

      {/* VIEW 2: KANBAN BOARD WITH + ICON AND FULL DRAG-DROP */}
      {activeView === 'kanban' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '1rem',
            alignItems: 'start',
          }}
        >
          {kanbanColumns.map((col) => {
            const colTasks = filteredTasks.filter((t) => {
              const st = String(t.status || 'open').toLowerCase()
              return st === col.key
            })

            return (
              <div
                key={col.key}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, col.key)}
                style={{
                  background: '#f8fafc',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '1rem',
                  minHeight: '420px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                {/* Column Header with Count Badge and + Add Icon */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                    <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: col.color }} />
                    <span style={{ fontWeight: '800', fontSize: '0.86rem', color: '#1e293b' }}>{col.label}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '10px',
                        padding: '0.1rem 0.45rem',
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        color: '#475569',
                      }}
                    >
                      {colTasks.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddModal(col.key)}
                      title={`Add Task to ${col.label}`}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        borderRadius: '8px',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: '#c60016',
                        fontSize: '0.75rem',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#ffffff' }}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>

                {/* Task Cards in Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {colTasks.map((t) => {
                    const assignees = Array.isArray(t.assignedToUserEmails) && t.assignedToUserEmails.length > 0
                      ? t.assignedToUserEmails
                      : (t.assignedTo ? [t.assignedTo] : [])

                    return (
                      <div
                        key={t.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, t)}
                        onClick={() => setActiveTaskDrawer(t)}
                        style={{
                          background: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '0.85rem',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
                          cursor: 'grab',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 6px 14px rgba(0, 0, 0, 0.06)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'none'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.03)'
                        }}
                      >
                        <div style={{ fontWeight: '800', fontSize: '0.84rem', color: '#1e293b', marginBottom: '0.4rem' }}>
                          {t.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.45rem' }}>
                          <TaskStatusBadge value={t.priority} type="priority" />
                          {t.dueDate && (
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '0.45rem', borderTop: '1px solid #f1f5f9' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                            {assignees.slice(0, 2).map((email) => (
                              <UserEmailBadge key={email} email={email} size="small" />
                            ))}
                            {assignees.length > 2 && (
                              <span style={{ fontSize: '0.66rem', fontWeight: '800', color: '#c60016' }}>
                                +{assignees.length - 2}
                              </span>
                            )}
                          </div>
                          {t.progress > 0 && (
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016' }}>
                              {t.progress}%
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* TASK DETAIL DRAWER (SLIDE-OVER) WITH REAL-TIME OPEN, UPDATE, IN PROGRESS BUTTONS */}
      {activeTaskDrawer && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setActiveTaskDrawer(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              height: '100%',
              background: '#ffffff',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '1.5rem',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1.5px solid #e2e8f0' }}>
              <div>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                  Task Details &bull; ID #{activeTaskDrawer.id}
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#1e293b' }}>
                  {activeTaskDrawer.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveTaskDrawer(null)}
                style={{ background: 'none', border: 'none', fontSize: '1.1rem', cursor: 'pointer', color: '#64748b' }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Meta Tags & CRM Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
              <TaskStatusBadge value={activeTaskDrawer.status} type="status" />
              <TaskStatusBadge value={activeTaskDrawer.priority} type="priority" />
              <TaskStatusBadge value={activeTaskDrawer.slaStatus || 'compliant'} type="sla" />
              {activeTaskDrawer.projectId && (
                <span style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', borderRadius: '10px', background: '#fef2f2', color: '#c60016', fontWeight: '800' }}>
                  Project #{activeTaskDrawer.projectId}
                </span>
              )}
              {activeTaskDrawer.dealId && (
                <span style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', borderRadius: '10px', background: '#eff6ff', color: '#2563eb', fontWeight: '700' }}>
                  Deal #{activeTaskDrawer.dealId}
                </span>
              )}
              {activeTaskDrawer.accountId && (
                <span style={{ fontSize: '0.74rem', padding: '0.2rem 0.5rem', borderRadius: '10px', background: '#faf5ff', color: '#7c3aed', fontWeight: '700' }}>
                  Account #{activeTaskDrawer.accountId}
                </span>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '1.25rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>Description</span>
              <p style={{ fontSize: '0.84rem', color: '#334155', marginTop: '0.25rem', lineHeight: 1.5, background: '#f8fafc', padding: '0.75rem', borderRadius: '10px' }}>
                {activeTaskDrawer.description || 'No description provided.'}
              </p>
            </div>

            {/* People & Multi-Assignees (MongoDB Users) */}
            <div style={{ marginBottom: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FaUserCheck style={{ color: '#c60016' }} /> Assigned Team Members
                </span>
                <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {(Array.isArray(activeTaskDrawer.assignedToUserEmails) && activeTaskDrawer.assignedToUserEmails.length > 0
                    ? activeTaskDrawer.assignedToUserEmails
                    : (activeTaskDrawer.assignedTo ? [activeTaskDrawer.assignedTo] : [])
                  ).map((email) => (
                    <UserEmailBadge key={email} email={email} showEmail />
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>Created By</span>
                <div style={{ marginTop: '0.25rem' }}>
                  <UserEmailBadge
                    email={activeTaskDrawer.createdByEmail || activeTaskDrawer.createdBy}
                    name={activeTaskDrawer.createdByName}
                    showEmail
                  />
                </div>
              </div>
            </div>

            {/* Interactive Checklist / Subtasks */}
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#64748b' }}>Checklist & Subtasks</span>
                <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#c60016' }}>
                  {activeTaskDrawer.progress || 0}% Complete
                </span>
              </div>

              {(!activeTaskDrawer.subtasks || activeTaskDrawer.subtasks.length === 0) ? (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                  No subtasks defined.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {activeTaskDrawer.subtasks.map((st) => (
                    <label
                      key={st.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        fontSize: '0.82rem',
                        cursor: 'pointer',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '8px',
                        background: st.completed ? '#f0fdf4' : '#f8fafc',
                        border: '1px solid #e2e8f0',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(st.completed)}
                        onChange={() => handleToggleSubtask(activeTaskDrawer, st.id)}
                        style={{ accentColor: '#c60016', cursor: 'pointer' }}
                      />
                      <span style={{ textDecoration: st.completed ? 'line-through' : 'none', color: st.completed ? '#64748b' : '#1e293b', flex: 1 }}>
                        {st.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* PROMINENT ACTION BUTTONS: OPEN, IN PROGRESS, AND UPDATE (REAL-TIME MONGODB PERSISTENCE) */}
            <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>
                Real-Time Actions (MongoDB Synchronized)
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isUpdating}
                  style={{
                    padding: '0.55rem 0.5rem',
                    borderRadius: '10px',
                    border: activeTaskDrawer.status === 'open' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: activeTaskDrawer.status === 'open' ? '#eff6ff' : '#ffffff',
                    color: activeTaskDrawer.status === 'open' ? '#1d4ed8' : '#334155',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                  onClick={async () => {
                    setIsUpdating(true)
                    await updateTask(activeTaskDrawer.id, { status: 'open' })
                    setActiveTaskDrawer((prev) => prev ? { ...prev, status: 'open' } : null)
                    setIsUpdating(false)
                  }}
                >
                  <FaFolderOpen /> Open
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  style={{
                    padding: '0.55rem 0.5rem',
                    borderRadius: '10px',
                    border: activeTaskDrawer.status === 'in_progress' ? '2px solid #059669' : '1px solid #cbd5e1',
                    background: activeTaskDrawer.status === 'in_progress' ? '#ecfdf5' : '#ffffff',
                    color: activeTaskDrawer.status === 'in_progress' ? '#047857' : '#334155',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                  onClick={async () => {
                    setIsUpdating(true)
                    const progress = activeTaskDrawer.progress || 50
                    await updateTask(activeTaskDrawer.id, { status: 'in_progress', progress })
                    setActiveTaskDrawer((prev) => prev ? { ...prev, status: 'in_progress', progress } : null)
                    setIsUpdating(false)
                  }}
                >
                  <FaPlay style={{ fontSize: '0.7rem' }} /> In Progress
                </button>

                <button
                  type="button"
                  disabled={isUpdating}
                  style={{
                    padding: '0.55rem 0.5rem',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(198, 0, 22, 0.25)',
                  }}
                  onClick={() => {
                    setEditingTask(activeTaskDrawer)
                    setAddTaskOpen(true)
                  }}
                >
                  <FaEdit /> Update
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Professional Task Modal with Multi-User Checkboxes & CRM Linking */}
      <ProfessionalTaskModal
        isOpen={addTaskOpen}
        onClose={() => {
          setAddTaskOpen(false)
          setEditingTask(null)
        }}
        taskData={editingTask}
        initialStatus={modalInitialStatus}
        onSuccess={() => {
          setAddTaskOpen(false)
          setEditingTask(null)
          if (activeTaskDrawer && editingTask?.id === activeTaskDrawer.id) {
            setActiveTaskDrawer(null)
          }
        }}
      />
    </TaskWorkspaceLayout>
  )
}

export default TasksWorkspacePage
