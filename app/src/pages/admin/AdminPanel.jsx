import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaAddressCard,
  FaBell,
  FaBriefcase,
  FaDesktop,
  FaFilter,
  FaHome,
  FaStar,
  FaSyncAlt,
  FaTable,
  FaUsers,
} from 'react-icons/fa'
import { FiArrowLeft, FiArrowRight, FiChevronDown, FiEdit2, FiPlus, FiSettings, FiTrash2 } from 'react-icons/fi'
import Modal from '../../components/common/Modal'
import { useClickOutside } from '../../hooks'
import { useData } from '../../context/DataContext'
import { useAuth } from '../../context/AuthContext'
import { customerService } from '../../services/customerService'
import { APP_NAME } from '../../utils/constants'
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
import { buildMonthlyWonLostData, buildPerformanceSummary } from '../../features/adminDashboardTabs/dashboardInsights'
import './AdminPanel.css'

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
  const { accounts, deals, supportRequests, refreshData, addNotification } = useData()
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
  const menuRef = useClickOutside(() => setOpenMenuState(null))
  const customers = useMemo(() => customerService.getCustomers(), [])
  const isAdmin = user?.role === 'admin'

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

  const myCrmCards = useMemo(() => ([
    {
      id: 'accounts',
      title: 'Accounts With No Follow-Ups',
      total: accounts.length,
      items: buildStatusSummary(
        accounts,
        (account) => account.stage || account.status || account.accountStatus,
        ['New', 'Follow Up', 'Quotation Sent', 'Order Received', 'Converted', 'Rejected']
      ),
    },
    {
      id: 'customers',
      title: 'Customers With No Follow-Ups',
      total: customers.length,
      items: buildStatusSummary(
        customers,
        (customer) => customer.customerStatus || customer.status,
        ['New', 'Active', 'Future Prospect', 'Converted', 'Rejected', 'Old']
      ),
    },
    {
      id: 'supportRequests',
      title: 'Support Requests With No Follow-Ups',
      total: supportRequests.length,
      items: buildStatusSummary(
        supportRequests,
        (supportRequest) => supportRequest.status,
        ['Active', 'In Progress', 'On Site', 'Attending', 'On Hold', 'Postponed']
      ),
    },
    {
      id: 'deals',
      title: 'Deals With No Follow-Ups',
      total: deals.length,
      items: buildStatusSummary(
        deals,
        (deal) => deal.status,
        ['New', 'Quotation Sent', 'Quotation Revision', 'Order Received', 'Convert To PO', 'Order Lost']
      ),
    },
  ]), [accounts, customers, deals, supportRequests])

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

  const renderHomeContent = () => (
    <div className="ap-body">
      <div className="ap-left-col">
        <div className="ap-welcome-block">
          <h2 className="ap-welcome-heading">Welcome, {user?.name || 'Demo User'}!</h2>
          <p className="ap-welcome-sub">How do you want to start with {APP_NAME} today..</p>

          <ul className="ap-quick-nav">
            {QUICK_NAV.map((item) => (
              <li
                key={item.id}
                className="ap-quick-item"
                onClick={() => navigate(item.route)}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => event.key === 'Enter' && navigate(item.route)}
              >
                <span className="ap-quick-dot" style={{ borderColor: item.dotColor }} />
                <span className="ap-quick-label">{item.label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="ap-stat-cards">
          <div
            className="ap-stat-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/accounts/weekly-reports-all')}
            onKeyDown={(event) => event.key === 'Enter' && navigate('/admin/accounts/weekly-reports-all')}
          >
            <div className="ap-stat-count">{weeklyData.totalRecords}</div>
            <div className="ap-stat-label">
              <FaUsers className="ap-stat-icon" />
              <span>Weekly reports-ALL</span>
            </div>
          </div>

          <div
            className="ap-stat-card"
            role="button"
            tabIndex={0}
            onClick={() => navigate('/admin/accounts/sw-baroda-mum')}
            onKeyDown={(event) => event.key === 'Enter' && navigate('/admin/accounts/sw-baroda-mum')}
          >
            <div className="ap-stat-count">{swBarodaData.totalRecords}</div>
            <div className="ap-stat-label">
              <FaUsers className="ap-stat-icon" />
              <span>SW-Baroda / Mum</span>
            </div>
          </div>
        </div>
      </div>

      <div className="ap-todo-panel">
        <div className="ap-todo-header">
          <span className="ap-todo-title">&#9776; To Do List</span>
          <div className="ap-todo-actions">
            <button className="ap-todo-btn" title="Refresh"><FaSyncAlt /></button>
            <button className="ap-todo-btn ap-todo-btn--green" title="Filter"><FaFilter /></button>
          </div>
        </div>
        <div className="ap-todo-empty">No reminders available</div>
      </div>
    </div>
  )

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

          <div className="ap-mycrm-profile-body">
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

        <div className="ap-mycrm-summary-panel">
          {myCrmCards.map((card) => {
            const isCollapsed = collapsedMyCrmCards.includes(card.id)

            return (
              <section key={card.id} className="ap-mycrm-summary-card">
                <div className="ap-mycrm-summary-header">
                  <div>
                    <span className="ap-mycrm-summary-title">{card.title}: {card.total}</span>
                  </div>
                  <div className="ap-mycrm-summary-actions">
                    <button type="button" className="ap-mycrm-summary-btn ap-mycrm-summary-btn-green" title="View list" onClick={() => handleMyCrmViewList(card)}>
                      <FaTable />
                    </button>
                    <button type="button" className="ap-mycrm-summary-btn ap-mycrm-summary-btn-orange" title="Refresh" onClick={() => handleMyCrmRefresh(card)}>
                      <FaSyncAlt />
                    </button>
                    <button type="button" className="ap-mycrm-summary-btn ap-mycrm-summary-btn-dark" title="Expand or collapse" onClick={() => handleToggleMyCrmCard(card)}>
                      <FiChevronDown className={isCollapsed ? '' : 'ap-mycrm-summary-chevron-open'} />
                    </button>
                  </div>
                </div>

                {!isCollapsed ? (
                  <div className="ap-mycrm-summary-body">
                    <div className="ap-mycrm-summary-stats">
                      {card.items.map((item) => (
                        <div key={`${card.id}-${item.label}`} className="ap-mycrm-summary-stat">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            )
          })}
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
          {dashboardTabs.map((tab, index) => {
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
            <button type="button" className="ap-tab-add" title="Add tab" onClick={handleOpenAddModal}>
              <FiPlus />
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
