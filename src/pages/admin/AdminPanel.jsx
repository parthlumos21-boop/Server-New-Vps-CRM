import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaAddressCard,
  FaArrowRight,
  FaCalendarAlt,
  FaBell,
  FaBriefcase,
  FaClipboardList,
  FaDesktop,
  FaEnvelope,
  FaFileAlt,
  FaFilter,
  FaHandshake,
  FaHeadset,
  FaHome,
  FaRegClock,
  FaStar,
  FaSyncAlt,
  FaTable,
  FaTasks,
  FaThLarge,
  FaUser,
  FaUsers,
  FaComments,
} from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight, FiChevronDown, FiEdit2, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi'
import Modal from '../../components/common/Modal'
import { useClickOutside } from '../../hooks'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import apiClient from '../../services/apiClient'
import { remarkApi } from '../../services/remarkApi'
import { customerService } from '../../services/customerService'
import { APP_NAME } from '../../utils/constants'
import { filterCommunicationActivitiesForUser } from '../../utils/communicationActivityAccess'
import { getAdminBookmarks, subscribeAdminBookmarks, toggleAdminBookmark } from '../../features/adminBookmarks/adminBookmarkStorage'
import {
  DASHBOARD_TAB_TEMPLATES,
  addDashboardTab,
  deleteDashboardTab,
  getDashboardTabs,
  moveDashboardTab,
  saveDashboardTabs,
  subscribeDashboardTabs,
  updateDashboardTab,
} from '../../features/adminDashboardTabs/dashboardTabStorage'
import { getWeeklyReportsAllBoardData } from '../../features/adminAccounts/selectors/getWeeklyReportsAllBoardData'
import { getSwBarodaMumBoardData } from '../../features/adminAccounts/selectors/getSwBarodaMumBoardData'
import { getAdminReminders } from '../../features/adminReminders/getAdminReminders'
import { closeAdminReminder, getAdminReminderStates, subscribeAdminReminderStates } from '../../features/adminReminders/reminderStorage'
import { buildMonthlyWonLostData, buildPerformanceSummary } from '../../features/adminDashboardTabs/dashboardInsights'
import { getStatusColor, formatDate } from '../../utils/helpers'
import './AdminPanel.css'
import AnalyticsSection from '../../components/dashboard/AnalyticsSection'

const QUICK_NAV = [
  { id: 'dash', dotColor: '#3498db', label: 'Start with Dashboard', route: '/admin/monitoring' },
  { id: 'work', dotColor: '#bdc3c7', label: 'Let me check with my work and status', route: '/admin/my-work-status' },
  { id: 'reports', dotColor: '#e67e22', label: 'Analyze and monitor custom reports', route: '/admin/reports/custom' },
  { id: 'admin', dotColor: '#27ae60', label: 'Take me to Administration', route: '/admin/settings' },
  { id: 'profile', dotColor: '#f1c40f', label: 'My User Profile', route: '/admin/user-management' },
]

const TAB_ICON = <FaDesktop />
const MY_CRM_ICON = <FaUsers />
const MY_CRM_VIEW_ROUTES = {
  accounts: '/admin/accounts',
  customers: '/admin/customers/my-customers',
  supportRequests: '/admin/support-requests/list',
  deals: '/admin/deals/view',
}
const WON_TAB_STATUSES = new Set(['won', 'closed won', 'converted'])
const LOST_TAB_STATUSES = new Set(['lost', 'closed lost', 'rejected'])

const normalizeDashboardStatus = (value) => (
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
)

const getDashboardDrilldownMonthKey = (value) => {
  const date = value ? new Date(value) : null
  if (!date || Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

const formatStatusLabel = (value, fallback = 'Pending') => {
  const normalized = String(value || '').trim()
  if (!normalized) return fallback

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

const formatTodoDateTime = (value) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const buildStatusSummary = (records, getValue, fallbackLabels = [], maxItems = 6) => {
  const counts = records.reduce((accumulator, record) => {
    const key = formatStatusLabel(getValue(record), '')
    if (!key) return accumulator
    accumulator[key] = (accumulator[key] || 0) + 1
    return accumulator
  }, {})

  const items = Object.entries(counts)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, maxItems)
    .map(([label, value]) => ({ label, value }))

  if (items.length > 0) return items

  return fallbackLabels.slice(0, maxItems).map((label) => ({ label, value: 0 }))
}

const buildEmptyTabDraft = () => ({
  name: '',
  viewKey: 'salesDashboard',
})

const buildDashboardBookmarkRoute = (tab) => `/admin/monitoring?view=${encodeURIComponent(tab.viewKey)}`

const resolveRequestedSection = (search, tabs) => {
  const params = new URLSearchParams(search)
  const requestedSection = params.get('section')

  if (requestedSection === 'home') {
    return 'home'
  }

  const requestedTabId = params.get('tabId')
  if (requestedTabId && tabs.some((tab) => tab.id === requestedTabId)) {
    return requestedTabId
  }

  const requestedView = params.get('view')
  if (requestedView) {
    const matchingTab = tabs.find((tab) => tab.viewKey === requestedView)
    if (matchingTab) {
      return matchingTab.id
    }
  }

  return 'home'
}

const DashboardTabModal = ({
  isOpen,
  title,
  submitLabel,
  draft,
  onDraftChange,
  onClose,
  onSubmit,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title={title}
    size="small"
    footer={(
      <>
        <button type="button" className="ap-modal-btn ap-modal-btn-secondary" onClick={onClose}>
          Cancel
        </button>
        <button type="button" className="ap-modal-btn ap-modal-btn-primary" onClick={onSubmit}>
          {submitLabel}
        </button>
      </>
    )}
  >
    <div className="ap-modal-form">
      <label className="ap-modal-field">
        <span>Tab Name</span>
        <input
          type="text"
          value={draft.name}
          onChange={(event) => onDraftChange((currentValue) => ({ ...currentValue, name: event.target.value }))}
          placeholder="Enter dashboard tab name"
        />
      </label>

      <label className="ap-modal-field">
        <span>Dashboard Type</span>
        <select
          value={draft.viewKey}
          onChange={(event) => onDraftChange((currentValue) => ({ ...currentValue, viewKey: event.target.value }))}
        >
          {DASHBOARD_TAB_TEMPLATES.map((template) => (
            <option key={template.value} value={template.value}>
              {template.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  </Modal>
)

const AdminPanel = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { accounts, deals, quotations = [], activities = [], supportRequests, tasks = [], reminders = [], refreshData, addNotification } = useData()
  const { user, socket } = useAuth()
  const [dashboardTabs, setDashboardTabs] = useState(() => getDashboardTabs())
  const [activeSection, setActiveSection] = useState('home')
  const [openMenuState, setOpenMenuState] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isManageModalOpen, setIsManageModalOpen] = useState(false)
  const [tabDraft, setTabDraft] = useState(buildEmptyTabDraft)
  const [editingTabId, setEditingTabId] = useState('')
  const [bookmarks, setBookmarks] = useState(() => getAdminBookmarks(user))
  const [selectedPerformanceMetric, setSelectedPerformanceMetric] = useState('won')
  const [collapsedMyCrmCards, setCollapsedMyCrmCards] = useState([])
  const [todoReplies, setTodoReplies] = useState([])
  const [communicationRemarks, setCommunicationRemarks] = useState([])
  const [activeTodoTab, setActiveTodoTab] = useState('all')
  const [todoFilter, setTodoFilter] = useState('all')
  const [reminderStatesById, setReminderStatesById] = useState(() => getAdminReminderStates())
  const menuRef = useClickOutside(() => setOpenMenuState(null))
  const customers = useMemo(() => customerService.getCustomers(), [])
  const isAdmin = user?.role === 'admin'

  const fetchTodoReplies = useCallback(async () => {
    try {
      const res = await apiClient.get('/support-requests/todo/replies')
      setTodoReplies(Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []))
    } catch (error) {
      console.error('Failed to fetch todo replies:', error)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    remarkApi.getAllRemarks({ limit: 10 }).then((res) => {
      if (isMounted && Array.isArray(res)) {
        setCommunicationRemarks(filterCommunicationActivitiesForUser(res, user).slice(0, 10))
      }
    }).catch(() => {})
    return () => { isMounted = false }
  }, [user])

  useEffect(() => {
    fetchTodoReplies()
  }, [fetchTodoReplies])
  useEffect(() => subscribeAdminReminderStates(setReminderStatesById), [])

  const weeklyData = useMemo(() => getWeeklyReportsAllBoardData(accounts), [accounts])
  const swBarodaData = useMemo(() => getSwBarodaMumBoardData(accounts), [accounts])
  const requestedSection = useMemo(() => (
    resolveRequestedSection(location.search, dashboardTabs)
  ), [dashboardTabs, location.search])

  useEffect(() => subscribeDashboardTabs(setDashboardTabs), [])
  useEffect(() => {
    setBookmarks(getAdminBookmarks(user))
    return subscribeAdminBookmarks(user, setBookmarks)
  }, [user])

  useEffect(() => {
    if (location.search) {
      setActiveSection(requestedSection)
      return
    }

    if (activeSection !== 'home' && !dashboardTabs.some((tab) => tab.id === activeSection)) {
      setActiveSection('home')
    }
  }, [activeSection, dashboardTabs, location.search, requestedSection])

  useEffect(() => {
    if (!socket) return undefined

    const handleRemoteTabs = (payload) => {
      if (!payload?.tabs) return
      setDashboardTabs(saveDashboardTabs(payload.tabs))
    }

    socket.on('dashboard-tabs:update', handleRemoteTabs)
    return () => socket.off('dashboard-tabs:update', handleRemoteTabs)
  }, [socket])

  useEffect(() => {
    if (!openMenuState) {
      return undefined
    }

    const closeMenu = () => setOpenMenuState(null)

    window.addEventListener('resize', closeMenu)
    window.addEventListener('scroll', closeMenu, true)

    return () => {
      window.removeEventListener('resize', closeMenu)
      window.removeEventListener('scroll', closeMenu, true)
    }
  }, [openMenuState])

  const syncTabs = useCallback((tabs) => {
    setDashboardTabs(tabs)
    if (socket) {
      socket.emit('dashboard-tabs:update', {
        tabs,
        userName: user?.name || '',
      })
    }
  }, [socket, user])

  const handleSelectTab = (tabId) => {
    if (location.search) {
      navigate('/admin/monitoring', { replace: true })
    }
    setActiveSection(tabId)
    setOpenMenuState(null)
  }

  const handleSelectHome = () => {
    if (location.search) {
      navigate('/admin/monitoring', { replace: true })
    }
    setActiveSection('home')
    setOpenMenuState(null)
  }

  const handleOpenAddModal = () => {
    setTabDraft(buildEmptyTabDraft())
    setIsAddModalOpen(true)
  }

  const handleCreateTab = () => {
    const trimmedName = tabDraft.name.trim()
    if (!trimmedName) return

    const nextTabs = addDashboardTab({
      name: trimmedName,
      viewKey: tabDraft.viewKey,
    }, user)
    syncTabs(nextTabs)
    setActiveSection(nextTabs[nextTabs.length - 1]?.id || 'home')
    setIsAddModalOpen(false)
  }

  const handleOpenManageModal = (tab) => {
    setEditingTabId(tab.id)
    setTabDraft({
      name: tab.name,
      viewKey: tab.viewKey,
    })
    setIsManageModalOpen(true)
    setOpenMenuState(null)
  }

  const handleManageTab = () => {
    const trimmedName = tabDraft.name.trim()
    if (!trimmedName || !editingTabId) return

    const nextTabs = updateDashboardTab(editingTabId, {
      name: trimmedName,
      viewKey: tabDraft.viewKey,
    })
    syncTabs(nextTabs)
    setIsManageModalOpen(false)
    setEditingTabId('')
  }

  const handleRenameTab = (tab) => {
    handleOpenManageModal(tab)
  }

  const handleMoveTab = (tabId, direction) => {
    const nextTabs = moveDashboardTab(tabId, direction)
    syncTabs(nextTabs)
    setOpenMenuState(null)
  }

  const handleDeleteTab = (tab) => {
    if (dashboardTabs.length <= 1) return
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Delete tab "${tab.name}"? This cannot be undone.`)
      : true
    if (!confirmed) {
      setOpenMenuState(null)
      return
    }
    const nextTabs = deleteDashboardTab(tab.id)
    syncTabs(nextTabs)
    if (activeSection === tab.id) {
      setActiveSection('home')
    }
    setOpenMenuState(null)
  }

  const handleToggleTabBookmark = (tab) => {
    const bookmark = {
      id: `bookmark-dashboard-${tab.id}`,
      label: tab.name,
      route: buildDashboardBookmarkRoute(tab),
      iconKey: tab.viewKey === 'myCrm' ? 'profile' : 'dashboard',
    }
    const alreadyBookmarked = bookmarks.some((entry) => entry.route === bookmark.route)

    setBookmarks(toggleAdminBookmark(user, bookmark))
    addNotification(
      'success',
      alreadyBookmarked ? 'Bookmark removed' : 'Bookmark saved',
      `${tab.name} ${alreadyBookmarked ? 'removed from' : 'added to'} bookmarks.`
    )
    setOpenMenuState(null)
  }

  const handleToggleTabMenu = (tab, event) => {
    const triggerElement = event?.currentTarget || null
    if (!triggerElement) {
      return
    }

    setOpenMenuState((currentValue) => {
      if (currentValue?.id === tab.id) {
        return null
      }

      const triggerRect = triggerElement.getBoundingClientRect()
      const viewportPadding = 12
      const popupWidth = 248
      const popupHeight = 296
      const clickX = typeof event?.clientX === 'number'
        ? event.clientX
        : triggerRect.left + (triggerRect.width / 2)
      const clickY = typeof event?.clientY === 'number'
        ? event.clientY
        : triggerRect.bottom
      const left = Math.min(
        Math.max(viewportPadding, clickX),
        window.innerWidth - popupWidth - viewportPadding
      )
      const spaceBelow = window.innerHeight - clickY
      const top = spaceBelow >= popupHeight + viewportPadding
        ? clickY
        : Math.max(viewportPadding, clickY - popupHeight)

      return {
        id: tab.id,
        left,
        top,
      }
    })
  }

  const handleDashboardMonthClick = (scopedDeals, entry, statusType = 'closed') => {
    const matchingDeals = scopedDeals.filter((deal) => {
      const monthKey = getDashboardDrilldownMonthKey(deal.closeDate || deal.updatedAt || deal.createdAt)
      if (monthKey !== entry.key) {
        return false
      }

      const normalizedStatus = normalizeDashboardStatus(deal.status)
      if (statusType === 'won') {
        return WON_TAB_STATUSES.has(normalizedStatus)
      }

      if (statusType === 'lost') {
        return LOST_TAB_STATUSES.has(normalizedStatus)
      }

      return WON_TAB_STATUSES.has(normalizedStatus) || LOST_TAB_STATUSES.has(normalizedStatus)
    })

    navigate('/admin/deals/view', {
      state: {
        dashboardDealDrilldown: {
          monthLabel: entry.label,
          statusType,
          sourceTabName: activeTab?.name || 'Sales Dashboard',
          dealIds: matchingDeals.map((deal) => deal.id),
        },
      },
    })
  }

  const myCrmCards = useMemo(() => ([]), [])

  const handleTodoReminderActive = useCallback((reminder, event) => {
    event?.stopPropagation()
    navigate('/admin/reminders/active', {
      state: {
        reminderId: reminder.id,
        selectedOwner: reminder.ownerName,
      },
    })
  }, [navigate])

  const handleTodoReminderClose = useCallback((reminder, event) => {
    event?.stopPropagation()
    const closedState = closeAdminReminder({
      sourceType: reminder.sourceType,
      sourceId: reminder.sourceId,
      userName: user?.name || user?.username || '',
    })
    setReminderStatesById((currentStates) => ({
      ...currentStates,
      [closedState.id]: closedState,
    }))
    navigate('/admin/reminders/closed', {
      replace: false,
      state: {
        reminderId: reminder.id,
        selectedOwner: reminder.ownerName,
      },
    })
  }, [navigate, user?.name, user?.username])

  const todoItems = useMemo(() => {
    const reminderItems = getAdminReminders({
      accounts,
      deals,
      supportRequests,
      user,
      variantKey: 'my',
      reminderStatesById,
      isAdmin,
    })
      .filter((reminder) => reminder.status === 'active')
      .slice(0, 8)
      .map((reminder) => ({
        id: `reminder-${reminder.id}`,
        type: 'Reminder',
        title: reminder.name || 'Reminder',
        meta: `${reminder.sourceLabel || 'Reminder'} | ${reminder.reminderDateDisplay || ''}`,
        message: reminder.note || reminder.reminderMode || '-',
        date: reminder.reminderDate,
        reminder,
        onClick: () => navigate('/admin/reminders/my', {
          state: {
            activeMyReminderTab: 'today',
            reminderId: reminder.id,
          },
        }),
      }))

    const dbReminderItems = (reminders || [])
      .filter((r) => String(r.status || '').toLowerCase() !== 'closed')
      .slice(0, 8)
      .map((r) => ({
        id: `db-reminder-${r.id || r._id}`,
        type: r.reminderMode ? `Reminder (${r.reminderMode.toUpperCase()})` : 'Reminder',
        title: r.title || r.note || r.message || 'Reminder',
        meta: r.reminderDate ? formatTodoDateTime(r.reminderDate) : 'Today',
        message: r.note || r.remark || r.description || '-',
        date: r.reminderDate || r.createdAt,
        reminder: r,
        onClick: () => navigate('/admin/reminders/my'),
      }))

    const replyItems = todoReplies.slice(0, 8).map((reply, index) => {
      const requestId = reply.support_request_id || reply.supportRequestId || reply.relatedEntityId || ''
      const matchedRequest = supportRequests.find((request) => (
        [request.id, request.mongoId, request._id, request.legacyId].some((value) => String(value || '') === String(requestId || ''))
      ))
      const targetRequestId = matchedRequest?.id || requestId
      return {
        id: `reply-${reply._id || reply.id || index}`,
        type: 'Reply',
        title: reply.sender_email || reply.senderEmail || 'Support Reply',
        meta: formatTodoDateTime(reply.created_at || reply.createdAt),
        message: reply.message || '-',
        date: reply.created_at || reply.createdAt,
        onClick: () => navigate('/admin/tickets', {
          state: {
            activeTab: 'replied',
            expandedTicketId: targetRequestId,
            supportRequestId: targetRequestId,
          },
        }),
      }
    })

    const taskItems = (tasks || [])
      .filter((task) => String(task.status || '').toLowerCase() === 'pending' || String(task.status || '').toLowerCase() === 'open')
      .slice(0, 8)
      .map((task) => ({
        id: `task-${task.id || task._id}`,
        type: task.activityType === 're-assign-account' ? 'Reassignment' : 'Task',
        title: task.title || task.name || 'Pending Task',
        meta: formatTodoDateTime(task.dueDate || task.createdAt),
        message: task.description || task.note || '-',
        date: task.dueDate || task.createdAt,
        task,
        onClick: () => navigate(isAdmin ? '/admin/accounts/my-accounts' : '/accounts/my-accounts'),
      }))

    return [...replyItems, ...reminderItems, ...dbReminderItems, ...taskItems]
      .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime())
      .slice(0, 8)
  }, [accounts, deals, isAdmin, navigate, reminderStatesById, reminders, supportRequests, tasks, todoReplies, user])

    const todoCounts = useMemo(() => {
    return {
      all: todoItems.length,
      reminder: todoItems.filter((i) => i.type?.toLowerCase().includes('reminder')).length,
      task: todoItems.filter((i) => i.type?.toLowerCase().includes('task') || i.type?.toLowerCase().includes('reassignment')).length,
      reply: todoItems.filter((i) => i.type?.toLowerCase().includes('reply')).length,
    }
  }, [todoItems])

  const displayedTodoItems = useMemo(() => {
    if (todoFilter === 'reminder') {
      return todoItems.filter((i) => i.type?.toLowerCase().includes('reminder'))
    }
    if (todoFilter === 'task') {
      return todoItems.filter((i) => i.type?.toLowerCase().includes('task') || i.type?.toLowerCase().includes('reassignment'))
    }
    if (todoFilter === 'reply') {
      return todoItems.filter((i) => i.type?.toLowerCase().includes('reply'))
    }
    return todoItems
  }, [todoFilter, todoItems])

  const handleMyCrmViewList = (card) => {
    addNotification('info', 'View list', `Opening ${card.title}.`)
    navigate(MY_CRM_VIEW_ROUTES[card.id] || '/admin/monitoring?view=myCrm')
  }

  const handleMyCrmRefresh = async (card) => {
    await refreshData()
    addNotification('success', 'Summary refreshed', `${card.title} was refreshed.`)
  }

  const handleToggleMyCrmCard = (card) => {
    const isCollapsed = collapsedMyCrmCards.includes(card.id)
    setCollapsedMyCrmCards((currentValue) => (
      isCollapsed
        ? currentValue.filter((entry) => entry !== card.id)
        : [...currentValue, card.id]
    ))
    addNotification(
      'info',
      isCollapsed ? 'Summary expanded' : 'Summary collapsed',
      `${card.title} ${isCollapsed ? 'expanded' : 'collapsed'}.`
    )
  }

  const upcomingTasks = useMemo(() => (
    [...(tasks || [])]
      .filter((t) => t.status === 'pending')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5)
  ), [tasks])

  const renderHomeContent = () => {
    const formattedNow = new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).toLowerCase()

    const liveUserActivity = {
      id: 'live-current-user',
      isLive: true,
      title: `${user?.name || 'Keval V Shah'} is online`,
      subtitle: user?.role === 'admin' || user?.actualRole === 'admin' ? 'Director • Active Session' : 'Workspace User • Active Session',
      time: formattedNow,
    }

    const displayedActivities = [liveUserActivity]

    return (
      <div className="ap-home-layout">
        {/* Top Greeting Block */}
        <div className="ap-welcome-row">
          <div className="ap-welcome-header-block">
            <span className="ap-welcome-subhead">Welcome,</span>
            <h1 className="ap-welcome-heading">{user?.name || 'Keval V Shah'}!</h1>
            <p className="ap-welcome-sub">Here&apos;s what&apos;s happening with your business today.</p>
          </div>

        </div>

        {/* 4 Equal Horizontal KPI Cards */}
        <div className="ap-kpi-grid">
          <div
            className="ap-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/accounts/my-accounts?stage=new&page=1')}
          >
            <div className="ap-kpi-icon-wrap ap-kpi-icon--red">
              <FaUsers />
            </div>
            <div className="ap-kpi-main">
              <div className="ap-kpi-val-row">
                <span className="ap-kpi-value">{accounts?.length || 14}</span>
                <span className="ap-kpi-trend ap-kpi-trend--up">↗ +12%</span>
              </div>
              <div className="ap-kpi-title">Accounts</div>
            </div>
            <svg className="ap-kpi-wave" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,25 Q30,10 60,20 T100,5 L100,30 L0,30 Z" fill="rgba(220, 38, 38, 0.08)" />
            </svg>
          </div>

          <div
            className="ap-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/customers/my-customers')}
          >
            <div className="ap-kpi-icon-wrap ap-kpi-icon--blue">
              <FaUser />
            </div>
            <div className="ap-kpi-main">
              <div className="ap-kpi-val-row">
                <span className="ap-kpi-value">{customers?.length || 0}</span>
                <span className="ap-kpi-trend ap-kpi-trend--neutral">0%</span>
              </div>
              <div className="ap-kpi-title">Customer</div>
            </div>
            <svg className="ap-kpi-wave" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,22 Q30,28 60,15 T100,10 L100,30 L0,30 Z" fill="rgba(2, 132, 199, 0.08)" />
            </svg>
          </div>

          <div
            className="ap-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/deals/view')}
          >
            <div className="ap-kpi-icon-wrap ap-kpi-icon--green">
              <FaHandshake />
            </div>
            <div className="ap-kpi-main">
              <div className="ap-kpi-val-row">
                <span className="ap-kpi-value">{deals?.length || 18}</span>
                <span className="ap-kpi-trend ap-kpi-trend--up">↗ +8%</span>
              </div>
              <div className="ap-kpi-title">Deal</div>
            </div>
            <svg className="ap-kpi-wave" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,28 Q30,15 60,22 T100,8 L100,30 L0,30 Z" fill="rgba(22, 163, 74, 0.08)" />
            </svg>
          </div>

          <div
            className="ap-kpi-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/quotation-manager/view')}
          >
            <div className="ap-kpi-icon-wrap ap-kpi-icon--orange">
              <FaFileAlt />
            </div>
            <div className="ap-kpi-main">
              <div className="ap-kpi-val-row">
                <span className="ap-kpi-value">{quotations.length}</span>
              </div>
              <div className="ap-kpi-title">Quotation Manager</div>
            </div>
            <svg className="ap-kpi-wave" viewBox="0 0 100 30" preserveAspectRatio="none">
              <path d="M0,20 Q30,25 60,12 T100,18 L100,30 L0,30 Z" fill="rgba(234, 88, 12, 0.08)" />
            </svg>
          </div>
        </div>

        {/* Expansive Full-Width To Do List Section */}
        <div className="ap-todo-full-container">
          <div className="ap-card-box ap-todo-card--expansive">
            <div className="ap-todo-header-expansive">
              <div className="ap-todo-header-left">
                <div className="ap-todo-header-icon-box">
                  <FaClipboardList />
                </div>
                <div>
                  <div className="ap-todo-title-row">
                    <h3 className="ap-todo-main-title">To Do List</h3>
                    <span className="ap-todo-count-badge">{todoCounts.all} items</span>
                  </div>
                  <p className="ap-todo-subtitle">Prioritized follow-ups, pending tasks, and support updates</p>
                </div>
              </div>

              <div className="ap-todo-filter-tabs">
                <button
                  type="button"
                  className={`ap-todo-tab ${todoFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTodoFilter('all')}
                >
                  All ({todoCounts.all})
                </button>
                <button
                  type="button"
                  className={`ap-todo-tab ${todoFilter === 'reminder' ? 'active' : ''}`}
                  onClick={() => setTodoFilter('reminder')}
                >
                  Reminders ({todoCounts.reminder})
                </button>
                <button
                  type="button"
                  className={`ap-todo-tab ${todoFilter === 'task' ? 'active' : ''}`}
                  onClick={() => setTodoFilter('task')}
                >
                  Tasks ({todoCounts.task})
                </button>
                <button
                  type="button"
                  className={`ap-todo-tab ${todoFilter === 'reply' ? 'active' : ''}`}
                  onClick={() => setTodoFilter('reply')}
                >
                  Replies ({todoCounts.reply})
                </button>
              </div>

              <div className="ap-todo-header-right">
                <button
                  type="button"
                  className="ap-link-btn"
                  onClick={() => navigate('/admin/reminders/my')}
                >
                  View All &rarr;
                </button>
                <button
                  type="button"
                  className="ap-btn-red"
                  onClick={() => navigate('/admin/tasks')}
                >
                  + Add Task
                </button>
              </div>
            </div>

            <div className="ap-todo-list--expansive">
              {displayedTodoItems.length > 0 ? (
                displayedTodoItems.map((item) => (
                  <div
                    key={item.id}
                    className={`ap-todo-row ap-todo-row--${item.type.toLowerCase().replace(/[^a-z]/g, '')}`}
                    onClick={item.onClick}
                  >
                    <button
                      type="button"
                      className={`ap-todo-icon-box ap-todo-icon-box--${item.type.toLowerCase().includes('reminder') ? 'reminder' : item.type.toLowerCase().includes('task') ? 'task' : 'reply'}`}
                      onClick={item.onClick}
                      aria-label={`Open ${item.type}`}
                      title={`Open ${item.type}`}
                    >
                      <FaCalendarAlt />
                    </button>
                    <div className="ap-todo-body">
                      <div className="ap-todo-meta-line">
                        <span className={`ap-todo-badge ap-todo-badge--${item.type.toLowerCase().includes('reminder') ? 'reminder' : item.type.toLowerCase().includes('task') ? 'task' : 'reply'}`}>
                          {item.type}
                        </span>
                        <span className="ap-todo-date">{item.meta}</span>
                      </div>
                      <div className="ap-todo-title-text">{item.title || item.message}</div>
                      {item.message && item.title && item.message !== item.title ? (
                        <div className="ap-todo-desc-text">{item.message}</div>
                      ) : null}
                    </div>
                    {item.reminder ? (
                      <div className="ap-todo-btn-group" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="ap-active-pill-btn"
                          onClick={(e) => handleTodoReminderActive(item.reminder, e)}
                        >
                          Active
                        </button>
                        <button
                          type="button"
                          className="ap-close-pill-btn"
                          onClick={(e) => handleTodoReminderClose(item.reminder, e)}
                        >
                          Close
                        </button>
                      </div>
                    ) : (
                      <div className="ap-todo-btn-group" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          className="ap-view-action-btn"
                          onClick={item.onClick}
                        >
                          Open &rarr;
                        </button>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="ap-todo-empty-state">
                  <FaClipboardList className="ap-todo-empty-icon" />
                  <p>No {todoFilter !== 'all' ? todoFilter : ''} to-do items found right now.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Integrations & Live Activity Row */}
        <div className="ap-side-widgets-row">
          {/* Integrations Card */}
          <div className="ap-card-box ap-integrations-card">
            <div className="ap-card-head">
              <div className="ap-card-head-title">
                <FaThLarge className="ap-card-head-icon" />
                <h3 className="text-base font-bold text-slate-800 m-0">Integrations</h3>
              </div>
              <button
                type="button"
                className="ap-link-btn"
                onClick={() => navigate('/admin/settings')}
              >
                Manage &rarr;
              </button>
            </div>
            <div className="ap-integrations-grid">
              <div className="ap-integration-box" onClick={() => navigate('/admin/settings')}>
                <div className="ap-integ-icon-box ap-integ-icon-box--blue">
                  <FaEnvelope />
                </div>
                <div className="ap-integ-info">
                  <div className="ap-integ-title">Outlook Mail</div>
                  <div className="ap-integ-subtext">Connect & sync emails...</div>
                </div>
                <FaArrowRight className="ap-integ-arrow" />
              </div>

              <div className="ap-integration-box" onClick={() => navigate('/admin/tickets')}>
                <div className="ap-integ-icon-box ap-integ-icon-box--red">
                  <FaHeadset />
                </div>
                <div className="ap-integ-info">
                  <div className="ap-integ-title">CRM Support</div>
                  <div className="ap-integ-subtext">Open help desk & tickets...</div>
                </div>
                <FaArrowRight className="ap-integ-arrow" />
              </div>
            </div>
          </div>

          {/* Live Activity Card */}
          <div className="ap-card-box ap-live-card">
            <div className="ap-card-head">
              <div className="ap-card-head-title">
                <span className="ap-live-pulse-dot" />
                <h3 className="text-base font-bold text-slate-800 m-0">Live Activity</h3>
              </div>
              <button
                type="button"
                className="ap-link-btn"
                onClick={() => navigate('/admin/team-view')}
              >
                Team View &rarr;
              </button>
            </div>
            <div className="ap-live-card-body">
              <div className="ap-live-user-pill">
                <div className="ap-live-user-left">
                  <span className="ap-live-status-chip">• LIVE</span>
                  <div className="ap-live-user-details">
                    <span className="ap-live-user-name">{user?.name || 'Keval V Shah'}</span>
                    <span className="ap-live-user-sub">{user?.role === 'admin' || user?.actualRole === 'admin' ? 'Director • Active Session' : 'Workspace User • Active Session'}</span>
                  </div>
                </div>
                <span className="ap-live-time-chip">{formattedNow}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Activity Summary Section */}
        <div className="ap-card-box ap-communication-summary-card" style={{ marginTop: '1.25rem', marginBottom: '1.25rem', padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #cbd5e1', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FaComments style={{ color: '#740a03', fontSize: '1.2rem' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>Communication Activity</h3>
            </div>
            <button
              type="button"
              className="ap-link-btn"
              onClick={() => navigate('/admin/communication-activities')}
              style={{ background: 'none', border: 'none', color: '#740a03', fontWeight: '600', cursor: 'pointer', fontSize: '0.875rem' }}
            >
              View All &rarr;
            </button>
          </div>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
            Track and monitor all recent call logs, general remarks, feedback, and interactive team discussion threads across Accounts and Deals.
          </p>
          {communicationRemarks.length === 0 ? (
            <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', color: '#94a3b8', fontSize: '0.875rem', textAlign: 'center' }}>
              No recent communication activities found.
            </div>
          ) : (
            <div className="ap-communication-list" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
              {communicationRemarks.slice(0, 5).map((rmk) => (
                <div
                  key={rmk.id || rmk._id}
                  style={{
                    padding: '0.625rem 0.875rem',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    borderLeft: '4px solid #740a03',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.25rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#740a03' }}>
                      {String(rmk.category || 'General').toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      {rmk.createdAt ? new Date(rmk.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1e293b', fontWeight: '500' }}>
                    {rmk.content || '-'}
                  </div>
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#64748b', marginTop: '0.125rem', flexWrap: 'wrap' }}>
                    <span><strong>Account/Deal:</strong> {rmk.accountName || rmk.dealName || `ID: ${rmk.accountId || rmk.dealId || '-'}`}</span>
                    <span><strong>By:</strong> {rmk.createdByName || 'User'} ({rmk.createdByEmail || rmk.accountOwnerEmail || '-'})</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <AnalyticsSection
          accounts={accounts}
          deals={deals}
          customers={customers}
          quotations={quotations}
          activities={activities}
        />
      </div>
    )
  }

  const renderSalesDashboard = () => {
    const { scope, entries, scopedDeals } = buildMonthlyWonLostData(
      deals,
      activeTab?.viewKey || 'salesDashboard',
      user,
    )
    const maxValue = Math.max(...entries.map((entry) => entry.won + entry.lost), 1)

    return (
      <div className="ap-dashboard-shell">
        <div className="ap-dashboard-card">
          <div className="ap-dashboard-card-header">
            <button
              type="button"
              className="ap-dashboard-card-title ap-dashboard-card-title-link"
              onClick={() => navigate('/admin/deals/view')}
              title="Open Sales Board"
            >
              Closed Won-Lost Deals
            </button>
          </div>
          <div className="ap-dashboard-card-body">
            <p className="ap-dashboard-subtitle">
              Last 12 months closed won and lost deal count for {scope.subtitleLabel} ({scopedDeals.length} deals)
            </p>
            <div className="ap-dashboard-chart">
              <div className="ap-dashboard-chart-grid">
                {[20, 15, 10, 5, 0].map((value) => (
                  <div key={value} className="ap-dashboard-grid-row">
                    <span>{value}</span>
                    <div />
                  </div>
                ))}
              </div>

              <div className="ap-dashboard-bars">
                {entries.map((entry) => {
                  const total = entry.won + entry.lost
                  const totalHeight = total === 0 ? 0 : (total / maxValue) * 240
                  const wonHeight = total === 0 ? 0 : (entry.won / total) * totalHeight
                  const lostHeight = totalHeight - wonHeight

                  return (
                    <div
                      key={entry.label}
                      className="ap-dashboard-bar-group ap-dashboard-bar-group--interactive"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleDashboardMonthClick(scopedDeals, entry, 'closed')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleDashboardMonthClick(scopedDeals, entry, 'closed')
                        }
                      }}
                      title={total > 0 ? `Open ${entry.label} closed deals` : `Open Sales Board for ${entry.label}`}
                    >
                      <div className="ap-dashboard-bar-stack" style={{ height: `${totalHeight}px` }}>
                        <button
                          type="button"
                          className="ap-dashboard-bar ap-dashboard-bar-won ap-dashboard-bar-button"
                          style={{ height: `${wonHeight}px` }}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDashboardMonthClick(scopedDeals, entry, 'won')
                          }}
                          aria-label={`Open ${entry.label} won deals`}
                        />
                        <button
                          type="button"
                          className="ap-dashboard-bar ap-dashboard-bar-lost ap-dashboard-bar-button"
                          style={{ height: `${lostHeight}px` }}
                          onClick={(event) => {
                            event.stopPropagation()
                            handleDashboardMonthClick(scopedDeals, entry, 'lost')
                          }}
                          aria-label={`Open ${entry.label} lost deals`}
                        />
                      </div>
                      <span>{entry.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const isWonDealLocal = (deal) => {
    const normalized = String(deal.status || '').trim().toLowerCase()
    return normalized === 'won' || normalized === 'closed won' || normalized === 'converted' || normalized === 'order received' || normalized === 'convert to po'
  }

  const isLostDealLocal = (deal) => {
    const normalized = String(deal.status || '').trim().toLowerCase()
    return normalized === 'lost' || normalized === 'closed lost' || normalized === 'rejected' || normalized === 'order lost'
  }

  const isOpenDealLocal = (deal) => {
    return !isWonDealLocal(deal) && !isLostDealLocal(deal)
  }

  const buildMonthlyPerformanceData = (summary, metricKey) => {
    const currentMonth = new Date()
    const monthEntries = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - (11 - index), 1)
      return {
        key: getDashboardDrilldownMonthKey(date),
        label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        value: 0,
      }
    })

    const monthLookup = monthEntries.reduce((lookup, entry) => {
      lookup[entry.key] = entry
      return lookup
    }, {})

    if (metricKey === 'won') {
      summary.scopedDeals.filter(isWonDealLocal).forEach((deal) => {
        const sourceDate = deal.closeDate || deal.updatedAt || deal.createdAt
        const parsedDate = sourceDate ? new Date(sourceDate) : null
        if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
          const monthEntry = monthLookup[getDashboardDrilldownMonthKey(parsedDate)]
          if (monthEntry) {
            monthEntry.value += 1
          }
        }
      })
    } else if (metricKey === 'open') {
      summary.scopedDeals.filter(isOpenDealLocal).forEach((deal) => {
        const sourceDate = deal.createdAt || deal.updatedAt
        const parsedDate = sourceDate ? new Date(sourceDate) : null
        if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
          const monthEntry = monthLookup[getDashboardDrilldownMonthKey(parsedDate)]
          if (monthEntry) {
            monthEntry.value += 1
          }
        }
      })
    } else if (metricKey === 'accounts') {
      summary.scopedAccounts.forEach((account) => {
        const sourceDate = account.createdAt || account.updatedAt
        const parsedDate = sourceDate ? new Date(sourceDate) : null
        if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
          const monthEntry = monthLookup[getDashboardDrilldownMonthKey(parsedDate)]
          if (monthEntry) {
            monthEntry.value += 1
          }
        }
      })
    } else if (metricKey === 'pipeline') {
      summary.scopedDeals.forEach((deal) => {
        const sourceDate = deal.createdAt || deal.updatedAt
        const parsedDate = sourceDate ? new Date(sourceDate) : null
        if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
          const monthEntry = monthLookup[getDashboardDrilldownMonthKey(parsedDate)]
          if (monthEntry) {
            monthEntry.value += Number(deal.value) || 0
          }
        }
      })
    }

    return monthEntries
  }

  const handlePerformanceBarClick = (summary, entry, metricKey) => {
    if (metricKey === 'won' || metricKey === 'open' || metricKey === 'pipeline') {
      const matchingDeals = summary.scopedDeals.filter((deal) => {
        const parsedDate = deal.closeDate || deal.updatedAt || deal.createdAt ? new Date(deal.closeDate || deal.updatedAt || deal.createdAt) : null
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) return false
        if (getDashboardDrilldownMonthKey(parsedDate) !== entry.key) return false

        if (metricKey === 'won') return isWonDealLocal(deal)
        if (metricKey === 'open') return isOpenDealLocal(deal)
        return true // For pipeline value
      })

      navigate('/admin/deals/view', {
        state: {
          dashboardDealDrilldown: {
            monthLabel: entry.label,
            statusType: metricKey === 'won' ? 'won' : metricKey === 'open' ? 'open' : 'all',
            sourceTabName: activeTab?.name || 'Sales Performance',
            dealIds: matchingDeals.map((deal) => deal.id),
          },
        },
      })
    } else if (metricKey === 'accounts') {
      const matchingAccounts = summary.scopedAccounts.filter((account) => {
        const parsedDate = account.createdAt || account.updatedAt ? new Date(account.createdAt || account.updatedAt) : null
        if (!parsedDate || Number.isNaN(parsedDate.getTime())) return false
        return getDashboardDrilldownMonthKey(parsedDate) === entry.key
      })

      navigate('/admin/accounts', {
        state: {
          dashboardAccountDrilldown: {
            monthLabel: entry.label,
            sourceTabName: activeTab?.name || 'Sales Performance',
            accountIds: matchingAccounts.map((acc) => acc.id),
          },
        },
      })
    }
  }

  const renderPerformanceGraph = () => {
    const summary = buildPerformanceSummary(accounts, deals, activeTab?.viewKey || 'salesDashboard', user)
    const monthEntries = buildMonthlyPerformanceData(summary, selectedPerformanceMetric)
    const maxValue = Math.max(...monthEntries.map((entry) => entry.value), 1)

    const gridValues = [
      maxValue,
      Math.round(maxValue * 0.75),
      Math.round(maxValue * 0.5),
      Math.round(maxValue * 0.25),
      0
    ]

    const getBarColor = (metric) => {
      switch (metric) {
        case 'won':
          return 'linear-gradient(180deg, #ffd875 0%, #e9b528 100%)' // Yellow/Gold like won deals
        case 'open':
          return 'linear-gradient(180deg, #5dade2 0%, #2980b9 100%)' // Blue for open
        case 'accounts':
          return 'linear-gradient(180deg, #af7ac5 0%, #7d3c98 100%)' // Purple for accounts
        case 'pipeline':
          return 'linear-gradient(180deg, #f8c471 0%, #d35400 100%)' // Orange/Amber for pipeline value
        default:
          return 'linear-gradient(180deg, #5dade2 0%, #2980b9 100%)'
      }
    }

    const formatGridValue = (value) => {
      if (selectedPerformanceMetric !== 'pipeline') return value
      if (value >= 10000000) return `Rs ${(value / 10000000).toFixed(1)} Cr`
      if (value >= 100000) return `Rs ${(value / 100000).toFixed(1)} L`
      if (value >= 1000) return `Rs ${(value / 1000).toFixed(1)} K`
      return `Rs ${value}`
    }

    return (
      <div className="ap-dashboard-shell">
        <div className="ap-dashboard-card">
          <div className="ap-dashboard-card-header ap-dashboard-card-header--performance" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <button
              type="button"
              className="ap-dashboard-card-title ap-dashboard-card-title-link"
              onClick={() => {
                if (selectedPerformanceMetric === 'accounts') {
                  navigate('/admin/accounts')
                } else {
                  navigate('/admin/deals/view')
                }
              }}
              title="Open CRM Board"
            >
              {summary.scope.title}
            </button>
            <div className="ap-dashboard-header-dropdown-wrap">
              <span className="ap-performance-select-label">Metric:</span>
              <select
                className="ap-performance-select"
                value={selectedPerformanceMetric}
                onChange={(e) => setSelectedPerformanceMetric(e.target.value)}
              >
                <option value="won">Won Deals</option>
                <option value="open">Open Deals</option>
                <option value="accounts">Active Accounts</option>
                <option value="pipeline">Pipeline Value</option>
              </select>
            </div>
          </div>
          <div className="ap-dashboard-card-body">
            <p className="ap-dashboard-subtitle">
              Last 12 months performance tracking for {summary.scope.subtitleLabel} (metric: {selectedPerformanceMetric})
            </p>
            <div className="ap-dashboard-chart">
              <div className="ap-dashboard-chart-grid">
                {gridValues.map((value, i) => (
                  <div key={i} className="ap-dashboard-grid-row">
                    <span>
                      {formatGridValue(value)}
                    </span>
                    <div />
                  </div>
                ))}
              </div>

              <div className="ap-dashboard-bars">
                {monthEntries.map((entry) => {
                  const val = entry.value
                  const totalHeight = val === 0 ? 0 : (val / maxValue) * 240

                  return (
                    <div
                      key={entry.label}
                      className="ap-dashboard-bar-group ap-dashboard-bar-group--interactive"
                      role="button"
                      tabIndex={0}
                      onClick={() => handlePerformanceBarClick(summary, entry, selectedPerformanceMetric)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handlePerformanceBarClick(summary, entry, selectedPerformanceMetric)
                        }
                      }}
                      title={val > 0 ? `Open details for ${entry.label}` : `No records for ${entry.label}`}
                    >
                      <div className="ap-dashboard-bar-stack" style={{ height: `${totalHeight}px` }}>
                        <div
                          className="ap-dashboard-bar"
                          style={{
                            height: `${totalHeight}px`,
                            width: '100%',
                            borderRadius: '16px 16px 0 0',
                            background: getBarColor(selectedPerformanceMetric)
                          }}
                        />
                      </div>
                      <span>{entry.label}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderMyCrmContent = () => (
    <div className="ap-dashboard-shell">
      <div className="ap-mycrm-layout">
        <div className="ap-dashboard-card ap-mycrm-profile-card">
          <div className="ap-dashboard-card-header">
            <span className="ap-dashboard-card-title">My Profile</span>
          </div>

          <div className="ap-mycrm-profile-content">
            <div className="ap-mycrm-profile-avatar">
              {(user?.name || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="ap-mycrm-profile-copy">
              <h2>{user?.name || 'Demo User'}</h2>
              <div className="ap-mycrm-profile-list">
                <div><strong>Login ID</strong><span>{user?.username || user?.email || 'Not available'}</span></div>
                <div><strong>E-Mail</strong><span>{user?.email || 'Not available'}</span></div>
                <div><strong>Type</strong><span>{formatStatusLabel(user?.role, 'User')}</span></div>
                <div><strong>Added</strong><span>{new Date().toLocaleString('en-IN')}</span></div>
              </div>
            </div>

            <div className="ap-mycrm-action-grid">
              <button type="button" className="ap-mycrm-action-btn" onClick={() => navigate('/admin/user-management')}>
                <FaAddressCard />
                <span>My Profile</span>
              </button>
              <button type="button" className="ap-mycrm-action-btn" onClick={() => navigate('/admin/accounts/my-accounts')}>
                <FaBriefcase />
                <span>My Accounts</span>
              </button>
              <button type="button" className="ap-mycrm-action-btn" onClick={() => navigate('/admin/customers/my-customers')}>
                <FaUsers />
                <span>My Customers</span>
              </button>
              <button type="button" className="ap-mycrm-action-btn" onClick={() => navigate('/admin/reminders/my')}>
                <FaBell />
                <span>My Reminders</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  const activeTab = dashboardTabs.find((tab) => tab.id === activeSection) || dashboardTabs[0]

  const renderActiveTabContent = () => {
    if (activeSection === 'home') return renderHomeContent()
    if (!activeTab) return renderHomeContent()

    switch (activeTab.viewKey) {
      case 'salesDashboard':
        return renderSalesDashboard()
      case 'salesPerformanceA':
      case 'salesPerformanceB':
        return renderPerformanceGraph()
      case 'myCrm':
        return renderMyCrmContent()
      default:
        if (activeTab.viewKey && activeTab.viewKey.startsWith('salesPerformance')) {
          return renderPerformanceGraph()
        }
        return renderSalesDashboard()
    }
  }

  const openMenuTab = dashboardTabs.find((tab) => tab.id === openMenuState?.id) || null
  const openMenuTabIndex = openMenuTab ? dashboardTabs.findIndex((tab) => tab.id === openMenuTab.id) : -1
  const openMenuCanMoveLeft = openMenuTabIndex > 0
  const openMenuCanMoveRight = openMenuTabIndex > -1 && openMenuTabIndex < dashboardTabs.length - 1
  const openMenuCanDelete = dashboardTabs.length > 1
  const openMenuIsBookmarked = openMenuTab
    ? bookmarks.some((entry) => entry.route === buildDashboardBookmarkRoute(openMenuTab))
    : false

  return (
    <div className="admin-panel">
      <div className="ap-tabbar">
        <button
          type="button"
          className={`ap-home-tab ${activeSection === 'home' ? 'ap-home-tab--active' : ''}`}
          onClick={handleSelectHome}
        >
          <FaHome />
          <span>Home</span>
        </button>

        <div className="ap-tabs">
          {dashboardTabs.map((tab) => {
            const isActive = activeSection === tab.id

            return (
              <div
                key={tab.id}
                className={`ap-tab-wrap ${isActive ? 'ap-tab-wrap--active' : ''}`}
              >
                <button
                  type="button"
                  className={`ap-tab ${isActive ? 'ap-tab--active' : ''}`}
                  onClick={() => handleSelectTab(tab.id)}
                >
                  <span className="ap-tab-icon">{tab.viewKey === 'myCrm' ? MY_CRM_ICON : TAB_ICON}</span>
                  <span>{tab.name}</span>
                </button>

                {isAdmin ? (
                  <button
                    type="button"
                    className={`ap-tab-caret ${isActive || openMenuState?.id === tab.id ? 'ap-tab-caret--active' : ''}`}
                    onClick={(event) => handleToggleTabMenu(tab, event)}
                    aria-label={`Open ${tab.name} tab menu`}
                    aria-haspopup="menu"
                    aria-expanded={openMenuState?.id === tab.id}
                  >
                    <FiChevronDown />
                  </button>
                ) : null}
              </div>
            )
          })}

          {isAdmin ? (
            <button
              type="button"
              className="ap-tab-add"
              title="Add New Monitoring Tab"
              onClick={handleOpenAddModal}
            >
              <FiPlus />
              <span>Add Tab</span>
            </button>
          ) : null}
        </div>
      </div>

      {isAdmin && openMenuTab && openMenuState ? createPortal(
        (
          <div
            ref={menuRef}
            className="ap-tab-menu"
            role="menu"
            style={{ left: `${openMenuState.left}px`, top: `${openMenuState.top}px` }}
          >
            <button type="button" role="menuitem" className="ap-tab-menu-item" onClick={() => handleRenameTab(openMenuTab)}>
              <FiEdit2 />
              <span>Rename Tab</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="ap-tab-menu-item"
              onClick={() => openMenuCanMoveLeft && handleMoveTab(openMenuTab.id, 'left')}
              disabled={!openMenuCanMoveLeft}
            >
              <FiArrowLeft />
              <span>Move Tab To Left</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="ap-tab-menu-item"
              onClick={() => openMenuCanMoveRight && handleMoveTab(openMenuTab.id, 'right')}
              disabled={!openMenuCanMoveRight}
            >
              <FiArrowRight />
              <span>Move Tab To Right</span>
            </button>
            <button type="button" role="menuitem" className="ap-tab-menu-item ap-tab-menu-item-manage" onClick={() => handleOpenManageModal(openMenuTab)}>
              <FiSettings />
              <span>Manage</span>
            </button>
            <button type="button" role="menuitem" className="ap-tab-menu-item" onClick={() => handleToggleTabBookmark(openMenuTab)}>
              <FaStar className={openMenuIsBookmarked ? 'ap-tab-menu-icon-bookmark-active' : ''} />
              <span>{openMenuIsBookmarked ? 'Remove Bookmark' : 'Bookmark Tab'}</span>
            </button>
            <button
              type="button"
              role="menuitem"
              className="ap-tab-menu-item ap-tab-menu-item-delete"
              onClick={() => handleDeleteTab(openMenuTab)}
              disabled={!openMenuCanDelete}
            >
              <FiTrash2 />
              <span>Delete Tab</span>
            </button>
          </div>
        ),
        document.body
      ) : null}

      {renderActiveTabContent()}

      <DashboardTabModal
        isOpen={isAddModalOpen}
        title="Add Dashboard Tab"
        submitLabel="Add Tab"
        draft={tabDraft}
        onDraftChange={setTabDraft}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleCreateTab}
      />

      <DashboardTabModal
        isOpen={isManageModalOpen}
        title="Manage Dashboard Tab"
        submitLabel="Save Changes"
        draft={tabDraft}
        onDraftChange={setTabDraft}
        onClose={() => {
          setIsManageModalOpen(false)
          setEditingTabId('')
        }}
        onSubmit={handleManageTab}
      />
    </div>
  )
}

export default AdminPanel


