import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaBell,
  FaBriefcase,
  FaCog,
  FaCreditCard,
  FaDesktop,
  FaEnvelope,
  FaHandsHelping,
  FaImages,
  FaMapMarkerAlt,
  FaPlus,
  FaSearch,
  FaSignOutAlt,
  FaStar,
  FaMoon,
  FaSun,
  FaTh,
  FaThumbsUp,
  FaUserCircle,
  FaUserCog,
  FaUsers,
  FaTasks,
} from 'react-icons/fa'
import { FiBell, FiChevronDown } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useTheme } from '../../context/ThemeContext'
import { getAdminReminders } from '../../features/adminReminders/getAdminReminders'
import { getAdminReminderStates, subscribeAdminReminderStates } from '../../features/adminReminders/reminderStorage'
import { getAdminBookmarks, saveAdminBookmarks, subscribeAdminBookmarks } from '../../features/adminBookmarks/adminBookmarkStorage'
import { buildAdminAccountDrawerUrl } from '../../features/adminAccounts/utils/accountNavigation'
import { buildAdminDealDetailUrl } from '../../features/adminDeals/config/adminDealViews'
import { customerService } from '../../services/customerService'
import { matchesSectionSearch, normalizeSectionSearchValue } from '../../utils/sectionSearch'
import { APP_NAME, getDashboardRoute } from '../../utils/constants'
import swatiLogo from '../../assets/swati-logo.png'
import AdminMessagesModal from './AdminMessagesModal'
import AddReminderModal from '../common/AddReminderModal'
import AddTaskModal from '../common/AddTaskModal'
import { buildShellRouteLabel, formatCompactValue } from './shellMeta'
import './Header.css'

const ADMIN_USER_MENU = [
  { label: 'Dashboard', icon: FaDesktop, route: '/admin/monitoring' },
  { label: 'Sales Dashboard', icon: FaDesktop, route: '/admin/sales-dashboard' },
  { label: 'My Profile', icon: FaUserCircle, route: '/admin/user-management' },
  { label: 'LaunchPad', icon: FaTh, route: '/admin/launchpad' },
  { label: 'Settings', icon: FaCog, route: '/admin/settings' },
  { label: 'Quotation Summary', icon: FaCreditCard, route: '/admin/reports/quotation-summary' },
  { label: 'Connect Outlook', icon: FaEnvelope, action: 'CONNECT_OUTLOOK' },
]

const LAUNCHPAD_ALLOWED_EMAILS = new Set([
  'keval@swatiswitchgears.com',
  'keval@swatiswithgears.com',
  'rushabh@support.com',
  'parth@support.com',
])

const STANDARD_USER_MENU = [
  { label: 'Dashboard', icon: FaDesktop, route: '/dashboard' },
  { label: 'Accounts', icon: FaBriefcase, route: '/accounts' },
  { label: 'Deals', icon: FaThumbsUp, route: '/deals' },
  { label: 'Custom Reports', icon: FaUserCog, route: '/reports/custom' },
  { label: 'Connect Outlook', icon: FaEnvelope, action: 'CONNECT_OUTLOOK' },
]

const ADD_REMINDER_ACTION = '__add_reminder__'
const ADD_TASK_ACTION = '__add_task__'

const ADMIN_QUICK_ADD_ITEMS = [
  { label: 'Add Account', icon: FaBriefcase, route: '/admin/accounts/new' },

  { label: 'Add Deal', icon: FaThumbsUp, route: '/admin/deals/add' },
  { label: 'Add Support Request', icon: FaHandsHelping, route: '/admin/support-requests/add' },
  { label: 'Add Reminder', icon: FiBell, action: ADD_REMINDER_ACTION },
  { label: 'Add Task', icon: FaTasks, action: ADD_TASK_ACTION },
  { label: 'Image Gallery', icon: FaImages, route: '/admin/data-manager/image-gallery' },
]

const STANDARD_QUICK_ADD_ITEMS = [
  { label: 'Add Account', icon: FaBriefcase, route: '/accounts/new' },

  { label: 'Add Support Request', icon: FaHandsHelping, route: '/support-requests/add' },
  { label: 'Add Reminder', icon: FiBell, action: ADD_REMINDER_ACTION },
  { label: 'Add Task', icon: FaTasks, action: ADD_TASK_ACTION },
  { label: 'Image Gallery', icon: FaImages, route: '/image-gallery' },
]

const Header = ({ isAdmin = false, isSidebarOpen = false, onToggleSidebar }) => {
  const { user } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const {
    accounts,
    deals,
    supportRequests,
    quotations,
    tasks,
    reminders: mongoReminders,
    messages,
    addNotification,
  } = useData()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [reminderPanelOpen, setReminderPanelOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [searchPanelOpen, setSearchPanelOpen] = useState(false)
  const [messagePanelOpen, setMessagePanelOpen] = useState(false)
  const [messageModalOpen, setMessageModalOpen] = useState(false)
  const [addReminderOpen, setAddReminderOpen] = useState(false)
  const [addTaskOpen, setAddTaskOpen] = useState(false)
  const [showCenteredLogo, setShowCenteredLogo] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [reminderStatesById, setReminderStatesById] = useState(() => getAdminReminderStates())
  const [bookmarks, setBookmarks] = useState(() => getAdminBookmarks(user))
  const menuWrapRef = useRef(null)
  const reminderWrapRef = useRef(null)
  const quickAddWrapRef = useRef(null)
  const searchWrapRef = useRef(null)
  const messageWrapRef = useRef(null)

  const displayName = user?.name || 'Demo User'
  const firstName = displayName.split(' ')[0]
  const quickAddItems = isAdmin ? ADMIN_QUICK_ADD_ITEMS : STANDARD_QUICK_ADD_ITEMS
  const canUseLaunchpad = LAUNCHPAD_ALLOWED_EMAILS.has(String(user?.email || '').trim().toLowerCase())
  const dropdownItems = isAdmin
    ? ADMIN_USER_MENU.filter((item) => item.route !== '/admin/launchpad' || canUseLaunchpad)
    : STANDARD_USER_MENU
  const profileRoute = '/admin/user-management'
  const salesDashboardRoute = '/admin/sales-dashboard'
  const legacySalesDashboardRoute = '/admin/monitoring?view=salesDashboard'
  const myCrmRoute = '/admin/monitoring?view=myCrm'

  const searchSections = useMemo(() => {
    const query = normalizeSectionSearchValue(searchTerm)
    if (!query) return []

    const customers = customerService.getCustomers()
    const makeResult = (section, record, title, subtitle, route) => ({
      id: `${section}-${record?.id || record?._id || title}`,
      section,
      title: title || 'Untitled record',
      subtitle: subtitle || '',
      route,
    })

    const accountResults = (accounts || [])
      .filter((account) => matchesSectionSearch(account, [
        'accountNumber', 'accountName', 'projectName', 'accountOwner', 'accountDate',
        'accountCategory', 'accountStatus', 'accountState', 'phone', 'email',
        'contactPerson', 'poValue', 'jobNo',
      ], query))
      .map((account) => makeResult(
        'Accounts',
        account,
        account.accountName || account.name || account.customerName || account.accountNumber,
        account.projectName || account.accountOwner || account.email || '',
        buildAdminAccountDrawerUrl(new URLSearchParams(), account.id || account._id),
      ))

    const dealResults = (deals || [])
      .filter((deal) => matchesSectionSearch(deal, [
        'dealNumber', 'dealName', 'dealDate', 'dealOwner', 'dealType', 'dealStatus',
        'projectName', 'dealValue', 'convertToPo', 'poValue', 'jobNo', 'lostOrderReason',
      ], query))
      .map((deal) => makeResult(
        'Deals',
        deal,
        deal.dealNumber || deal.name || deal.dealName,
        deal.name || deal.projectName || deal.dealOwner || deal.status || '',
        isAdmin
          ? buildAdminDealDetailUrl(deal.id || deal._id)
          : `/deals/view/${encodeURIComponent(deal.id || deal._id)}`,
      ))

    const customerResults = (customers || [])
      .filter((customer) => matchesSectionSearch(customer, [
        'customerNumber', 'customerName', 'email', 'phone', 'addedDate', 'customerOwner',
        'customerCategory', 'customerStatus', 'customerType', 'latestRemark',
      ], query))
      .map((customer) => makeResult(
        'Customers',
        customer,
        customer.customerName || customer.name || customer.customerNumber,
        customer.customerNumber || customer.email || customer.phone || '',
        `${isAdmin ? '/admin' : ''}/customers/view/${encodeURIComponent(customer.id || customer._id)}`,
      ))

    const quotationResults = (quotations || [])
      .filter((quotation) => matchesSectionSearch(quotation, [
        'quotationNumber', 'quotationOwner', 'quotationDate', 'companyName', 'amount', 'status', 'projectName',
      ], query))
      .map((quotation) => makeResult(
        'Quotations',
        quotation,
        quotation.quotationNumber || quotation.quoteNumber || quotation.id,
        quotation.companyName || quotation.projectName || quotation.status || '',
        `${isAdmin ? '/admin/quotation-manager/view' : '/quotations'}?view=${encodeURIComponent(quotation.id || quotation._id)}`,
      ))

    const supportResults = (supportRequests || [])
      .filter((request) => matchesSectionSearch(request, [
        'srNumber', 'customerName', 'requestType', 'serviceDate', 'ownerName', 'status', 'lastUpdated',
      ], query))
      .map((request) => makeResult(
        'Support Requests',
        request,
        request.srNumber || request.id,
        request.customerName || request.requestType || request.status || '',
        `${isAdmin ? '/admin' : ''}/support-requests/details/${encodeURIComponent(request.id || request._id)}`,
      ))

    return [
      { label: 'Accounts', results: accountResults },
      { label: 'Deals', results: dealResults },
      { label: 'Customers', results: customerResults },
      { label: 'Quotations', results: quotationResults },
      { label: 'Support Requests', results: supportResults },
    ]
  }, [accounts, deals, isAdmin, quotations, searchTerm, supportRequests])

  const totalSearchResults = searchSections.reduce((total, section) => total + section.results.length, 0)

  useEffect(() => subscribeAdminReminderStates(setReminderStatesById), [])
  useEffect(() => {
    setBookmarks(getAdminBookmarks(user))
    return subscribeAdminBookmarks(user, setBookmarks)
  }, [user])

  const closeHeaderPanels = () => {
    setReminderPanelOpen(false)
    setQuickAddOpen(false)
    setSearchPanelOpen(false)
    setMessagePanelOpen(false)
  }

  const reminderCount = useMemo(() => {
    const legacyReminders = getAdminReminders({
      accounts,
      deals,
      user,
      variantKey: 'my',
      reminderStatesById,
    })

    const legacyReminderCount = legacyReminders.filter((reminder) => reminder.status === 'active').length
    const mongoReminderCount = (mongoReminders || []).filter((reminder) => {
      if (reminder.status === 'closed') return false
      if (isAdmin) return true
      return String(reminder.assignedTo || reminder.createdBy || '') === String(user?.id || '')
    }).length

    return legacyReminderCount + mongoReminderCount
  }, [accounts, deals, isAdmin, mongoReminders, reminderStatesById, user])

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(event.target)) {
        setMenuOpen(false)
      }

      if (reminderWrapRef.current && !reminderWrapRef.current.contains(event.target)) {
        setReminderPanelOpen(false)
      }

      if (quickAddWrapRef.current && !quickAddWrapRef.current.contains(event.target)) {
        setQuickAddOpen(false)
      }

      if (searchWrapRef.current && !searchWrapRef.current.contains(event.target)) {
        setSearchPanelOpen(false)
      }

      if (messageWrapRef.current && !messageWrapRef.current.contains(event.target)) {
        setMessagePanelOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  const handleMenuNav = async (route, action) => {
    if (action === 'CONNECT_OUTLOOK') {
      setMenuOpen(false)
      closeHeaderPanels()
      navigate(isAdmin ? '/admin/settings' : '/settings')
      return
    }

    navigate(route)
    setMenuOpen(false)
    closeHeaderPanels()
  }

  const handleLogout = () => {
    setMenuOpen(false)
    closeHeaderPanels()
    navigate('/logout')
  }

  const handleOpenReminderPanel = () => {
    closeHeaderPanels()
    navigate(isAdmin ? '/admin/reminders/my' : '/reminders/my', {
      state: { activeMyReminderTab: 'notifications' },
    })
  }

  const handleOpenQuickAdd = () => {
    setMenuOpen(false)
    setReminderPanelOpen(false)
    setSearchPanelOpen(false)
    setMessagePanelOpen(false)
    setQuickAddOpen((previous) => !previous)
  }

  const handleOpenSearchPanel = () => {
    setMenuOpen(false)
    setReminderPanelOpen(false)
    setQuickAddOpen(false)
    setMessagePanelOpen(false)
    setSearchPanelOpen((previous) => !previous)
  }

  const getSectionSearchRoute = () => {
    const path = location.pathname
    const prefix = isAdmin ? '/admin' : ''

    if (path.includes('/accounts')) return path
    if (path.includes('/customers')) return path.includes('/search') ? path : `${prefix}/customers/search`
    if (path.includes('/deals')) return path.includes('/view') || path.includes('/search') ? path : `${prefix}/deals/view`
    if (path.includes('/quotations')) return `${prefix}/quotations`
    if (path.includes('/support-requests')) return path.includes('/list') ? path : `${prefix}/support-requests/list`

    return isAdmin ? '/admin/search' : '/search'
  }

  const handleOpenMessagePanel = () => {
    setMenuOpen(false)
    setReminderPanelOpen(false)
    setQuickAddOpen(false)
    setSearchPanelOpen(false)
    setMessagePanelOpen((previous) => !previous)
  }

  const handleOpenRemindersPage = () => {
    closeHeaderPanels()
    navigate(isAdmin ? '/admin/reminders/my' : '/reminders')
  }

  const handleQuickAddNavigate = (item) => {
    closeHeaderPanels()
    setQuickAddOpen(false)
    if (item.action === ADD_REMINDER_ACTION) {
      setAddReminderOpen(true)
      return
    }
    if (item.action === ADD_TASK_ACTION) {
      setAddTaskOpen(true)
      return
    }
    navigate(item.route)
  }

  const handleOpenAdvancedSearch = () => {
    const trimmedSearchTerm = searchTerm.trim()
    closeHeaderPanels()
    const route = getSectionSearchRoute()
    const separator = route.includes('?') ? '&' : '?'
    navigate(trimmedSearchTerm ? `${route}${separator}query=${encodeURIComponent(trimmedSearchTerm)}` : route)
  }

  const handleQuickSearch = () => {
    handleOpenAdvancedSearch()
  }

  const handleOpenSearchResult = (result) => {
    closeHeaderPanels()
    navigate(result.route, {
      state: {
        fromSearch: true,
        searchQuery: searchTerm,
      },
    })
  }

  const handleOpenSendMessage = () => {
    setMessagePanelOpen(false)
    setMessageModalOpen(true)
  }

  const handleBrandNavigate = () => {
    closeHeaderPanels()
    setMenuOpen(false)
    navigate(getDashboardRoute(isAdmin ? 'admin' : 'user'))
  }

  const handleBackNavigation = () => {
    closeHeaderPanels()
    setMenuOpen(false)

    if (window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(getDashboardRoute(isAdmin ? 'admin' : 'user'))
  }

  const handleViewPastMessages = () => {
    setMessagePanelOpen(false)
    navigate(isAdmin ? '/admin/messages' : '/messages')
  }

  const routeLabel = useMemo(
    () => buildShellRouteLabel(location.pathname, isAdmin),
    [isAdmin, location.pathname]
  )

  const todayLabel = useMemo(() => (
    new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date())
  ), [])

  const signals = isAdmin
    ? [
      { label: 'Accounts', value: formatCompactValue(accounts.length) },
      { label: 'Deals', value: formatCompactValue(deals.length) },
      { label: 'Support', value: formatCompactValue(supportRequests.length) },
    ]
    : [
      { label: 'Tasks', value: formatCompactValue(tasks.length) },
      { label: 'Deals', value: formatCompactValue(deals.length) },
      { label: 'Messages', value: formatCompactValue(messages.length) },
    ]

  return (
    <>
      <header className={`header ${isAdmin ? 'header--admin' : 'header--user header--admin'}`}>
        <div className="header-panel header-panel--brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={swatiLogo} alt="Swati Logo" className="hdr-brand-logo" style={{ width: '60px', height: '60px' }} />
          <div className="hdr-brand-text" style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="hdr-brand-title" style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-primary)', lineHeight: '1.2' }}>SWATI CRM</span>
            <span className="hdr-brand-subtitle" style={{ fontSize: '0.6rem', color: '#c60016', letterSpacing: '0.1em', fontWeight: '700' }}>POWERING A BRIGHTER TOMORROW</span>
          </div>
        </div>
        <div className="header-panel header-panel--actions">
          <div className="header-action-cluster">
            <div className="header-panel header-panel--center" ref={searchWrapRef}>
              <div className="hdr-search-pill-bar">
                <FaSearch className="hdr-search-pill-icon" />
                <input
                  type="text"
                  className="hdr-search-pill-input"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    if (!searchPanelOpen) setSearchPanelOpen(true)
                  }}
                  onFocus={() => setSearchPanelOpen(true)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleQuickSearch()
                  }}
                  placeholder="Search accounts, deals, customers..."
                />
              </div>

              {searchPanelOpen && searchTerm.trim() ? (
                <div className="hdr-popover-panel hdr-search-panel">
                  <div className="hdr-search-results" aria-live="polite">
                    <div className="hdr-search-results-summary">
                      Search Results <span>{totalSearchResults}</span>
                    </div>

                    {searchSections.map((section) => (
                      <section key={section.label} className="hdr-search-results-section">
                        <div className="hdr-search-results-heading">
                          <span>{section.label}</span>
                          <strong>{section.results.length}</strong>
                        </div>

                        {section.results.slice(0, 5).map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            className="hdr-search-result"
                            onClick={() => handleOpenSearchResult(result)}
                          >
                            <span className="hdr-search-result-title">{result.title}</span>
                            {result.subtitle ? <span className="hdr-search-result-meta">{result.subtitle}</span> : null}
                          </button>
                        ))}
                      </section>
                    ))}

                    {totalSearchResults === 0 ? (
                      <p className="hdr-search-results-empty">No matching records found.</p>
                    ) : null}
                  </div>

                  <button
                    type="button"
                    className="hdr-popover-link-btn hdr-popover-link-btn--center"
                    onClick={handleOpenAdvancedSearch}
                  >
                    Advanced Search <span>&raquo;</span>
                  </button>
                </div>
              ) : null}
            </div>

            <div className="hdr-message-wrap" ref={reminderWrapRef}>
              <button
                className={`hdr-icon-btn hdr-icon-btn--circle ${isAdmin ? 'hdr-icon-btn--admin-alert' : ''}`}
                title="Reminders"
                onClick={handleOpenReminderPanel}
              >
                <span className="hdr-badge hdr-badge--red">{reminderCount}</span>
                <FaBell />
              </button>

              {isAdmin && reminderPanelOpen && (
                <div className="hdr-popover-panel hdr-reminder-panel">
                  <button
                    type="button"
                    className="hdr-popover-link-btn hdr-popover-link-btn--center"
                    onClick={handleOpenRemindersPage}
                  >
                    View All Reminders <span>&raquo;</span>
                  </button>
                </div>
              )}
            </div>

            <div className="hdr-message-wrap" ref={quickAddWrapRef}>
              <button
                className={`hdr-icon-btn hdr-icon-btn--circle ${isAdmin ? 'hdr-icon-btn--admin-quick-add' : ''}`}
                title="Add New"
                onClick={handleOpenQuickAdd}
              >
                <FaPlus />
              </button>

              {quickAddOpen && (
                <div className={`hdr-popover-panel hdr-quick-add-panel ${isAdmin ? 'hdr-quick-add-panel--admin' : ''}`}>
                  {quickAddItems.map((item) => {
                    const Icon = item.icon
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className={`hdr-quick-add-item ${isAdmin ? 'hdr-quick-add-item--admin' : ''}`}
                        onClick={() => handleQuickAddNavigate(item)}
                      >
                        <span className={`hdr-quick-add-icon-wrap ${isAdmin ? 'hdr-quick-add-icon-wrap--admin' : ''}`}>
                          <Icon className="hdr-quick-add-icon" />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="hdr-message-wrap" ref={messageWrapRef}>
              <button className="hdr-icon-btn hdr-icon-btn--circle" title="Messages" onClick={handleOpenMessagePanel}>
                <span className="hdr-badge hdr-badge--red">{messages.length}</span>
                <FaEnvelope />
              </button>

              {messagePanelOpen && (
                <div className="hdr-popover-panel hdr-message-panel">
                  <button
                    type="button"
                    className="hdr-message-send-btn"
                    onClick={handleOpenSendMessage}
                  >
                    {isAdmin ? 'Send Message' : 'Message Admin'}
                  </button>

                  <button
                    type="button"
                    className="hdr-message-history-link"
                    onClick={handleViewPastMessages}
                  >
                    View Past Messages <span>&raquo;</span>
                  </button>
                </div>
              )}
            </div>

            <div className="hdr-user-menu-wrap" ref={menuWrapRef}>
              <button className="hdr-user-btn" onClick={() => setMenuOpen((previous) => !previous)}>
                <span className="hdr-user-avatar-pill">
                  {(user?.name || 'Keval V Shah').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'KV'}
                </span>
                <div className="hdr-user-meta-info">
                  <span className="hdr-username">{user?.name || 'Keval V Shah'}</span>
                  <span className="hdr-user-role">{user?.role === 'admin' ? 'Director' : (user?.designation || 'User')}</span>
                </div>
                <span className="hdr-caret"><FiChevronDown /></span>
              </button>

              {menuOpen && (
                <div className="hdr-dropdown">
                  <div className="hdr-dropdown-name">{displayName}</div>
                  {dropdownItems.map((item) => {
                    const { label, icon: Icon, route } = item
                    return (
                      <button
                        key={label}
                      type="button"
                      className="hdr-dropdown-item"
                      onClick={() => handleMenuNav(route, item.action)}
                    >
                      <Icon className="hdr-dropdown-icon" />
                      <span>{label}</span>
                    </button>
                    )
                  })}
                  <button
                    type="button"
                    className="hdr-dropdown-item hdr-dropdown-item--logout"
                    onClick={handleLogout}
                  >
                    <FaSignOutAlt className="hdr-dropdown-icon" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="hdr-icon-btn hdr-icon-btn--green-solid hdr-back-btn"
              title="Back"
              onClick={handleBackNavigation}
            >
              <FaArrowLeft />
            </button>
          </div>
        </div>
      </header>

      <AdminMessagesModal
        isOpen={messageModalOpen}
        onClose={() => setMessageModalOpen(false)}
      />

      <AddReminderModal
        isOpen={addReminderOpen}
        onClose={() => setAddReminderOpen(false)}
        createdBy={user?.name || ''}
      />

      <AddTaskModal
        isOpen={addTaskOpen}
        onClose={() => setAddTaskOpen(false)}
      />

    </>
  )
}

export default Header



