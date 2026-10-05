import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import swatiLogo from '../../assets/swati-logo.png'
import lumosLogo from '../../assets/lumos-logo.svg'
import {
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaClipboardList,
  FaDesktop,
  FaHandshake,
  FaHeadset,
  FaKey,
  FaList,
  FaListAlt,
  FaTh,
  FaUserCircle,
  FaUsers,
  FaUserTie,
  FaTasks,
  FaComments,
} from 'react-icons/fa'
import { FiChevronDown, FiChevronRight, FiChevronUp } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { customerService } from '../../services/customerService'

import {
  USER_ACCOUNT_MENU_ITEMS,
  USER_SIDEBAR_GROUPS,
  USER_SIDEBAR_PLAIN_LINKS,
  USER_SIDEBAR_PRIMARY_LINKS,
  USER_SIDEBAR_TOOLBAR,
} from '../../config/userSidebarConfig'
import './Sidebar.css'

const ADMIN_SIDEBAR_COLLAPSE_STORAGE_KEY = 'crm_admin_sidebar_collapsed'
const USER_SIDEBAR_COLLAPSE_STORAGE_KEY = 'crm_user_sidebar_collapsed'

const SidebarGroup = ({ icon, label, isActive, isOpen, isCollapsed, onToggle, children }) => (
  <div className="sb-group">
    <button
      type="button"
      className={`sb-group-trigger ${isOpen ? 'sb-group-trigger--open' : ''} ${isActive ? 'sb-group-trigger--route-active' : ''}`}
      onClick={onToggle}
      title={label}
      aria-label={label}
      aria-expanded={isOpen || isCollapsed}
      aria-haspopup={isCollapsed ? 'menu' : undefined}
    >
      <span className="sb-group-icon">{icon}</span>
      <span className="sb-group-label">{label}</span>
      <span className="sb-group-chevron">
        {isOpen ? <FiChevronUp /> : <FiChevronDown />}
      </span>
    </button>

    {(isOpen || isCollapsed) && (
      <div className="sb-submenu">
        {children}
      </div>
    )}
  </div>
)

const LumosRailMark = () => (
  <span className="sb-lumos-mark" aria-hidden="true">
    {Array.from({ length: 9 }).map((_, index) => (
      <span key={index} />
    ))}
  </span>
)

const SidebarTopCard = ({ isAdmin, isCollapsed, displayName, user }) => {
  return (
    <div className="sb-top-card">
      <div className="sb-brand-header">
        <img 
          src={swatiLogo} 
          alt="Swati Logo" 
          className="sb-brand-logo"
        />
        {!isCollapsed && (
          <div className="sb-brand-text">
            <span className="sb-brand-title">SWATI</span>
            <span className="sb-brand-subtitle">POWERING A BRIGHTER TOMORROW</span>
          </div>
        )}
      </div>
    </div>
  )
}

const SectionLabel = ({ children, isCollapsed }) => (
  isCollapsed ? null : <div className="sb-section-label">{children}</div>
)

const SubLink = ({ to, label, accent, end, isActiveMatch, onClick }) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    onClick={onClick}
    className={({ isActive, isPending }) => {
      const match = typeof isActiveMatch === 'function' ? isActiveMatch() : isActive
      return `sb-sub-link ${match ? 'sb-sub-link--active' : ''} ${accent ? 'sb-sub-link--accent' : ''}`
    }}
  >
    <FiChevronRight className="sb-sub-arrow" />
    <span>{label}</span>
  </NavLink>
)

const todayDateKey = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const Sidebar = ({ isAdmin = false }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { accounts } = useData()

  const handleToolbarNav = (e, path) => {
    e.preventDefault()
    e.stopPropagation()
    navigate(path)
  }

  const isAccountsRoute = isAdmin && location.pathname.startsWith('/admin/accounts')
  const isCustomersRoute = isAdmin && location.pathname.startsWith('/admin/customers')
  const isDealsRoute = isAdmin && location.pathname.startsWith('/admin/deals')
  const isSupportRequestsRoute = isAdmin && location.pathname.startsWith('/admin/support-requests')
  const isRemindersRoute = isAdmin && location.pathname.startsWith('/admin/reminders')
  const isTasksRoute = isAdmin && location.pathname.startsWith('/admin/tasks')
  const isReportsRoute = isAdmin && location.pathname.startsWith('/admin/reports')
  const isPasswordResetRoute = isAdmin && location.pathname.startsWith('/admin/password-reset-requests')
  const isTeamViewRoute = isAdmin && location.pathname.startsWith('/admin/team-view')
  const isQuotationRoute = isAdmin && (
    location.pathname.startsWith('/admin/quotation-manager')
    || location.pathname === '/admin/reports/quotation-summary'
  )
  const isUserAccountsRoute = !isAdmin && location.pathname.startsWith('/accounts')
  const isUserCustomersRoute = !isAdmin && location.pathname.startsWith('/customers')
  const isUserDealsRoute = !isAdmin && location.pathname.startsWith('/deals')
  const isUserSupportRequestsRoute = !isAdmin && location.pathname.startsWith('/support-requests')
  const isUserRemindersRoute = !isAdmin && location.pathname.startsWith('/reminders')
  const isUserTasksRoute = !isAdmin && location.pathname.startsWith('/tasks')
  const isUserReportsRoute = !isAdmin && location.pathname.startsWith('/reports')
  const isUserQuotationRoute = !isAdmin && (
    location.pathname.startsWith('/quotation-manager')
    || location.pathname.startsWith('/quotations')
  )

  const [accountsOpen, setAccountsOpen] = useState(isAccountsRoute)
  const [customersOpen, setCustomersOpen] = useState(isCustomersRoute)
  const [dealsOpen, setDealsOpen] = useState(isDealsRoute)
  const [supportRequestsOpen, setSupportRequestsOpen] = useState(isSupportRequestsRoute)
  const [remindersOpen, setRemindersOpen] = useState(isRemindersRoute)
  const [tasksOpen, setTasksOpen] = useState(isTasksRoute)
  const [reportsOpen, setReportsOpen] = useState(isReportsRoute)
  const [quotationManagerOpen, setQuotationManagerOpen] = useState(isQuotationRoute)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => (
    localStorage.getItem(isAdmin ? ADMIN_SIDEBAR_COLLAPSE_STORAGE_KEY : USER_SIDEBAR_COLLAPSE_STORAGE_KEY) === 'true'
  ))
  const [userAccountsOpen, setUserAccountsOpen] = useState(isUserAccountsRoute)
  const [userCustomersOpen, setUserCustomersOpen] = useState(isUserCustomersRoute)
  const [userDealsOpen, setUserDealsOpen] = useState(isUserDealsRoute)
  const [userSupportRequestsOpen, setUserSupportRequestsOpen] = useState(isUserSupportRequestsRoute)
  const [userRemindersOpen, setUserRemindersOpen] = useState(isUserRemindersRoute)
  const [userTasksOpen, setUserTasksOpen] = useState(isUserTasksRoute)
  const [userReportsOpen, setUserReportsOpen] = useState(isUserReportsRoute)
  const [userQuotationManagerOpen, setUserQuotationManagerOpen] = useState(isUserQuotationRoute)

  const todayKey = todayDateKey()
  const todayAccounts = useMemo(() => (
    accounts.filter((entry) => {
      const raw = entry.dateAdded || entry.createdAt || entry.addedDate || ''
      return raw && String(raw).slice(0, 10) === todayKey
    }).length
  ), [accounts, todayKey])

  const todayCustomers = useMemo(() => (
    customerService.getCustomers().filter((entry) => {
      const raw = entry.dateAdded || entry.createdAt || entry.addedDate || ''
      return raw && String(raw).slice(0, 10) === todayKey
    }).length
  ), [todayKey])


  useEffect(() => { if (isAccountsRoute) setAccountsOpen(true) }, [isAccountsRoute])
  useEffect(() => { if (isCustomersRoute) setCustomersOpen(true) }, [isCustomersRoute])
  useEffect(() => { if (isDealsRoute) setDealsOpen(true) }, [isDealsRoute])
  useEffect(() => { if (isSupportRequestsRoute) setSupportRequestsOpen(true) }, [isSupportRequestsRoute])
  useEffect(() => { if (isRemindersRoute) setRemindersOpen(true) }, [isRemindersRoute])
  useEffect(() => { if (isTasksRoute) setTasksOpen(true) }, [isTasksRoute])
  useEffect(() => { if (isReportsRoute) setReportsOpen(true) }, [isReportsRoute])
  useEffect(() => { if (isQuotationRoute) setQuotationManagerOpen(true) }, [isQuotationRoute])
  useEffect(() => { if (isUserAccountsRoute) setUserAccountsOpen(true) }, [isUserAccountsRoute])
  useEffect(() => { if (isUserCustomersRoute) setUserCustomersOpen(true) }, [isUserCustomersRoute])
  useEffect(() => { if (isUserDealsRoute) setUserDealsOpen(true) }, [isUserDealsRoute])
  useEffect(() => { if (isUserSupportRequestsRoute) setUserSupportRequestsOpen(true) }, [isUserSupportRequestsRoute])
  useEffect(() => { if (isUserRemindersRoute) setUserRemindersOpen(true) }, [isUserRemindersRoute])
  useEffect(() => { if (isUserTasksRoute) setUserTasksOpen(true) }, [isUserTasksRoute])
  useEffect(() => { if (isUserReportsRoute) setUserReportsOpen(true) }, [isUserReportsRoute])
  useEffect(() => { if (isUserQuotationRoute) setUserQuotationManagerOpen(true) }, [isUserQuotationRoute])

  useEffect(() => {
    localStorage.setItem(
      isAdmin ? ADMIN_SIDEBAR_COLLAPSE_STORAGE_KEY : USER_SIDEBAR_COLLAPSE_STORAGE_KEY,
      String(isSidebarCollapsed)
    )
  }, [isAdmin, isSidebarCollapsed])

  const normalizedIdentity = [
    user?.name,
    user?.username,
    user?.email,
  ].map((value) => String(value || '').trim().toLowerCase())
  const isKevalVShah = normalizedIdentity.some((value) => (
    value === 'keval v shah'
    || value === 'keval v. shah'
    || value.startsWith('keval.v.shah@')
    || value.startsWith('kevalvshah@')
  ))

  const accountMenuItems = useMemo(() => ([
    { label: 'Add Account', to: '/admin/accounts/new' },
    { label: 'Search Account', to: '/admin/accounts/search' },
    { label: 'My Accounts', to: '/admin/accounts/my-accounts' },
    { label: 'My Deals', to: '/admin/deals/view' },
    { label: 'Search Deal', to: '/admin/deals/search' },
  ]), [isKevalVShah])



  const supportRequestsMenuItems = [
    { label: 'Add SR', to: '/admin/support-requests/add' },
    { label: 'SR List', to: '/admin/support-requests/list' },
    { label: 'SR View', to: '/admin/support-requests/view' },
    { label: 'Search SR', to: '/admin/support-requests/search' },
    { label: 'Closed SR', to: '/admin/support-requests/closed' },

  ]

  const remindersMenuItems = [
    { label: 'Add Reminder', to: '/admin/reminders/add' },
    { label: 'My Reminders', to: '/admin/reminders/my' },
    { label: 'Active Reminders', to: '/admin/reminders/active' },
    { label: 'Closed Reminders', to: '/admin/reminders/closed' },
  ]

  const tasksMenuItems = [
    { 
      label: 'Add Tasks', 
      to: '/admin/tasks?add=true',
      isActiveMatch: () => location.pathname === '/admin/tasks' && location.search.includes('add=true')
    },
    { 
      label: 'View Tasks', 
      to: '/admin/tasks',
      isActiveMatch: () => location.pathname === '/admin/tasks' && !location.search.includes('add=true')
    },
  ]

  const reportsMenuItems = [
    { label: 'Custom Reports', to: '/admin/reports/custom' },
    { label: 'Summary Reports', to: '/admin/reports/summary' },

    { label: 'Customer Map View', to: '/admin/reports/customer-map' },
  ]

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed((previous) => {
      const next = !previous

      if (next) {
        setAccountsOpen(false)
        setCustomersOpen(false)
        setDealsOpen(false)
        setSupportRequestsOpen(false)
        setRemindersOpen(false)
        setReportsOpen(false)
        setTasksOpen(false)
        setQuotationManagerOpen(false)
        setUserAccountsOpen(false)
        setUserCustomersOpen(false)
        setUserDealsOpen(false)
        setUserSupportRequestsOpen(false)
        setUserRemindersOpen(false)
        setUserTasksOpen(false)
        setUserReportsOpen(false)
        setUserQuotationManagerOpen(false)
      }

      return next
    })
  }

  const displayName = user?.name || (isAdmin ? 'Administrator' : 'Workspace User')

  if (!isAdmin) {
    const userGroupState = {
      accounts: [userAccountsOpen, setUserAccountsOpen],
      customers: [userCustomersOpen, setUserCustomersOpen],
      deals: [userDealsOpen, setUserDealsOpen],
      'support-requests': [userSupportRequestsOpen, setUserSupportRequestsOpen],
      reminders: [userRemindersOpen, setUserRemindersOpen],
      tasks: [userTasksOpen, setUserTasksOpen],
      reports: [userReportsOpen, setUserReportsOpen],
      'quotation-manager': [userQuotationManagerOpen, setUserQuotationManagerOpen],
    }

    return (
      <aside className={`sidebar sidebar--user sidebar--admin ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
        <nav className="sb-nav">
          



          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Monitoring</SectionLabel>
            {USER_SIDEBAR_PRIMARY_LINKS.map((link) => {
              const Icon = link.icon

              return (
                <NavLink
                  key={link.key}
                  to={link.to}
                  className={({ isActive }) => `sb-link sb-link--team ${isActive ? 'sb-link--active' : ''}`}
                  title={link.label}
                >
                  <span className="sb-link-icon"><Icon /></span>
                  {link.key === 'calendar' ? null : <span>{link.label}</span>}
                </NavLink>
              )
            })}
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Sales</SectionLabel>

            <SidebarGroup
              icon={<FaUsers />}
              label="Accounts"
              isActive={isUserAccountsRoute}
              isOpen={userAccountsOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserAccountsOpen((previous) => !previous)}
            >
              {USER_ACCOUNT_MENU_ITEMS.map((item) => (
                <SubLink
                  key={item.to}
                  to={item.to}
                  label={item.label}
                  end={item.to === '/accounts'}
                />
              ))}
            </SidebarGroup>

            <SidebarGroup
              icon={<FaUserTie />}
              label="Customers"
              isActive={isUserCustomersRoute}
              isOpen={userCustomersOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserCustomersOpen((previous) => !previous)}
            >
              <SubLink to="/customers/search" label="Search Customer" />
              <SubLink to="/customers/my-customers" label="My Customers" />
            </SidebarGroup>

            <SidebarGroup
              icon={<FaClipboardList />}
              label="Quotation Manager"
              isActive={isUserQuotationRoute}
              isOpen={userQuotationManagerOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserQuotationManagerOpen((previous) => !previous)}
            >
              <SubLink to="/quotation-manager/view" label="View Quotations" />
              <SubLink to="/reports/quotation-summary" label="Summary Report" />
            </SidebarGroup>
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>CRM Support</SectionLabel>
            <SidebarGroup
              icon={<FaHeadset />}
              label="Support Requests"
              isActive={isUserSupportRequestsRoute}
              isOpen={userSupportRequestsOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserSupportRequestsOpen((previous) => !previous)}
            >
              <SubLink to="/support-requests/add" label="Add SR" />
              <SubLink to="/support-requests/list" label="SR List" />
              <SubLink to="/support-requests/view" label="SR View" />
              <SubLink to="/support-requests/search" label="Search SR" />
              <SubLink to="/support-requests/closed" label="Closed SR" />
            </SidebarGroup>
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Tasks</SectionLabel>
            <SidebarGroup
              icon={<FaTasks />}
              label="Tasks"
              isActive={isUserTasksRoute}
              isOpen={userTasksOpen && !isSidebarCollapsed}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserTasksOpen(!userTasksOpen)}
            >
              <SubLink to="/tasks?add=true" label="Add Tasks" isActiveMatch={() => location.pathname === '/tasks' && location.search.includes('add=true')} />
              <SubLink to="/tasks" label="View Tasks" isActiveMatch={() => location.pathname === '/tasks' && !location.search.includes('add=true')} />
            </SidebarGroup>

            <SidebarGroup
              icon={<FaBell />}
              label="Reminders"
              isActive={isUserRemindersRoute}
              isOpen={userRemindersOpen && !isSidebarCollapsed}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserRemindersOpen(!userRemindersOpen)}
            >
              <SubLink to="/reminders/add" label="Add Reminder" />
              <SubLink to="/reminders/my" label="My Reminders" />
              <SubLink to="/reminders/active" label="Active Reminders" />
              <SubLink to="/reminders/closed" label="Closed Reminders" />
            </SidebarGroup>
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Tools</SectionLabel>
            <SidebarGroup
              icon={<FaListAlt />}
              label="Reports"
              isActive={isUserReportsRoute}
              isOpen={userReportsOpen}
              isCollapsed={isSidebarCollapsed}
              onToggle={() => setUserReportsOpen((previous) => !previous)}
            >
              <SubLink to="/reports/custom" label="Custom Reports" />
              <SubLink to="/reports/summary" label="Summary Reports" />
              <SubLink to="/reports/customer-map" label="Customer Map View" />
            </SidebarGroup>

            {USER_SIDEBAR_PLAIN_LINKS.map((link) => {
              const Icon = link.icon

              return (
                <NavLink
                  key={link.key}
                  to={link.to}
                  className={({ isActive }) => `sb-plain-link ${isActive ? 'sb-plain-link--active' : ''}`}
                  title={link.label}
                >
                  <span className="sb-plain-icon"><Icon /></span>
                  <span>{link.label}</span>
                </NavLink>
              )
            })}
          </div>
        </nav>
      </aside>
    )
  }

  return (
    <aside className={`sidebar sidebar--admin ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      <nav className="sb-nav">
        



        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Monitoring</SectionLabel>
          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => `sb-link sb-link--team ${isActive ? 'sb-link--active' : ''}`}
            title="Dashboard"
          >
            <span className="sb-link-icon"><FaDesktop /></span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/team-view"
            className={({ isActive }) => `sb-link sb-link--team ${isActive || isTeamViewRoute ? 'sb-link--active' : ''}`}
            title="Team View"
          >
            <span className="sb-link-icon"><FaUsers /></span>
            <span>Team View</span>
          </NavLink>

          <NavLink
            to="/admin/communication-activities"
            className={({ isActive }) => `sb-link ${isActive || location.pathname === '/admin/communication-activities' ? 'sb-link--active' : ''}`}
            title="Communication Activities"
          >
            <span className="sb-link-icon"><FaComments /></span>
            <span>Communication Activities</span>
          </NavLink>

        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Sales</SectionLabel>
          <SidebarGroup
            icon={<FaUsers />}
            label="Accounts"
            isActive={isAccountsRoute}
            isOpen={accountsOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setAccountsOpen((previous) => !previous)}
          >
            {accountMenuItems.map((item) => (
              <SubLink
                key={item.to}
                to={item.to}
                label={item.label}
                accent={item.accent}
                end={item.to === '/admin/accounts'}
              />
            ))}
          </SidebarGroup>

          <SidebarGroup
            icon={<FaUserTie />}
            label="Customers"
            isActive={isCustomersRoute}
            isOpen={customersOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setCustomersOpen((previous) => !previous)}
          >
            <SubLink to="/admin/customers/search" label="Search Customer" />
            <SubLink to="/admin/customers/my-customers" label="My Customers" />
          </SidebarGroup>

          <SidebarGroup
            icon={<FaClipboardList />}
            label="Quotation Manager"
            isActive={isQuotationRoute}
            isOpen={quotationManagerOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setQuotationManagerOpen((previous) => !previous)}
          >
            <SubLink to="/admin/quotation-manager/view" label="View Quotations" />
            <SubLink to="/admin/reports/quotation-summary" label="Summary Report" />
          </SidebarGroup>
        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>CRM Support</SectionLabel>
          <SidebarGroup
            icon={<FaHeadset />}
            label="Support Requests"
            isActive={isSupportRequestsRoute}
            isOpen={supportRequestsOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setSupportRequestsOpen((previous) => !previous)}
          >
            {supportRequestsMenuItems.map((item) => (
              <SubLink
                key={item.to}
                to={item.to}
                label={item.label}
                accent={item.accent}
              />
            ))}
          </SidebarGroup>
        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Tasks</SectionLabel>
          <SidebarGroup
            icon={<FaTasks />}
            label="Tasks"
            isActive={isTasksRoute}
            isOpen={tasksOpen && !isSidebarCollapsed}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setTasksOpen(!tasksOpen)}
          >
            {tasksMenuItems.map((item) => (
              <SubLink key={item.label} to={item.to} label={item.label} isActiveMatch={item.isActiveMatch} />
            ))}
          </SidebarGroup>

          <SidebarGroup
            icon={<FaBell />}
            label="Reminders"
            isActive={isRemindersRoute}
            isOpen={remindersOpen && !isSidebarCollapsed}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setRemindersOpen(!remindersOpen)}
          >
            {remindersMenuItems.map((item) => (
              <SubLink key={item.label} to={item.to} label={item.label} />
            ))}
          </SidebarGroup>
        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Tools</SectionLabel>
          <SidebarGroup
            icon={<FaListAlt />}
            label="Reports"
            isActive={isReportsRoute}
            isOpen={reportsOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setReportsOpen((previous) => !previous)}
          >
            {reportsMenuItems.map((item) => (
              <SubLink key={item.to} to={item.to} label={item.label} />
            ))}
          </SidebarGroup>

          <NavLink
            to="/admin/charts"
            className={({ isActive }) => `sb-link sb-workspace-tool-link ${isActive ? 'sb-link--active' : ''}`}
            title="Charts"
          >
            <span className="sb-link-icon"><FaChartPie /></span>
            <span>Charts</span>
          </NavLink>

          <NavLink
            to="/admin/view-settings"
            className={({ isActive }) => `sb-link sb-workspace-tool-link ${isActive ? 'sb-link--active' : ''}`}
            title="View Settings"
          >
            <span className="sb-link-icon"><FaTh /></span>
            <span>View Settings</span>
          </NavLink>

          {(user?.role === 'super_admin' || user?.actualRole === 'super_admin') ? (
            <NavLink
              to="/admin/password-reset-requests"
              className={({ isActive }) => `sb-plain-link ${isActive || isPasswordResetRoute ? 'sb-plain-link--active' : ''}`}
              title="Password Reset Requests"
            >
              <span className="sb-plain-icon"><FaKey /></span>
              <span>Password Reset Requests</span>
            </NavLink>
          ) : null}

        </div>

        {!isSidebarCollapsed && (
          <div className="sb-today-section">
            <div className="sb-today-header">Today</div>
            <div className="sb-today-stat">
              <span className="sb-today-count">{todayAccounts}</span>
              <FaUserCircle className="sb-today-icon" />
              <span className="sb-today-label">New Accounts</span>
            </div>
            <div className="sb-today-stat">
              <span className="sb-today-count">{todayCustomers}</span>
              <FaUserCircle className="sb-today-icon" />
              <span className="sb-today-label">New Customers</span>
            </div>
          </div>
        )}

        {!isSidebarCollapsed && !isAdmin && (
          <div className="sb-brand-footer">
            <div className="sb-brand-footer-line" />
            <div className="sb-brand-footer-text">
              <span>PEOPLE</span>
              <span>SOLUTIONS</span>
              <span>GROWTH</span>
            </div>
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar

