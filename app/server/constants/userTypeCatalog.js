const permissionCatalog = require('../../shared/userTypePermissionCatalog.json')

const USER_TYPE_STATUS_OPTIONS = ['draft', 'active', 'inactive', 'archived']

const USER_TYPE_LANDING_PAGES = [
  { value: '/dashboard', label: 'Dashboard' },
  { value: '/accounts', label: 'Accounts' },
  { value: '/deals', label: 'Deals' },
  { value: '/customers', label: 'Customers' },
  { value: '/support-requests', label: 'Support Requests' },
  { value: '/quotations', label: 'Quotations' },
  { value: '/reports', label: 'Reports' },
  { value: '/calendar', label: 'Calendar' },
  { value: '/messages', label: 'Messages' },
]

const ROLE_HIERARCHY_OPTIONS = [
  { value: 1, label: 'Executive' },
  { value: 2, label: 'Senior Executive' },
  { value: 3, label: 'Team Lead' },
  { value: 4, label: 'Manager' },
  { value: 5, label: 'Director' },
]

const MAIL_GROUP_KEY = 'newEmailAccess'

const flattenPermissions = () => (
  permissionCatalog.flatMap((group) => (
    (group.permissions || []).map((permission, index) => ({
      ...permission,
      groupKey: group.key,
      groupLabel: group.label,
      order: index,
      fullKey: `${group.key}.${permission.key}`,
    }))
  ))
)

const permissionLookup = flattenPermissions().reduce((accumulator, permission) => {
  accumulator[permission.fullKey] = permission
  return accumulator
}, {})

module.exports = {
  permissionCatalog,
  USER_TYPE_STATUS_OPTIONS,
  USER_TYPE_LANDING_PAGES,
  ROLE_HIERARCHY_OPTIONS,
  MAIL_GROUP_KEY,
  flattenPermissions,
  permissionLookup,
}
