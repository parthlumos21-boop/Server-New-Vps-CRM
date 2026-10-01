export const CUSTOMER_ACTIONS = [
  { key: 'view-customer', label: 'View Customer', behavior: 'view' },
  { key: 'add-note-remarks', label: 'Add Note/Remarks', behavior: 'inline' },
  { key: 'add-reminder', label: 'Add Reminder', behavior: 'inline' },
  { key: 'change-status', label: 'Change Status', behavior: 'inline' },
  { key: 're-assign-customer', label: 'Re-Assign Customer', behavior: 'inline' },
  { key: 'send-mail', label: 'Send Mail', behavior: 'nav' },
  { key: 'generate-quotation', label: 'Generate Quotation', behavior: 'nav', isWizard: true },
  { key: 'manage-customer', label: 'Manage Customer', behavior: 'manage' },
  { key: 'bulk-upload-customers', label: 'Bulk Upload', behavior: 'wizard', isWizard: true },
]

export const CUSTOMER_ACTION_MAP = CUSTOMER_ACTIONS.reduce((acc, action) => {
  acc[action.key] = action
  return acc
}, {})

const normalizeReturnTo = (returnTo = '') => {
  const normalized = String(returnTo || '').trim()
  if (!normalized) return '/admin/customers/search'
  if (normalized.startsWith('/admin/customers')) return normalized
  if (normalized.startsWith('/customers')) return normalized
  return '/admin/customers/search'
}

export const buildCustomerReturnUrl = (returnTo = '', customerId = '') => {
  const normalizedReturnTo = normalizeReturnTo(returnTo)
  const [pathname, rawQuery = ''] = normalizedReturnTo.split('?')
  const searchParams = new URLSearchParams(rawQuery)
  if (customerId) searchParams.set('customerId', customerId)
  const queryString = searchParams.toString()
  return `${pathname}${queryString ? `?${queryString}` : ''}`
}
