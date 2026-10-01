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
  FaTasks,
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
    key: 'calendar',
    to: '/calendar',
    title: 'Calendar',
    ariaLabel: 'Calendar',
    icon: FaCalendarAlt,
  },
  {
    key: 'dashboard',
    to: '/dashboard',
    title: 'Dashboard',
    ariaLabel: 'Dashboard',
    icon: FaDesktop,
  },
]

export const USER_SIDEBAR_PRIMARY_LINKS = [
  {
    key: 'dashboard',
    to: '/dashboard',
    label: 'Dashboard',
    icon: FaDesktop,
  },
  {
    key: 'team-view',
    to: '/team-view',
    label: 'Team View',
    icon: FaUsers,
  },
]

export const USER_ACCOUNT_MENU_ITEMS = [
  { label: 'Add Account', to: '/accounts/new' },
  { label: 'Search Account', to: '/accounts/search' },
  { label: 'My Accounts', to: '/accounts/my-accounts' },
  { label: 'My Deal', to: '/deals/view' },
  { label: 'Search Deal', to: '/deals/search' },
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

      { label: 'Search Customer', to: '/customers/search' },
      { label: 'My Customers', to: '/customers/my-customers' },
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
    ],
  },
  {
    key: 'tasks',
    label: 'Tasks',
    icon: FaTasks,
    routePrefix: '/tasks',
    items: [
      { label: 'Add Tasks', to: '/tasks?add=true' },
      { label: 'View Tasks', to: '/tasks' },
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
