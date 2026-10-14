import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaUsers,
  FaSyncAlt,
  FaTasks,
} from 'react-icons/fa'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { TaskWorkspaceLayout } from './components/common/TaskWorkspaceLayout'
import workManagementService from '../../services/workManagementService'
import taskApi from '../../services/taskApi'

// Workload Analytics Components
import { WorkloadUserList } from './components/workload/WorkloadUserList'
import { WorkloadUserHeader } from './components/workload/WorkloadUserHeader'
import { WorkloadViewTabs } from './components/workload/WorkloadViewTabs'
import { WorkloadKpiCards } from './components/workload/WorkloadKpiCards'
import { PriorityAnalysisChart } from './components/workload/PriorityAnalysisChart'
import { PerformanceAnalysisChart } from './components/workload/PerformanceAnalysisChart'
import { IncompleteTaskChart } from './components/workload/IncompleteTaskChart'
import { WorkloadUserKanban } from './components/workload/WorkloadUserKanban'
import { CapacitySettingsModal } from './components/workload/CapacitySettingsModal'

// Identical Components matching /admin/tasks/all
import { TaskGroupListView } from './components/common/TaskGroupListView'
import { TaskCalendarView } from './components/common/TaskCalendarView'
import TaskDetailsWorkspaceModal from './components/details/TaskDetailsWorkspaceModal'

export const TeamWorkloadPage = () => {
  const { user } = useAuth()
  const { tasks: globalTasks, updateTask: globalUpdateTask } = useData()
  const navigate = useNavigate()

  // Master Users & Workload State (all from database users & tasks)
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [members, setMembers] = useState([])
  const [departments, setDepartments] = useState([])

  // Selection & View Tabs
  const [selectedUser, setSelectedUser] = useState(null)
  const [activeTab, setActiveTab] = useState('overview') // 'overview' | 'list' | 'kanban' | 'calendar'

  // Period Filter State
  const [period, setPeriod] = useState('month')
  const [customDates, setCustomDates] = useState({ start: '', end: '' })

  // Selected User Live Analytics
  const [analyticsLoading, setAnalyticsLoading] = useState(false)
  const [userAnalytics, setUserAnalytics] = useState(null)

  // Drawer / Modal for Updating Tasks (Exact parity with /admin/tasks/all)
  const [activeTaskDrawer, setActiveTaskDrawer] = useState(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})

  // Favorites (Optimistic toggle & localStorage persistence)
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('workload_favorite_users')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch {
      return new Set()
    }
  })

  // Modals
  const [isCapacityModalOpen, setIsCapacityModalOpen] = useState(false)
  const [isSavingCapacity, setIsSavingCapacity] = useState(false)

  const isAdmin = ['admin', 'super_admin', 'manager'].includes(user?.role)
  const currentUserEmail = String(user?.email || user?.username || '').trim().toLowerCase()

  // 1. Fetch all team members on mount
  const fetchMembers = useCallback(async () => {
    try {
      setLoadingMembers(true)
      const data = await workManagementService.getTeamWorkload()
      const list = data?.members || []
      setMembers(list)
      setDepartments(data?.departments || [])

      // Initial selection: maintain current selection or default to current user / first user
      setSelectedUser((prev) => {
        if (prev) {
          const found = list.find((m) => String(m.email).toLowerCase() === String(prev.email).toLowerCase())
          if (found) return found
        }
        if (!isAdmin) {
          const own = list.find((m) => String(m.email).toLowerCase() === currentUserEmail)
          if (own) return own
        }
        return list[0] || null
      })
    } catch (err) {
      console.error('Failed to load team workload members:', err)
    } finally {
      setLoadingMembers(false)
    }
  }, [isAdmin, currentUserEmail])

  useEffect(() => {
    fetchMembers()
  }, [fetchMembers])

  // 2. Fetch Selected User Analytics whenever user, period, or customDates change
  const fetchUserAnalytics = useCallback(async (targetEmail, targetPeriod, dates) => {
    if (!targetEmail) return
    try {
      setAnalyticsLoading(true)
      const params = {
        userEmail: targetEmail,
        period: targetPeriod || 'month',
      }
      if (targetPeriod === 'custom' && dates?.start) {
        params.startDate = dates.start
        params.endDate = dates.end
      }
      const res = await workManagementService.getUserWorkloadAnalytics(params)
      if (res && (res.data || res.summary)) {
        setUserAnalytics(res.data || res)
      }
    } catch (err) {
      console.error('Failed to load user workload analytics:', err)
    } finally {
      setAnalyticsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (selectedUser?.email) {
      fetchUserAnalytics(selectedUser.email, period, customDates)
    }
  }, [selectedUser?.email, period, customDates, fetchUserAnalytics])

  // 3. Optimistic Favorite Star Toggling
  const handleToggleFavorite = (email) => {
    const key = String(email).toLowerCase()
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      try {
        localStorage.setItem('workload_favorite_users', JSON.stringify(Array.from(next)))
      } catch (e) {}
      return next
    })
  }

  // 4. Optimistic User Selection
  const handleSelectUser = (userDoc) => {
    setSelectedUser(userDoc)
    if (userAnalytics && userAnalytics.user) {
      setUserAnalytics((prev) => ({
        ...prev,
        user: {
          ...prev.user,
          name: userDoc.name || userDoc.username || userDoc.email,
          email: userDoc.email,
          role: userDoc.role,
          department: userDoc.department,
        },
      }))
    }
  }

  // 5. Inline Status Update (Sync with Backend & Optimistic UI)
  const handleInlineStatusUpdate = async (taskId, newStatus) => {
    const isComplete = newStatus === 'completed' || newStatus === 'closed'
    const progress = isComplete ? 100 : newStatus === 'in_progress' ? 50 : 25

    // Optimistic local update
    setUserAnalytics((prev) => {
      if (!prev || !prev.tasks) return prev
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id === taskId || t._id === taskId) {
          return { ...t, status: newStatus, progress }
        }
        return t
      })
      return { ...prev, tasks: updatedTasks }
    })

    try {
      if (globalUpdateTask) {
        await globalUpdateTask(taskId, { status: newStatus, progress })
      } else {
        await taskApi.update(taskId, { status: newStatus, progress })
      }
      fetchMembers()
    } catch (err) {
      console.error('Failed to update task status inline', err)
      if (selectedUser?.email) {
        fetchUserAnalytics(selectedUser.email, period, customDates)
      }
    }
  }

  // 6. Toggle Task Done (Check/Uncheck)
  const handleToggleTaskDone = (taskItem) => {
    const taskId = taskItem.id || taskItem._id
    const isDone = ['completed', 'closed'].includes(String(taskItem.status || '').toLowerCase())
    const nextStatus = isDone ? 'open' : 'completed'
    handleInlineStatusUpdate(taskId, nextStatus)
  }

  // 7. Toggle Collapsed Group in List View
  const toggleGroup = (groupKey) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }))
  }

  // 8. Save Capacity Settings
  const handleSaveCapacity = async (payload) => {
    try {
      setIsSavingCapacity(true)
      await workManagementService.updateWorkloadSettings(selectedUser.userId || selectedUser.id || selectedUser.email, payload)
      setIsCapacityModalOpen(false)
      fetchMembers()
      if (selectedUser?.email) {
        fetchUserAnalytics(selectedUser.email, period, customDates)
      }
    } catch (err) {
      console.error('Failed to save capacity settings:', err)
    } finally {
      setIsSavingCapacity(false)
    }
  }

  // User details for header & cards
  const displayUser = userAnalytics?.user || selectedUser || {}
  const summary = userAnalytics?.summary || {
    completedTasks: selectedUser?.completedTasks || 0,
    incompleteTasks: selectedUser?.activeTasks || 0,
    overdueTasks: selectedUser?.overdueTasks || 0,
    totalTasks: (selectedUser?.activeTasks || 0) + (selectedUser?.completedTasks || 0),
  }
  const priorityData = userAnalytics?.priorityDistribution || { low: 0, medium: 0, high: 0 }
  const performanceData = userAnalytics?.performanceDistribution || {
    onTrack: { count: 0, percent: 0 },
    beforeTime: { count: 0, percent: 0 },
    delayed: { count: 0, percent: 0 },
  }
  const statusDistribution = userAnalytics?.statusDistribution || []
  const projectDistribution = userAnalytics?.projectDistribution || []
  const userTasks = userAnalytics?.tasks || selectedUser?.tasks || []

  // Name map for assignee resolution
  const userNameMap = useMemo(() => {
    const map = {}
    members.forEach((m) => {
      if (m.email) map[m.email.toLowerCase()] = m.name || m.email
    })
    return map
  }, [members])

  const resolveAssigneeName = (email) => {
    if (!email) return 'Unassigned'
    return userNameMap[String(email).toLowerCase()] || email
  }

  // Group tasks for screenshot-style List View exact matching /admin/tasks/all (Ongoing, Pinned, Today, Completed)
  const listGroups = useMemo(() => {
    const ongoing = []
    const pinned = []
    const today = []
    const completed = []

    userTasks.forEach((t) => {
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
  }, [userTasks])

  return (
    <TaskWorkspaceLayout activeTab="workload">
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          alignItems: 'stretch',
          width: '100%',
          minHeight: '100%',
        }}
      >
        {/* PANEL 1: Left User Selection Sidebar (Sticky, capped height, internal scrollbar) */}
        {isAdmin && (
          <div
            style={{
              width: '280px',
              minWidth: '280px',
              position: 'sticky',
              top: '0.75rem',
              alignSelf: 'flex-start',
              height: 'calc(100vh - 175px)',
              maxHeight: 'calc(100vh - 175px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <WorkloadUserList
              users={members}
              selectedUser={selectedUser}
              onSelectUser={handleSelectUser}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              departments={departments}
              loading={loadingMembers}
            />
          </div>
        )}

        {/* PANEL 2: Selected User Analytics Workspace */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}
        >
          {/* Header Controls (No Export Button, SLA Compliant White Background) */}
          <WorkloadUserHeader
            user={displayUser}
            onRefresh={() => fetchUserAnalytics(selectedUser?.email, period, customDates)}
            onOpenCapacitySettings={isAdmin ? () => setIsCapacityModalOpen(true) : null}
            isRefreshing={analyticsLoading}
          />

          {/* View Switcher Tabs + Period Tabs on Right (On top of KPI Cards) */}
          <WorkloadViewTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            taskCounts={{
              total: summary.totalTasks,
              incomplete: summary.incompleteTasks,
            }}
            period={period}
            onPeriodChange={setPeriod}
            customDates={customDates}
            onCustomDatesChange={setCustomDates}
          />

          {/* Tab Content Rendering */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 4 KPI Cards */}
              <WorkloadKpiCards
                summary={summary}
                periodLabel={period === 'month' ? 'this month' : period === 'week' ? 'this week' : period}
                onCardClick={(cardId) => {
                  if (cardId === 'incomplete' || cardId === 'total') setActiveTab('list')
                  if (cardId === 'overdue') setActiveTab('list')
                }}
              />

              {/* Row 2: Priority Analysis & Performance Analysis */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '1rem',
                }}
              >
                <PriorityAnalysisChart
                  priorityData={priorityData}
                  onSelectPriority={() => setActiveTab('list')}
                />
                <PerformanceAnalysisChart
                  performanceData={performanceData}
                />
              </div>

              {/* Row 3: Incompleted Task Analysis Full-Width Chart */}
              <IncompleteTaskChart
                statusDistribution={statusDistribution}
                priorityDistribution={priorityData}
                projectDistribution={projectDistribution}
                onBarClick={() => setActiveTab('list')}
              />
            </div>
          )}

          {/* EXACT SAME LIST VIEW AS /admin/tasks/all WITH TASK DETAILS WORKSPACE MODAL */}
          {activeTab === 'list' && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '16px',
                padding: '1.15rem 1.25rem',
                boxShadow: '0 4px 18px rgba(0, 0, 0, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaTasks style={{ color: '#c60016', fontSize: '1rem' }} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '800', color: '#1e293b' }}>
                    Tasks &bull; {displayUser?.name || displayUser?.email}
                  </h3>
                </div>
                <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700' }}>
                  {userTasks.length} Assigned Tasks
                </span>
              </div>

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
            </div>
          )}

          {/* KANBAN VIEW FOR SELECTED USER */}
          {activeTab === 'kanban' && (
            <WorkloadUserKanban
              tasks={userTasks}
              onStatusChange={handleInlineStatusUpdate}
              onOpenTask={setActiveTaskDrawer}
              resolveAssigneeName={resolveAssigneeName}
              isAdmin={isAdmin}
            />
          )}

          {/* EXACT SAME CALENDAR VIEW AS /admin/tasks/all */}
          {activeTab === 'calendar' && (
            <TaskCalendarView
              tasks={userTasks}
              onOpenTask={setActiveTaskDrawer}
            />
          )}
        </div>
      </div>

      {/* Capacity Settings Modal */}
      {isCapacityModalOpen && (
        <CapacitySettingsModal
          user={displayUser}
          onClose={() => setIsCapacityModalOpen(false)}
          onSave={handleSaveCapacity}
          isSaving={isSavingCapacity}
        />
      )}

      {/* EXACT SAME UPDATE TASKS TWO-PANEL WORKSPACE MODAL AS /admin/tasks/all */}
      <TaskDetailsWorkspaceModal
        isOpen={Boolean(activeTaskDrawer)}
        task={activeTaskDrawer}
        onClose={() => setActiveTaskDrawer(null)}
        onUpdateTask={(updated) => {
          setActiveTaskDrawer(updated)
          if (updated && (updated.id || updated._id)) {
            const taskId = updated.id || updated._id
            if (globalUpdateTask) {
              globalUpdateTask(taskId, updated)
            }
            setUserAnalytics((prev) => {
              if (!prev || !prev.tasks) return prev
              return {
                ...prev,
                tasks: prev.tasks.map((t) => (t.id === taskId || t._id === taskId) ? { ...t, ...updated } : t),
              }
            })
            fetchMembers()
          }
        }}
        allTasks={userTasks}
        currentUser={user}
        availableUsers={members}
        isAdmin={isAdmin}
      />
    </TaskWorkspaceLayout>
  )
}

export default TeamWorkloadPage
