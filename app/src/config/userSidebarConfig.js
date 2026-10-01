import {
  FaBell,
  FaCalendarAlt,
  FaChartPie,
  FaCloud,
  FaClipboardList,
  FaDesktop,
  FaHandshake,
  FaHeadset,
  FaListAlt,
  FaTh,
  FaUsers,
  FaUserTie,
} from 'react-icons/fa'

export const USER_SIDEBAR_TOOLBAR = [
  {
    key: 'data-manager',
    to: '/data-manager',
    title: 'Data Manager',
    ariaLabel: 'Data Manager',
    icon: FaCloud,
  },
  {
    key: 'dashboard',
    to: '/dashboard',
    title: 'Dashboard',
    ariaLabel: 'Dashboard',
    icon: FaDesktop,
  },
  {
    key: 'calendar',
    to: '/reminders',
    title: 'Reminders',
    ariaLabel: 'Reminders',
    icon: FaCalendarAlt,
  },
]

export const USER_SIDEBAR_PRIMARY_LINKS = [
  {
    key: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    icon: FaDesktop,
  },
]

export const USER_ACCOUNT_MENU_ITEMS = [
  { label: 'Add Account', to: '/accounts/new' },
  { label: 'My Group Accounts', to: '/accounts/my-group-accounts' },
  { label: 'Search Account', to: '/accounts/search' },
  { label: 'My Accounts', to: '/accounts/my-accounts' },
  { label: 'Account Source View', to: '/accounts/source-view' },
  { label: 'Daily Fresh Leads', to: '/accounts/daily-fresh-leads' },
  { label: 'No Follow Leads', to: '/accounts/no-follow-leads' },
]

export const USER_SIDEBAR_GROUPS = [
  {
    key: 'accounts',
    label: 'Accounts',
    icon: FaUsers,
    routePrefix: '/accounts',
    items: USER_ACCOUNT_MENU_ITEMS,
  },
  {
    key: 'customers',
    label: 'Customers',
    icon: FaUserTie,
    routePrefix: '/customers',
    items: [
      { label: 'Add Customer', to: '/customers/add' },
      { label: 'Search Customer', to: '/customers/search' },
      { label: 'My Customers', to: '/customers/my-customers' },
    ],
  },
  {
    key: 'deals',
    label: 'Deals',
    icon: FaHandshake,
    routePrefix: '/deals',
    items: [
      { label: 'Add Deal', to: '/deals/add' },
      { label: 'View Deal', to: '/deals/view' },
      { label: 'Search Deal', to: '/deals/search' },
      { label: 'Owner Wise Deal', to: '/deals/owner-wise' },
      { label: 'Project Details', to: '/deals/project-details' },
      { label: 'Ahmedabad Deal', to: '/deals/ahmadabad' },
      { label: 'Vadodara Deal', to: '/deals/vadodara' },
    ],
  },
  {
    key: 'support-requests',
    label: 'Support Requests',
    icon: FaHeadset,
    routePrefix: '/support-requests',
    items: [
      { label: 'Add SR', to: '/support-requests/add' },
      { label: 'SR List', to: '/support-requests/list' },
      { label: 'SR View', to: '/support-requests/view' },
      { label: 'Search SR', to: '/support-requests/search' },
      { label: 'Closed SR', to: '/support-requests/closed' },
    ],
  },
  {
    key: 'reminders',
    label: 'Reminders',
    icon: FaBell,
    routePrefix: '/reminders',
    items: [
      { label: 'My Reminders', to: '/reminders/my' },
      { label: 'Active Reminders', to: '/reminders/active' },
      { label: 'Closed Reminders', to: '/reminders/closed' },
      { label: 'Tasks & Reminders', to: '/tasks' },
    ],
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: FaListAlt,
    routePrefix: '/reports',
    items: [
      { label: 'Custom Reports', to: '/reports/custom' },
      { label: 'Summary Reports', to: '/reports/summary' },
      { label: 'Customer Map View', to: '/reports/customer-map' },
    ],
  },
  {
    key: 'quotation-manager',
    label: 'Quotation Manager',
    icon: FaClipboardList,
    routePrefix: '/quotation-manager',
    items: [
      { label: 'View Quotations', to: '/quotation-manager/view' },
      { label: 'Summary Report', to: '/reports/quotation-summary' },
    ],
  },
]

export const USER_SIDEBAR_PLAIN_LINKS = [
  {
    key: 'charts',
    to: '/charts',
    label: 'Charts',
    icon: FaChartPie,
  },
  {
    key: 'view-settings',
    to: '/view-settings',
    label: 'View Settings',
    icon: FaTh,
  },
  {
    key: 'data-manager',
    to: '/data-manager',
    label: 'Data Manager',
    icon: FaCloud,
  },
]
