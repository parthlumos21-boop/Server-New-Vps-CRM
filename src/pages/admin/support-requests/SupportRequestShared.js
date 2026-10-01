export const SUPPORT_REQUEST_TYPE_OPTIONS = [
  { value: 'commissioning_support', label: 'Commissioning Support' },
  { value: 'component_burned_or_malfunctioning', label: 'Component Burned or Malfunctioning' },
  { value: 'others', label: 'Others' },
  { value: 'painting_issue', label: 'Painting Issue' },
  { value: 'parameter_setting', label: 'Parameter Setting' },
  { value: 'retrofitting_job_old_to_new', label: 'Retrofitting Job - Old to New' },
  { value: 'short_material', label: 'Short Material' },
]

export const SUPPORT_REQUEST_TYPE_LABELS = {
  commissioning_support: 'Commissioning Support',
  component_burned_or_malfunctioning: 'Component Burned or Malfunctioning',
  others: 'Others',
  painting_issue: 'Painting Issue',
  parameter_setting: 'Parameter Setting',
  retrofitting_job_old_to_new: 'Retrofitting Job - Old to New',
  short_material: 'Short Material',
  general: 'General',
  user_permissions: 'User Permissions',
  reports: 'Reports',
  integrations: 'Integrations',
  additional_user_logins: 'Additional User Logins',
  billing: 'Billing',
  other: 'Other',
  bug: 'Bug Report',
  feature: 'Feature Request',
  support: 'Technical Support',
  complaint: 'Complaint',
  feedback: 'Feedback',
}

export const buildSupportRequestTypeOptions = (currentValue = '') => {
  if (!currentValue || SUPPORT_REQUEST_TYPE_OPTIONS.some((option) => option.value === currentValue)) {
    return SUPPORT_REQUEST_TYPE_OPTIONS
  }

  return [
    {
      value: currentValue,
      label: SUPPORT_REQUEST_TYPE_LABELS[currentValue] || currentValue,
    },
    ...SUPPORT_REQUEST_TYPE_OPTIONS,
  ]
}

export const formatSupportRequestType = (value) =>
  SUPPORT_REQUEST_TYPE_LABELS[value] || value || '-'

export const formatShortDate = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

export const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export const formatTicketDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).replace(' am', ' am').replace(' pm', ' pm')
}

export const isAdminSupportRequestRoute = (pathname = '') =>
  String(pathname || '').startsWith('/admin')

export const getSupportRequestBasePath = (pathname = '') => (
  isAdminSupportRequestRoute(pathname)
    ? '/admin/support-requests'
    : '/support-requests'
)
