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
} from 'react-icons/fa'
import { FiBell, FiChevronDown } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { useTheme } from '../../context/ThemeContext'
import { getAdminReminders } from '../../features/adminReminders/getAdminReminders'
import { getAdminReminderStates, subscribeAdminReminderStates } from '../../features/adminReminders/reminderStorage'
import { getAdminBookmarks, saveAdminBookmarks, subscribeAdminBookmarks } from '../../features/adminBookmarks/adminBookmarkStorage'
import { APP_NAME, getDashboardRoute } from '../../utils/constants'
import swatiLogo from '../../assets/swati-logo.png'
import AdminMessagesModal from './AdminMessagesModal'
import AddReminderModal from '../common/AddReminderModal'
import { buildShellRouteLabel, formatCompactValue } from './shellMeta'
import './Header.css'

const ADMIN_USER_MENU = [
  { label: 'Dashboard', icon: FaDesktop, route: '/admin/monitoring' },
  { label: 'Sales Dashboard', icon: FaDesktop, route: '/admin/sales-dashboard' },
  { label: 'My CRM', icon: FaUserCog, route: '/admin/monitoring?view=myCrm' },
  { label: 'My Profile', icon: FaUserCircle, route: '/admin/user-management' },
  { label: 'LaunchPad', icon: FaTh, route: '/admin/launchpad' },
  { label: 'Settings', icon: FaCog, route: '/admin/settings' },
  { label: 'Quotation Summary', icon: FaCreditCard, route: '/admin/reports/quotation-summary' },
  { label: 'Geo Tracking', icon: FaMapMarkerAlt, route: '/admin/reports/customer-map' },
  { label: 'Connect Outlook', icon: FaEnvelope, action: 'CONNECT_OUTLOOK' },
]

const STANDARD_USER_MENU = [
  { label: 'Dashboard', icon: FaDesktop, route: '/dashboard' },
  { label: 'Accounts', icon: FaBriefcase, route: '/accounts' },
  { label: 'Deals', icon: FaThumbsUp, route: '/deals' },
  { label: 'Custom Reports', icon: FaUserCog, route: '/reports/custom' },
  { label: 'Connect Outlook', icon: FaEnvelope, action: 'CONNECT_OUTLOOK' },
]

const ADD_REMINDER_ACTION = '__add_reminder__'

const ADMIN_QUICK_ADD_ITEMS = [
  { label: 'Add Account', icon: FaBriefcase, route: '/admin/accounts/new' },
  { label: 'Add Customer', icon: FaUsers, route: '/admin/customers/add' },
  { label: 'Add Deal', icon: FaThumbsUp, route: '/admin/deals/add' },
  { label: 'Add Support Request', icon: FaHandsHelping, route: '/admin/support-requests/add' },
  { label: 'Add Reminder', icon: FiBell, action: ADD_REMINDER_ACTION },
  { label: 'Image Gallery', icon: FaImages, route: '/admin/data-manager/image-gallery' },
]

const STANDARD_QUICK_ADD_ITEMS = [
  { label: 'Add Reminder', icon: FiBell, action: ADD_REMINDER_ACTION },
  { label: 'Image Gallery', icon: FaImages, route: '/image-gallery' },
]

const Header = ({ isAdmin = false, isSidebarOpen = false, onToggleSidebar }) => {
  const { user } = useAuth()
  const { toggleTheme, isDark } = useTheme()
  const {
    accounts,
    deals,
    supportRequests,
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
  const dropdownItems = isAdmin ? ADMIN_USER_MENU : STANDARD_USER_MENU
  const profileRoute = '/admin/user-management'
  const salesDashboardRoute = '/admin/sales-dashboard'
  const legacySalesDashboardRoute = '/admin/monitoring?view=salesDashboard'
  const myCrmRoute = '/admin/monitoring?view=myCrm'

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
      addNotification('info', 'Connecting to Outlook', 'Please wait while we redirect you to Microsoft...')
      const returnUrl = encodeURIComponent(window.location.href)
      window.location.href = `/api/auth/microsoft/login?returnUrl=${returnUrl}`
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
    navigate(isAdmin ? '/admin/reminders/my' : '/reminders/my')
  }

  const handleOpenQuickAdd = () => {
    setMenuOpen(false)
    setReminderPanelOpen(false)
    setSearchPanelOpen(false)
    setMessagePanelOpen(false)
    setQuickAddOpen((previous) => !previous)
  }

  const handleOpenSearchPanel = () => {
    if (!isAdmin) {
      closeHeaderPanels()
      navigate('/support-requests/search')
      return
    }

    setMenuOpen(false)
    setReminderPanelOpen(false)
    setQuickAddOpen(false)
    setMessagePanelOpen(false)
    setSearchPanelOpen((previous) => !previous)
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
    navigate(item.route)
  }

  const handleOpenAdvancedSearch = () => {
    const trimmedSearchTerm = searchTerm.trim()
    closeHeaderPanels()
    if (isAdmin) {
      navigate(trimmedSearchTerm ? `/admin/search?query=${encodeURIComponent(trimmedSearchTerm)}` : '/admin/search')
      return
    }

    navigate(trimmedSearchTerm ? `/support-requests/search?query=${encodeURIComponent(trimmedSearchTerm)}` : '/support-requests/search')
  }

  const handleQuickSearch = () => {
    handleOpenAdvancedSearch()
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

  const isProfileBookmarked = useMemo(() => (
    bookmarks.some((entry) => entry.route === profileRoute)
  ), [bookmarks, profileRoute])

  const isSalesDashboardBookmarked = useMemo(() => (
    bookmarks.some((entry) => [salesDashboardRoute, legacySalesDashboardRoute].includes(entry.route))
  ), [bookmarks, legacySalesDashboardRoute, salesDashboardRoute])

  const isMyCrmBookmarked = useMemo(() => (
    bookmarks.some((entry) => entry.route === myCrmRoute)
  ), [bookmarks, myCrmRoute])

  const handleToggleBookmark = (bookmark, routeAliases = [bookmark.route]) => {
    const alreadyBookmarked = bookmarks.some((entry) => routeAliases.includes(entry.route))
    const nextBookmarks = alreadyBookmarked
      ? bookmarks.filter((entry) => !routeAliases.includes(entry.route))
      : [...bookmarks.filter((entry) => !routeAliases.includes(entry.route)), bookmark]

    setBookmarks(saveAdminBookmarks(user, nextBookmarks))
    addNotification(
      'success',
      alreadyBookmarked ? 'Bookmark removed' : 'Bookmark saved',
      `${bookmark.label} ${alreadyBookmarked ? 'removed from' : 'added to'} bookmarks.`
    )
    setMenuOpen(false)
  }

  const handleToggleProfileBookmark = () => {
    handleToggleBookmark({
      id: 'bookmark-my-profile',
      label: 'My Profile',
      route: profileRoute,
      iconKey: 'profile',
    })
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
      <header className={`header ${isAdmin ? 'header--admin' : 'header--user'}`}>
        <div className="header-panel header-panel--center">
        </div>

        <div className="header-panel header-panel--actions">
          <div className="header-action-cluster">
            <div className="hdr-message-wrap" ref={reminderWrapRef}>
              <button
                className={`hdr-icon-btn hdr-icon-btn--orange ${isAdmin ? 'hdr-icon-btn--admin-alert' : ''}`}
                title="Reminders"
                onClick={handleOpenReminderPanel}
              >
                <span className="hdr-badge">{reminderCount}</span>
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
                className={`hdr-icon-btn hdr-icon-btn--green ${isAdmin ? 'hdr-icon-btn--admin-quick-add' : ''}`}
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

            <div className="hdr-message-wrap" ref={searchWrapRef}>
              <button className="hdr-icon-btn hdr-icon-btn--ghost" title="Search" onClick={handleOpenSearchPanel}>
                <FaSearch />
              </button>

              {isAdmin && searchPanelOpen && (
                <div className="hdr-popover-panel hdr-search-panel">
                  <div className="hdr-search-input-row">
                    <div className="hdr-search-input-wrap">
                      <FaSearch className="hdr-search-input-icon" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search for Accounts, Customer, Deal, Project here ..."
                      />
                    </div>

                    <button type="button" className="hdr-search-submit-btn" onClick={handleQuickSearch}>
                      <FaSearch />
                      <span>Search</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    className="hdr-popover-link-btn hdr-popover-link-btn--center"
                    onClick={handleOpenAdvancedSearch}
                  >
                    Advanced Search <span>&raquo;</span>
                  </button>
                </div>
              )}
            </div>

            <div className="hdr-message-wrap" ref={messageWrapRef}>
              <button className="hdr-icon-btn hdr-icon-btn--blue" title="Messages" onClick={handleOpenMessagePanel}>
                <span className="hdr-badge">{messages.length}</span>
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

            <button
              type="button"
              className={`hdr-theme-toggle ${isDark ? 'hdr-theme-toggle--night' : 'hdr-theme-toggle--day'}`}
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light' : 'Switch to Dark'}
              aria-label={isDark ? 'Switch to Light mode' : 'Switch to Dark mode'}
              aria-pressed={isDark}
            >
              {isDark ? <FaMoon /> : <FaSun />}
              <span>{isDark ? 'Dark' : 'Light'}</span>
            </button>

            <div className="hdr-user-menu-wrap" ref={menuWrapRef}>
              <button className="hdr-user-btn" onClick={() => setMenuOpen((previous) => !previous)}>
                <FaUserCircle className="hdr-avatar-icon" />
                <span className="hdr-username">{firstName}</span>
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
                  {isAdmin && (
                    <>
                      <button
                        type="button"
                        className="hdr-dropdown-item"
                        onClick={handleToggleProfileBookmark}
                      >
                        <FaStar className={`hdr-dropdown-icon ${isProfileBookmarked ? 'hdr-dropdown-icon--accent' : ''}`} />
                        <span>{isProfileBookmarked ? 'Remove My Profile Bookmark' : 'Bookmark My Profile'}</span>
                      </button>
                      <button
                        type="button"
                        className="hdr-dropdown-item"
                        onClick={() => handleToggleBookmark({
                          id: 'bookmark-sales-dashboard',
                          label: 'Sales Dashboard',
                          route: salesDashboardRoute,
                          iconKey: 'dashboard',
                        }, [salesDashboardRoute, legacySalesDashboardRoute])}
                      >
                        <FaStar className={`hdr-dropdown-icon ${isSalesDashboardBookmarked ? 'hdr-dropdown-icon--accent' : ''}`} />
                        <span>{isSalesDashboardBookmarked ? 'Remove Sales Dashboard Bookmark' : 'Bookmark Sales Dashboard'}</span>
                      </button>
                      <button
                        type="button"
                        className="hdr-dropdown-item"
                        onClick={() => handleToggleBookmark({
                          id: 'bookmark-my-crm',
                          label: 'My CRM',
                          route: myCrmRoute,
                          iconKey: 'profile',
                        })}
                      >
                        <FaStar className={`hdr-dropdown-icon ${isMyCrmBookmarked ? 'hdr-dropdown-icon--accent' : ''}`} />
                        <span>{isMyCrmBookmarked ? 'Remove My CRM Bookmark' : 'Bookmark My CRM'}</span>
                      </button>
                    </>
                  )}
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

    </>
  )
}

export default Header
