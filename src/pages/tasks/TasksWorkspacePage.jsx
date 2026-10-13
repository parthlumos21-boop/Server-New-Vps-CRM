import React, { useState, useEffect, useMemo } from 'react'
import { createPortal } from 'react-dom'
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
  FaCommentDots,
  FaPaperPlane,
  FaThLarge,
  FaChevronDown,
  FaChevronRight,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import { TaskCardShell } from './components/common/TaskCardShell'
import { TaskHeaderToolbar } from './components/common/TaskHeaderToolbar'
import { TaskGroupListView } from './components/common/TaskGroupListView'
import { TaskCalendarView } from './components/common/TaskCalendarView'
import { TaskFilterBar } from './components/common/TaskFilterBar'
import { TaskStatusBadge } from './components/common/TaskStatusBadge'
import { UserEmailBadge } from './components/common/UserEmailBadge'
import ProfessionalTaskModal from '../../components/common/ProfessionalTaskModal'
import workManagementService from '../../services/workManagementService'
import taskApi from '../../services/taskApi'
import { userApi } from '../../services/userApi'

export const TasksWorkspacePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tasks, updateTask } = useData()
  const [searchParams] = useSearchParams()

  const [activeView, setActiveView] = useState('list') // 'list' | 'kanban' | 'calendar' | 'cards'
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [filterRules, setFilterRules] = useState(() => {
    const initial = []
    const assigneeParam = searchParams.get('assignee')
    if (assigneeParam) {
      initial.push({ id: 'rule-init-assignee', field: 'assignee', value: assigneeParam })
    }
    return initial
  })
  const [selectedStatuses, setSelectedStatuses] = useState([])
  const [filterCreatedByMe, setFilterCreatedByMe] = useState(false)
  const [dateFilterPreset, setDateFilterPreset] = useState('all')
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
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [isPostingComment, setIsPostingComment] = useState(false)

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)
  const currentUserEmail = String(user?.email || user?.username || '').trim().toLowerCase()

  // Fetch comments when task drawer opens
  useEffect(() => {
    if (!activeTaskDrawer?.id) {
      setComments([])
      return
    }
    let isMounted = true
    const fetchComments = async () => {
      try {
        setLoadingComments(true)
        const list = await taskApi.getComments(activeTaskDrawer.id)
        if (isMounted) {
          setComments(Array.isArray(list) ? list : [])
        }
      } catch (err) {
        console.error('Failed to fetch task comments', err)
      } finally {
        if (isMounted) setLoadingComments(false)
      }
    }
    fetchComments()
    return () => {
      isMounted = false
    }
  }, [activeTaskDrawer?.id])

  const handleAddComment = async (e) => {
    if (e) e.preventDefault()
    const trimmed = String(newComment || '').trim()
    if (!trimmed || !activeTaskDrawer?.id || isPostingComment) return
    try {
      setIsPostingComment(true)
      const actorName = user?.name || user?.username || currentUserEmail.split('@')[0] || 'User'
      const payload = {
        comment: trimmed,
        projectId: activeTaskDrawer.projectId || null,
        userEmail: currentUserEmail,
        userName: actorName,
        taskDetails: {
          id: activeTaskDrawer.id,
          title: activeTaskDrawer.title,
          description: activeTaskDrawer.description,
          status: activeTaskDrawer.status,
          priority: activeTaskDrawer.priority,
          assignedTo: activeTaskDrawer.assignedTo,
          assignedToUserEmails: activeTaskDrawer.assignedToUserEmails,
          progress: activeTaskDrawer.progress,
          dueDate: activeTaskDrawer.dueDate,
          dealId: activeTaskDrawer.dealId,
          accountId: activeTaskDrawer.accountId,
        },
      }
      const res = await taskApi.addComment(activeTaskDrawer.id, payload)
      const created = res?.data || res
      if (created && created.comment) {
        setComments((prev) => [...prev, created])
      } else {
        const fresh = await taskApi.getComments(activeTaskDrawer.id)
        setComments(Array.isArray(fresh) ? fresh : [])
      }
      setNewComment('')
    } catch (err) {
      console.error('Failed to post task comment', err)
    } finally {
      setIsPostingComment(false)
    }
  }

  // Fetch users directory from MongoDB users collection and CRM directory
  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const [overview, directoryUsers] = await Promise.all([
          workManagementService.getOverview().catch(() => null),
          userApi.listDirectory().catch(() => []),
        ])
        const combined = []
        if (overview?.teamMembers) combined.push(...overview.teamMembers)
        if (Array.isArray(directoryUsers)) combined.push(...directoryUsers)
        const seen = new Set()
        const unique = []
        combined.forEach((u) => {
          const key = String(u._id || u.id || u.email || '').toLowerCase()
          if (key && !seen.has(key)) {
            seen.add(key)
            unique.push(u)
          }
        })
        setUserList(unique)
      } catch (err) {
        console.error('Failed to fetch team members', err)
      }
    }
    fetchTeam()
  }, [])

  // Build user name lookup dictionary so MongoDB IDs and raw strings are resolved to full names
  const userNameMap = useMemo(() => {
    const map = {}
    userList.forEach((u) => {
      const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username || u.email
      if (u._id) map[String(u._id)] = name
      if (u.id) map[String(u.id)] = name
      if (u.email) map[String(u.email).toLowerCase().trim()] = name
      if (u.username) map[String(u.username).toLowerCase().trim()] = name
    })
    return map
  }, [userList])

  const resolveAssigneeName = (raw) => {
    if (!raw) return 'Unassigned'
    const key = String(raw).trim()
    if (userNameMap[key]) return userNameMap[key]
    if (userNameMap[key.toLowerCase()]) return userNameMap[key.toLowerCase()]
    if (key.includes('@')) {
      const prefix = key.split('@')[0]
      return prefix.charAt(0).toUpperCase() + prefix.slice(1)
    }
    return key
  }

  const toggleGroup = (key) => {
    setCollapsedGroups((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleToggleTaskDone = async (taskItem, e) => {
    if (e) e.stopPropagation()
    try {
      const isDone = ['completed', 'closed'].includes(String(taskItem.status || '').toLowerCase())
      await updateTask(taskItem.id, {
        status: isDone ? 'in_progress' : 'completed',
        progress: isDone ? 50 : 100,
      })
    } catch (err) {
      console.error('Failed to toggle task completion in MongoDB', err)
    }
  }

  // Inline status update via TaskStatusPill dropdown
  const handleInlineStatusUpdate = async (taskId, newStatus) => {
    try {
      const isComplete = ['completed', 'closed'].includes(String(newStatus).toLowerCase())
      const matched = (tasks || []).find((t) => String(t.id) === String(taskId))
      const progress = isComplete
        ? 100
        : newStatus === 'in_progress' || newStatus === 'processing'
        ? 50
        : (matched?.progress || 25)
      await updateTask(taskId, {
        status: newStatus,
        progress: progress,
      })
    } catch (err) {
      console.error('Failed to update task status inline', err)
    }
  }

  const handleToggleStatusFilter = (statusKey) => {
    setSelectedStatuses((prev) =>
      prev.includes(statusKey) ? prev.filter((k) => k !== statusKey) : [...prev, statusKey]
    )
  }

  // Filter tasks based on role, star filter, status multi-chip, date preset, and dynamic rules
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter((t) => {
      // Role scope: If not admin, restrict to tasks where user email is assignedTo, in assignedToUserEmails, createdBy, or follower
      if (!isAdmin) {
        const assigned = String(t.assignedTo || '').trim().toLowerCase()
        const assignedList = Array.isArray(t.assignedToUserEmails)
          ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
          : []
        const created = String(t.createdBy || '').trim().toLowerCase()
        const isFollower =
          Array.isArray(t.followers) &&
          t.followers.some((f) => String(f).trim().toLowerCase() === currentUserEmail)
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

      // Star filter: Created by me
      if (filterCreatedByMe) {
        const created = String(t.createdBy || '').trim().toLowerCase()
        if (created !== currentUserEmail) return false
      }

      // Quick status chip multi-select
      if (selectedStatuses.length > 0) {
        const st = String(t.status || 'open').toLowerCase()
        const matchesAny = selectedStatuses.some((target) => {
          if (target === 'processing' && (st === 'in_progress' || st === 'processing')) return true
          if (target === 'checking' && (st === 'review' || st === 'checking')) return true
          if (target === 'pending' && (st === 'pending' || st === 'open')) return true
          if (target === 'completed' && (st === 'completed' || st === 'closed')) return true
          return st === target
        })
        if (!matchesAny) return false
      }

      // Date filter preset
      if (dateFilterPreset && dateFilterPreset !== 'all') {
        if (!t.dueDate) return false
        const due = new Date(t.dueDate)
        const now = new Date()
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

        if (dateFilterPreset === 'today') {
          if (due < todayStart || due > todayEnd) return false
        } else if (dateFilterPreset === 'this_week') {
          const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000)
          if (due < todayStart || due > weekEnd) return false
        } else if (dateFilterPreset === 'overdue') {
          const isDone = ['completed', 'closed'].includes(String(t.status || '').toLowerCase())
          if (isDone || due >= todayStart) return false
        }
      }

      // Dynamic Filter Rules (from Floating Popover)
      for (const rule of filterRules) {
        if (!rule.value) continue
        const val = String(rule.value).toLowerCase().trim()

        if (rule.field === 'task') {
          const titleMatch = String(t.title || '').toLowerCase().includes(val)
          const descMatch = String(t.description || '').toLowerCase().includes(val)
          const dealMatch = String(t.dealId || '').toLowerCase().includes(val)
          const accMatch = String(t.accountId || '').toLowerCase().includes(val)
          if (!titleMatch && !descMatch && !dealMatch && !accMatch) return false
        } else if (rule.field === 'assignee') {
          const assigned = String(t.assignedTo || '').trim().toLowerCase()
          const assignedList = Array.isArray(t.assignedToUserEmails)
            ? t.assignedToUserEmails.map((e) => String(e).toLowerCase().trim())
            : []
          if (assigned !== val && !assignedList.includes(val)) return false
        } else if (rule.field === 'status') {
          const st = String(t.status || '').toLowerCase()
          if (val === 'pending' && (st === 'open' || st === 'pending')) {
            // match
          } else if (val === 'processing' && (st === 'in_progress' || st === 'processing')) {
            // match
          } else if (val === 'checking' && (st === 'review' || st === 'checking')) {
            // match
          } else if (st !== val) {
            return false
          }
        } else if (rule.field === 'priority') {
          if (String(t.priority || '').toLowerCase() !== val) return false
        }
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
  }, [
    tasks,
    isAdmin,
    currentUserEmail,
    filterCreatedByMe,
    selectedStatuses,
    dateFilterPreset,
    filterRules,
    searchQuery,
    user?.id,
  ])

  // Group tasks for screenshot-style List View (Ongoing, Pinned, Today, Completed)
  const listGroups = useMemo(() => {
    const ongoing = []
    const pinned = []
    const today = []
    const completed = []

    filteredTasks.forEach((t) => {
      const status = String(t.status || 'open').toLowerCase()
      const priority = String(t.priority || 'medium').toLowerCase()

      if (['completed', 'closed'].includes(status)) {
        completed.push(t)
      } else if (['in_progress', 'review', 'processing'].includes(status)) {
        ongoing.push(t)
      } else if (['urgent', 'high'].includes(priority) || t.pinned) {
        pinned.push(t)
      } else {
        today.push(t)
      }
    })

    return [
      { key: 'ongoing', label: 'Ongoing', color: '#2563eb', tasks: ongoing },
      { key: 'pinned', label: 'Pinned', color: '#dc2626', tasks: pinned },
      { key: 'today', label: 'Today', color: '#c60016', tasks: today },
      { key: 'completed', label: 'Completed', color: '#15803d', tasks: completed },
    ]
  }, [filteredTasks])

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
      {/* SaaS Header Toolbar matching Image 1 */}
      <TaskHeaderToolbar
        activeView={activeView}
        onViewChange={setActiveView}
        filterRules={filterRules}
        onFilterRulesChange={setFilterRules}
        userList={userList}
        selectedStatuses={selectedStatuses}
        onToggleStatusFilter={handleToggleStatusFilter}
        filterCreatedByMe={filterCreatedByMe}
        onToggleCreatedByMe={() => setFilterCreatedByMe((prev) => !prev)}
        dateFilterPreset={dateFilterPreset}
        onDateFilterChange={setDateFilterPreset}
        onAddTask={() => handleOpenAddModal('open')}
        title={isAdmin ? 'My Task' : 'My Task'}
      />

      {/* VIEW 1: MODERN SCREENSHOT-STYLE LIST VIEW MATCHING IMAGE 1 */}
      {activeView === 'list' && (
        <TaskGroupListView
          groups={listGroups}
          collapsedGroups={collapsedGroups}
          onToggleGroup={toggleGroup}
          onToggleTaskDone={handleToggleTaskDone}
          onOpenTask={setActiveTaskDrawer}
          onUpdateStatus={handleInlineStatusUpdate}
          resolveAssigneeName={resolveAssigneeName}
          userNameMap={userNameMap}
        />
      )}

      {/* VIEW 2: CALENDAR VIEW MATCHING IMAGE 1 */}
      {activeView === 'calendar' && (
        <TaskCalendarView
          tasks={filteredTasks}
          onOpenTask={setActiveTaskDrawer}
        />
      )}

      {/* VIEW 2: CARD VIEW (GRIDS WITH RELEVANT DETAILS) */}
      {activeView === 'cards' && (
        <div>
          {filteredTasks.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b', background: '#ffffff', borderRadius: '16px', border: '1.5px solid #e2e8f0' }}>
              No tasks match the selected filters.
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                gap: '1rem',
              }}
            >
              {filteredTasks.map((t, idx) => {
                const assignees = Array.isArray(t.assignedToUserEmails) && t.assignedToUserEmails.length > 0
                  ? t.assignedToUserEmails
                  : (t.assignedTo ? [t.assignedTo] : [])

                return (
                  <div
                    key={t.id}
                    onClick={() => setActiveTaskDrawer(t)}
                    style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '1.15rem',
                      boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#c60016'
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(198, 0, 22, 0.08)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0'
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = '0 4px 18px rgba(0, 0, 0, 0.03)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016', background: '#fef2f2', padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
                          #{idx + 1}
                        </span>
                        <TaskStatusBadge value={t.priority} type="priority" />
                      </div>
                      <TaskStatusBadge value={t.status} type="status" />
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.35 }}>
                        {t.title}
                      </h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.4rem', marginTop: '0.35rem', fontSize: '0.7rem' }}>
                        {t.projectId && <span style={{ color: '#c60016', fontWeight: '700', background: '#fef2f2', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Project #{t.projectId}</span>}
                        {t.dealId && <span style={{ color: '#2563eb', fontWeight: '600', background: '#eff6ff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Deal #{t.dealId}</span>}
                        {t.accountId && <span style={{ color: '#7c3aed', fontWeight: '600', background: '#faf5ff', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>Account #{t.accountId}</span>}
                        {t.quotationId && <span style={{ color: '#059669', fontWeight: '600', background: '#ecfdf5', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>QT #{t.quotationId}</span>}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: '#64748b', marginBottom: '0.25rem' }}>
                        <span>Checklist</span>
                        <span style={{ fontWeight: '700', color: '#c60016' }}>{t.progress || 0}%</span>
                      </div>
                      <div style={{ height: '6px', borderRadius: '3px', background: '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ width: `${t.progress || 0}%`, height: '100%', background: '#c60016', borderRadius: '3px' }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #f1f5f9', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', alignItems: 'center' }}>
                        {assignees.slice(0, 2).map((email) => (
                          <UserEmailBadge
                            key={email}
                            email={email}
                            name={resolveAssigneeName(email)}
                            size="small"
                            showEmail={false}
                          />
                        ))}
                        {assignees.length > 2 && (
                          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#c60016' }}>
                            +{assignees.length - 2}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {t.dueDate && (
                          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                            {new Date(t.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        )}
                        <button
                          type="button"
                          className="ap-header-item-btn"
                          style={{ padding: '0.25rem 0.6rem', minHeight: '1.8rem', fontSize: '0.72rem' }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setActiveTaskDrawer(t)
                          }}
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
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
                              <UserEmailBadge
                                key={email}
                                email={email}
                                name={resolveAssigneeName(email)}
                                size="small"
                              />
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
      {activeTaskDrawer && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0, 0, 0, 0.45)',
            zIndex: 99999,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={() => setActiveTaskDrawer(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '540px',
              height: '100vh',
              maxHeight: '100vh',
              background: '#ffffff',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflowY: 'auto',
              padding: '1.5rem',
              boxSizing: 'border-box',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header with Update button on top right */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1.5px solid #e2e8f0', gap: '0.75rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#c60016', textTransform: 'uppercase' }}>
                  Task Details &bull; ID #{activeTaskDrawer.id}
                </span>
                <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.15rem', fontWeight: '800', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeTaskDrawer.title}
                </h3>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                <button
                  type="button"
                  disabled={isUpdating}
                  style={{
                    padding: '0.45rem 0.85rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #c60016 0%, #80000e 100%)',
                    color: '#ffffff',
                    fontWeight: '800',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    boxShadow: '0 2px 8px rgba(198, 0, 22, 0.25)',
                  }}
                  onClick={() => {
                    navigate(isAdmin ? `/admin/tasks/edit/${activeTaskDrawer.id}` : `/tasks/edit/${activeTaskDrawer.id}`)
                  }}
                  title="Update Task"
                >
                  <FaEdit /> <span>Update</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTaskDrawer(null)}
                  style={{ background: 'none', border: 'none', fontSize: '1.15rem', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', padding: '0.2rem' }}
                  title="Close Details"
                >
                  <FaTimes />
                </button>
              </div>
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
                    <UserEmailBadge
                      key={email}
                      email={email}
                      name={resolveAssigneeName(email)}
                      showEmail
                    />
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

            {/* JIRA TICKET ACTIVITY & COMMENTS SYSTEM */}
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1.5px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FaCommentDots style={{ color: '#c60016' }} /> Activity & Comments ({comments.length})
                </span>
                {activeTaskDrawer.projectId && (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
                    Project #{activeTaskDrawer.projectId}
                  </span>
                )}
              </div>

              {/* Scrollable Comments History List */}
              <div
                style={{
                  maxHeight: '260px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.65rem',
                  paddingRight: '0.25rem',
                }}
              >
                {loadingComments ? (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.75rem 0' }}>
                    Loading comments...
                  </div>
                ) : comments.length === 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No comments yet. Be the first to comment on this task.
                  </div>
                ) : (
                  comments.map((cm, idx) => {
                    const commenterName = cm.userName || (cm.userEmail ? cm.userEmail.split('@')[0] : 'User')
                    const initials = commenterName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'U'
                    const dateStr = cm.createdAt
                      ? new Date(cm.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'Recently'

                    return (
                      <div
                        key={cm.id || idx}
                        style={{
                          display: 'flex',
                          gap: '0.6rem',
                          background: '#f8fafc',
                          padding: '0.65rem 0.75rem',
                          borderRadius: '10px',
                          border: '1px solid #e2e8f0',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            background: '#eff6ff',
                            color: '#2563eb',
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            border: '1px solid #bfdbfe',
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: '800', fontSize: '0.8rem', color: '#1e293b' }}>
                                {commenterName}
                              </span>
                              {cm.userEmail && (
                                <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                  &lt;{cm.userEmail}&gt;
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                              {dateStr}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#334155', marginTop: '0.25rem', whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
                            {cm.comment}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Jira-style Comment Box */}
              <form onSubmit={handleAddComment} style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment... (Ctrl+Enter to post)"
                  rows={2}
                  onKeyDown={(e) => {
                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                      handleAddComment(e)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '8px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.82rem',
                    outline: 'none',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.45rem' }}>
                  {newComment.trim() && (
                    <button
                      type="button"
                      onClick={() => setNewComment('')}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.76rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        padding: '0.3rem 0.6rem',
                      }}
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!newComment.trim() || isPostingComment}
                    style={{
                      background: newComment.trim() ? '#2563eb' : '#94a3b8',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.4rem 0.85rem',
                      fontSize: '0.78rem',
                      fontWeight: '700',
                      cursor: newComment.trim() && !isPostingComment ? 'pointer' : 'not-allowed',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <FaPaperPlane style={{ fontSize: '0.68rem' }} />
                    <span>{isPostingComment ? 'Posting...' : 'Save Comment'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>,
        document.body
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
