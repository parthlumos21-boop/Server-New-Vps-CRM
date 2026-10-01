import React, { useEffect, useMemo, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import swatiLogo from '../../assets/swati-logo.png'
import {
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaClipboardList,
  FaCloud,
  FaDesktop,
  FaHandshake,
  FaHeadset,
  FaList,
  FaListAlt,
  FaTh,
  FaUserCircle,
  FaUsers,
  FaUserTie,
  FaBox,
} from 'react-icons/fa'
import { FiChevronDown, FiChevronRight, FiChevronUp } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { customerService } from '../../services/customerService'
import { buildAdminCustomViewUrl, getAdminCustomViews, subscribeAdminCustomViews } from '../../features/adminAccounts/customViews/customViewStorage'
import { ADMIN_DEAL_CUSTOM_VIEW_NEW_ROUTE, buildAdminDealCustomViewUrl } from '../../features/adminDeals/config/adminDealViews'
import { getAdminDealCustomViews, subscribeAdminDealCustomViews } from '../../features/adminDeals/customViews/dealCustomViewStorage'
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

const SidebarTopCard = ({ isAdmin, isCollapsed, displayName }) => {
  return (
    <div className="sb-top-card" style={{ padding: '20px 16px', background: 'transparent', borderBottom: 'none' }}>
      <img 
        src={swatiLogo} 
        alt="Swati Switchgears Logo" 
        style={{ 
          width: '100%', 
          maxHeight: '60px', 
          objectFit: 'contain',
          opacity: isCollapsed ? 0.5 : 1,
          transition: 'opacity 0.2s ease'
        }} 
      />
    </div>
  )
}

const SectionLabel = ({ children, isCollapsed }) => (
  isCollapsed ? null : <div className="sb-section-label">{children}</div>
)

const SubLink = ({ to, label, accent, end }) => (
  <NavLink
    to={to}
    end={end}
    title={label}
    className={({ isActive }) => (
      `sb-sub-link ${isActive ? 'sb-sub-link--active' : ''} ${accent ? 'sb-sub-link--accent' : ''}`
    )}
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
  const { user } = useAuth()
  const { accounts } = useData()

  const isAccountsRoute = isAdmin && location.pathname.startsWith('/admin/accounts')
  const isCustomersRoute = isAdmin && location.pathname.startsWith('/admin/customers')
  const isDealsRoute = isAdmin && location.pathname.startsWith('/admin/deals')
  const isSupportRequestsRoute = isAdmin && location.pathname.startsWith('/admin/support-requests')
  const isRemindersRoute = isAdmin && location.pathname.startsWith('/admin/reminders')
  const isReportsRoute = isAdmin && location.pathname.startsWith('/admin/reports')
  const isTeamViewRoute = isAdmin && location.pathname.startsWith('/admin/team-view')
  const isCalendarRoute = isAdmin && location.pathname.startsWith('/admin/calendar')
  const isQuotationRoute = isAdmin && (
    location.pathname.startsWith('/admin/quotation-manager')
    || location.pathname === '/admin/reports/quotation-summary'
  )
  const isUserAccountsRoute = !isAdmin && location.pathname.startsWith('/accounts')
  const isUserCustomersRoute = !isAdmin && location.pathname.startsWith('/customers')
  const isUserDealsRoute = !isAdmin && location.pathname.startsWith('/deals')
  const isUserSupportRequestsRoute = !isAdmin && location.pathname.startsWith('/support-requests')
  const isUserRemindersRoute = !isAdmin && location.pathname.startsWith('/reminders')
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
  const [userReportsOpen, setUserReportsOpen] = useState(isUserReportsRoute)
  const [userQuotationManagerOpen, setUserQuotationManagerOpen] = useState(isUserQuotationRoute)
  const [productCatalogueOpen, setProductCatalogueOpen] = useState(location.pathname.startsWith('/admin/products'))

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

  const [customViews, setCustomViews] = useState(() => getAdminCustomViews())
  const [dealCustomViews, setDealCustomViews] = useState(() => getAdminDealCustomViews())

  useEffect(() => { if (isAccountsRoute) setAccountsOpen(true) }, [isAccountsRoute])
  useEffect(() => { if (isCustomersRoute) setCustomersOpen(true) }, [isCustomersRoute])
  useEffect(() => { if (isDealsRoute) setDealsOpen(true) }, [isDealsRoute])
  useEffect(() => { if (isSupportRequestsRoute) setSupportRequestsOpen(true) }, [isSupportRequestsRoute])
  useEffect(() => { if (isRemindersRoute) setRemindersOpen(true) }, [isRemindersRoute])
  useEffect(() => { if (isReportsRoute) setReportsOpen(true) }, [isReportsRoute])
  useEffect(() => { if (isQuotationRoute) setQuotationManagerOpen(true) }, [isQuotationRoute])
  useEffect(() => { if (isUserAccountsRoute) setUserAccountsOpen(true) }, [isUserAccountsRoute])
  useEffect(() => { if (isUserCustomersRoute) setUserCustomersOpen(true) }, [isUserCustomersRoute])
  useEffect(() => { if (isUserDealsRoute) setUserDealsOpen(true) }, [isUserDealsRoute])
  useEffect(() => { if (isUserSupportRequestsRoute) setUserSupportRequestsOpen(true) }, [isUserSupportRequestsRoute])
  useEffect(() => { if (isUserRemindersRoute) setUserRemindersOpen(true) }, [isUserRemindersRoute])
  useEffect(() => { if (isUserReportsRoute) setUserReportsOpen(true) }, [isUserReportsRoute])
  useEffect(() => { if (isUserQuotationRoute) setUserQuotationManagerOpen(true) }, [isUserQuotationRoute])
  useEffect(() => { if (location.pathname.startsWith('/admin/products')) setProductCatalogueOpen(true) }, [location.pathname])
  useEffect(() => subscribeAdminCustomViews(setCustomViews), [])
  useEffect(() => subscribeAdminDealCustomViews(setDealCustomViews), [])
  useEffect(() => {
    localStorage.setItem(
      isAdmin ? ADMIN_SIDEBAR_COLLAPSE_STORAGE_KEY : USER_SIDEBAR_COLLAPSE_STORAGE_KEY,
      String(isSidebarCollapsed)
    )
  }, [isAdmin, isSidebarCollapsed])

  const accountMenuItems = useMemo(() => ([
    { label: 'Add Account', to: '/admin/accounts/new' },
    { label: 'My Group Accounts', to: '/admin/accounts/my-group-accounts' },
    { label: 'Search Account', to: '/admin/accounts/search' },
    { label: 'My Accounts', to: '/admin/accounts/my-accounts' },
    { label: 'Account Source View', to: '/admin/accounts/source-view' },
    { label: 'Weekly reports-ALL', to: '/admin/accounts/weekly-reports-all' },
    { label: 'SW-Baroda / Mum', to: '/admin/accounts/sw-baroda-mum' },
    { label: 'User Wise Leads', to: '/admin/accounts/user-wise-leads' },
    { label: '+ Custom View', to: '/admin/accounts/custom-views/new', accent: true },
    ...customViews.map((entry) => ({ label: entry.name, to: buildAdminCustomViewUrl(entry.id) })),
  ]), [customViews])

  const dealMenuItems = useMemo(() => {
    return [
      { label: 'Add Deal', to: '/admin/deals/add' },
      { label: 'View Deal', to: '/admin/deals/view' },
      { label: 'Search Deal', to: '/admin/deals/search' },
      { label: 'Owner Wise Deal', to: '/admin/deals/owner-wise' },
      { label: 'Project Details', to: '/admin/deals/project-details' },
      { label: 'Ahmedabad Deal', to: '/admin/deals/ahmadabad' },
      { label: 'Vadodara Deal', to: '/admin/deals/vadodara' },
      { label: '+ Custom View', to: ADMIN_DEAL_CUSTOM_VIEW_NEW_ROUTE, accent: true },
      ...dealCustomViews.map((entry) => ({ label: entry.name, to: buildAdminDealCustomViewUrl(entry.id) })),
    ]
  }, [dealCustomViews])

  const supportRequestsMenuItems = [
    { label: 'Add SR', to: '/admin/support-requests/add' },
    { label: 'SR List', to: '/admin/support-requests/list' },
    { label: 'SR View', to: '/admin/support-requests/view' },
    { label: 'Search SR', to: '/admin/support-requests/search' },
    { label: 'Closed SR', to: '/admin/support-requests/closed' },
    { label: '+ Custom View', to: '/admin/support-requests/custom-views/new', accent: true },
  ]

  const remindersMenuItems = [
    { label: 'My Reminders', to: '/admin/reminders/my' },
    { label: 'Active Reminders', to: '/admin/reminders/active' },
    { label: 'Closed Reminders', to: '/admin/reminders/closed' },
    { label: 'Calendar View', to: '/admin/calendar' },
  ]

  const reportsMenuItems = [
    { label: 'Custom Reports', to: '/admin/reports/custom' },
    { label: 'Summary Reports', to: '/admin/reports/summary' },
    { label: 'Analytics', to: '/admin/reports/analytics' },
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
        setQuotationManagerOpen(false)
        setUserAccountsOpen(false)
        setUserCustomersOpen(false)
        setUserDealsOpen(false)
        setUserSupportRequestsOpen(false)
        setUserRemindersOpen(false)
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
      reports: [userReportsOpen, setUserReportsOpen],
      'quotation-manager': [userQuotationManagerOpen, setUserQuotationManagerOpen],
    }

    return (
      <aside className={`sidebar sidebar--user ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
        <nav className="sb-nav">
          <SidebarTopCard isAdmin={false} isCollapsed={isSidebarCollapsed} displayName={displayName} />

          <div className="sb-view-toolbar" aria-label="Sidebar view options">
            {USER_SIDEBAR_TOOLBAR.slice(0, 2).map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `sb-view-toolbar-button sb-view-toolbar-button--active ${isActive ? 'sb-view-toolbar-button--route-active' : ''}`}
                  title={item.title}
                  aria-label={item.ariaLabel}
                >
                  <Icon />
                </NavLink>
              )
            })}
            <button
              type="button"
              className={`sb-view-toolbar-button sb-view-toolbar-button--active ${isSidebarCollapsed ? 'sb-view-toolbar-button--route-active' : ''}`}
              title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              onClick={toggleSidebarCollapse}
            >
              <FaList />
            </button>
            {USER_SIDEBAR_TOOLBAR.slice(2).map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.key}
                  to={item.to}
                  className={({ isActive }) => `sb-view-toolbar-button sb-view-toolbar-button--active ${isActive ? 'sb-view-toolbar-button--route-active' : ''}`}
                  title={item.title}
                  aria-label={item.ariaLabel}
                >
                  <Icon />
                </NavLink>
              )
            })}
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Primary routes</SectionLabel>
            {USER_SIDEBAR_PRIMARY_LINKS.map((link) => {
              const Icon = link.icon

              return (
                <NavLink
                  key={link.key}
                  to={link.to}
                  className={({ isActive }) => `sb-link sb-link--team ${isActive ? 'sb-link--active' : ''}`}
                  title={link.label}
                >
                  <Icon className="sb-link-icon" />
                  <span>{link.label}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Core modules</SectionLabel>

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

            {USER_SIDEBAR_GROUPS.map((group) => {
              if (group.key === 'accounts') return null
              const [isOpen, setIsOpen] = userGroupState[group.key]
              const Icon = group.icon
              const isActive = location.pathname.startsWith(group.routePrefix)

              return (
                <SidebarGroup
                  key={group.key}
                  icon={<Icon />}
                  label={group.label}
                  isActive={isActive}
                  isOpen={isOpen}
                  isCollapsed={isSidebarCollapsed}
                  onToggle={() => setIsOpen((previous) => !previous)}
                >
                  {group.items.map((item) => (
                    <SubLink
                      key={item.to}
                      to={item.to}
                      label={item.label}
                      end={item.to === '/accounts' || item.to === '/deals' || item.to === '/reports'}
                    />
                  ))}
                </SidebarGroup>
              )
            })}
          </div>

          <div className="sb-nav-section">
            <SectionLabel isCollapsed={isSidebarCollapsed}>Utilities</SectionLabel>
            {USER_SIDEBAR_PLAIN_LINKS.map((link) => {
              const Icon = link.icon

              return (
                <NavLink
                  key={link.key}
                  to={link.to}
                  className={({ isActive }) => `sb-plain-link ${isActive ? 'sb-plain-link--active' : ''}`}
                  title={link.label}
                >
                  <Icon className="sb-plain-icon" />
                  <span>{link.label}</span>
                </NavLink>
              )
            })}
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
        </nav>
      </aside>
    )
  }

  return (
    <aside className={`sidebar sidebar--admin ${isSidebarCollapsed ? 'sidebar--collapsed' : ''}`}>
      <nav className="sb-nav">
        <SidebarTopCard isAdmin isCollapsed={isSidebarCollapsed} displayName={displayName} />

        <div className="sb-view-toolbar" aria-label="Sidebar view options">
          <NavLink
            to="/admin/data-manager"
            className={({ isActive }) => `sb-view-toolbar-button sb-view-toolbar-button--active ${isActive ? 'sb-view-toolbar-button--route-active' : ''}`}
            title="Data Manager"
            aria-label="Data Manager"
          >
            <FaCloud />
          </NavLink>
          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => `sb-view-toolbar-button sb-view-toolbar-button--active ${isActive ? 'sb-view-toolbar-button--route-active' : ''}`}
            title="Dashboard"
            aria-label="Dashboard"
          >
            <FaDesktop />
          </NavLink>
          <button
            type="button"
            className={`sb-view-toolbar-button sb-view-toolbar-button--active ${isSidebarCollapsed ? 'sb-view-toolbar-button--route-active' : ''}`}
            title={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            onClick={toggleSidebarCollapse}
          >
            <FaList />
          </button>
          <NavLink
            to="/admin/calendar"
            className={`sb-view-toolbar-button sb-view-toolbar-button--active ${isCalendarRoute ? 'sb-view-toolbar-button--route-active' : ''}`}
            title="Calendar view"
            aria-label="Calendar view"
          >
            <FaCalendarAlt />
          </NavLink>
        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Primary routes</SectionLabel>
          <NavLink
            to="/admin/monitoring"
            className={({ isActive }) => `sb-link sb-link--team ${isActive ? 'sb-link--active' : ''}`}
            title="Dashboard"
          >
            <FaDesktop className="sb-link-icon" />
            <span>Dashboard</span>
          </NavLink>

          <NavLink
            to="/admin/team-view"
            className={({ isActive }) => `sb-link sb-link--team ${isActive || isTeamViewRoute ? 'sb-link--active' : ''}`}
            title="Team View"
          >
            <FaUsers className="sb-link-icon" />
            <span>Team View</span>
          </NavLink>

        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Core modules</SectionLabel>
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
            <SubLink to="/admin/customers/add" label="Add Customer" />
            <SubLink to="/admin/customers/search" label="Search Customer" />
            <SubLink to="/admin/customers/my-customers" label="My Customers" />
          </SidebarGroup>

          <SidebarGroup
            icon={<FaHandshake />}
            label="Deals"
            isActive={isDealsRoute}
            isOpen={dealsOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setDealsOpen((previous) => !previous)}
          >
            {dealMenuItems.map((item) => (
              <SubLink
                key={item.to}
                to={item.to}
                label={item.label}
                accent={item.accent}
                end={item.to === '/admin/deals/view'}
              />
            ))}
          </SidebarGroup>

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

          <SidebarGroup
            icon={<FaBell />}
            label="Reminders"
            isActive={isRemindersRoute}
            isOpen={remindersOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setRemindersOpen((previous) => !previous)}
          >
            {remindersMenuItems.map((item) => (
              <SubLink key={item.to} to={item.to} label={item.label} />
            ))}
          </SidebarGroup>

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
        </div>

        <div className="sb-nav-section">
          <SectionLabel isCollapsed={isSidebarCollapsed}>Workspace tools</SectionLabel>
          <NavLink
            to="/admin/charts"
            className={({ isActive }) => `sb-plain-link ${isActive ? 'sb-plain-link--active' : ''}`}
            title="Charts"
          >
            <FaChartPie className="sb-plain-icon" />
            <span>Charts</span>
          </NavLink>

          <NavLink
            to="/admin/view-settings"
            className={({ isActive }) => `sb-plain-link ${isActive ? 'sb-plain-link--active' : ''}`}
            title="View Settings"
          >
            <FaTh className="sb-plain-icon" />
            <span>View Settings</span>
          </NavLink>

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

          <SidebarGroup
            icon={<FaBox />}
            label="Product Catalogue"
            isActive={location.pathname.startsWith('/admin/products')}
            isOpen={productCatalogueOpen}
            isCollapsed={isSidebarCollapsed}
            onToggle={() => setProductCatalogueOpen((previous) => !previous)}
          >
            <SubLink to="/admin/products" label="View Catalogue" />
            <SubLink to="/admin/products/add" label="Add Product" />
          </SidebarGroup>

          <NavLink
            to="/admin/data-manager"
            className={({ isActive }) => `sb-plain-link ${isActive ? 'sb-plain-link--active' : ''}`}
            title="Data Manager"
          >
            <FaCloud className="sb-plain-icon" />
            <span>Data Manager</span>
          </NavLink>

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
      </nav>
    </aside>
  )
}

export default Sidebar
