// Application constants
export const APP_NAME = 'CRM'
export const APP_VERSION = '1.0.0'

export const DASHBOARD_ROUTES = {
  admin: '/admin/monitoring',
  user: '/dashboard',
}

export const getDashboardRoute = (role) => {
  if (role === 'admin' || role === 'super_admin') {
    return DASHBOARD_ROUTES.admin
  }
  if (['user', 'manager', 'engineer', 'sales'].includes(role)) {
    return DASHBOARD_ROUTES.user
  }
  return '/login'
}

// API endpoints
export const API_ENDPOINTS = {
  AUTH: '/auth',
  ACCOUNTS: '/accounts',
  DEALS: '/deals',
  TASKS: '/tasks',
  QUOTATIONS: '/quotations',
  REPORTS: '/reports',
  USERS: '/users'
}

// Status options
export const ACCOUNT_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'pending', label: 'Pending' },
  { value: 'converted', label: 'Converted' }
]

export const DEAL_STATUS = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contracted' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'contracted', label: 'Contracted' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' }
]

export const TASK_STATUS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' }
]

export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]

// Industry options
export const INDUSTRIES = [
  'Technology',
  'Manufacturing',
  'Healthcare',
  'Finance',
  'Retail',
  'Education',
  'Real Estate',
  'Consulting',
  'Other'
]

// Source options
export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Trade Show',
  'Partner',
  'Other'
]

// Date ranges
export const DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This Week' },
  { value: 'last_week', label: 'Last Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' }
]

// Chart colors
export const CHART_COLORS = {
  primary: '#5d7488',
  success: '#6e8572',
  warning: '#c69238',
  danger: '#c26b5c',
  info: '#7291ab',
  purple: '#8c7b93',
  pink: '#c58d96',
  gray: '#8f806f'
}

// Pagination
export const DEFAULT_PAGE_SIZE = 20
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100]

// Notification duration
export const NOTIFICATION_DURATION = 5000

// Socket events
export const SOCKET_EVENTS = {
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  ACCOUNT_CREATED: 'account:created',
  ACCOUNT_UPDATED: 'account:updated',
  DEAL_CREATED: 'deal:created',
  DEAL_UPDATED: 'deal:updated',
  TASK_CREATED: 'task:created',
  TASK_UPDATED: 'task:updated',
  SUPPORT_REQUEST_CREATED: 'support-request:created',
  SUPPORT_REQUEST_UPDATED: 'support-request:updated',
  MESSAGE_CREATED: 'message:created',
  USERS_ONLINE: 'users:online',
  NOTIFICATION: 'notification',
  ACTIVITY: 'activity'
}
