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
import TaskDetailsWorkspaceModal from './components/details/TaskDetailsWorkspaceModal'
import workManagementService from '../../services/workManagementService'
import taskApi from '../../services/taskApi'
import { userApi } from '../../services/userApi'

export const TasksWorkspacePage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { tasks, updateTask, accounts, deals } = useData()
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
  const [createdByMeTasks, setCreatedByMeTasks] = useState(null)
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

  // Fetch tasks created by me from Express backend when filter is active
  useEffect(() => {
    if (!filterCreatedByMe) {
      setCreatedByMeTasks(null)
      return
    }
    let isMounted = true
    taskApi
      .getTasksCreatedByMe()
      .then((list) => {
        if (isMounted) setCreatedByMeTasks(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        console.error('Failed to fetch tasks created by me from Express backend', err)
      })
    return () => {
      isMounted = false
    }
  }, [filterCreatedByMe])

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
      // Eliminate empty, null, or uninitialized dummy tasks (prevent "U — U Pending")
      if (!t || (!t.id && !t.legacyId && !t._id) || !String(t.title || '').trim()) {
        return false
      }

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

      // Star filter: Created by me (MongoDB Express layer + multi-collection link resolution)
      if (filterCreatedByMe) {
        if (Array.isArray(createdByMeTasks)) {
          const match = createdByMeTasks.some((m) => String(m.id) === String(t.id))
          if (!match) return false
        } else {
          const currentUserIdStr = String(user?.id || user?.legacyId || '').trim()
          const currentEmail = currentUserEmail
          const currentName = String(user?.name || '').trim().toLowerCase()
          const currentOwnerCode = String(user?.ownerCode || '').trim().toLowerCase()

          const taskCreator = String(t.createdBy || '').trim().toLowerCase()
          const isDirectCreator =
            taskCreator === currentEmail ||
            taskCreator === currentUserIdStr.toLowerCase() ||
            (currentName && taskCreator === currentName)

          const matchedAccount = (accounts || []).find(
            (a) => String(a.id) === String(t.accountId) || String(a.accountNumber) === String(t.accountId)
          )
          const isAccountCreator =
            matchedAccount &&
            (String(matchedAccount.createdBy || '').toLowerCase() === currentEmail ||
              String(matchedAccount.createdBy || '') === currentUserIdStr ||
              (currentName && String(matchedAccount.accountOwner || '').toLowerCase() === currentName) ||
              (currentOwnerCode && String(matchedAccount.ownerCode || '').toLowerCase() === currentOwnerCode))

          const matchedDeal = (deals || []).find(
            (d) => String(d.id) === String(t.dealId) || String(d.dealNumber) === String(t.dealId)
          )
          const isDealCreator =
            matchedDeal &&
            (String(matchedDeal.createdBy || '').toLowerCase() === currentEmail ||
              String(matchedDeal.createdBy || '') === currentUserIdStr ||
              (currentName && String(matchedDeal.dealOwner || '').toLowerCase() === currentName) ||
              (currentOwnerCode && String(matchedDeal.ownerCode || '').toLowerCase() === currentOwnerCode))

          if (!isDirectCreator && !isAccountCreator && !isDealCreator) return false
        }
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
    e.dataTransfer.setData('text/plain', String(taskItem.id || taskItem._id))
  }

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault()
    const taskId = e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const matchedTask = tasks.find((t) => String(t.id) === String(taskId) || String(t._id) === String(taskId))
    if (!matchedTask) return
    const currentStatus = String(matchedTask.status || 'open').toLowerCase()
    if (currentStatus === targetStatus) return

    try {
      setIsUpdating(true)
      const isComplete = targetStatus === 'completed'
      const newProgress = isComplete
        ? 100
        : (matchedTask.progress || (targetStatus === 'in_progress' ? 50 : targetStatus === 'checking' ? 75 : 25))
      await updateTask(taskId, {
        ...matchedTask,
        status: targetStatus,
        progress: newProgress,
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
    { key: 'draft', label: 'Draft', color: '#64748b', bg: '#f1f5f9', matchStatuses: ['draft'] },
    { key: 'open', label: 'Pending', color: '#b45309', bg: '#fef3c7', matchStatuses: ['open', 'pending'] },
    { key: 'checking', label: 'Checking', color: '#b91c1c', bg: '#fee2e2', matchStatuses: ['checking'] },
    { key: 'in_progress', label: 'Processing', color: '#6d28d9', bg: '#ede9fe', matchStatuses: ['in_progress', 'processing'] },
    { key: 'completed', label: 'Completed', color: '#15803d', bg: '#dcfce7', matchStatuses: ['completed', 'closed', 'done'] },
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
        title={isAdmin ? 'Tasks' : 'Tasks'}
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
              if (!t || !t.id || (!t.title && !t.description)) return false
              const st = String(t.status || 'open').toLowerCase()
              return (col.matchStatuses || [col.key]).includes(st)
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

      {/* REDESIGNED TASK DETAILS TWO-PANEL WORKSPACE MODAL (MATCHING IMAGE 1) */}
      <TaskDetailsWorkspaceModal
        isOpen={Boolean(activeTaskDrawer)}
        task={activeTaskDrawer}
        onClose={() => setActiveTaskDrawer(null)}
        onUpdateTask={(updated) => {
          setActiveTaskDrawer(updated)
          if (updated && updated.id) {
            updateTask?.(updated.id, updated)
          }
        }}
        allTasks={filteredTasks}
        currentUser={user}
        availableUsers={userList}
        isAdmin={isAdmin}
      />


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
