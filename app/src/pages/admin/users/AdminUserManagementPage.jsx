import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaArrowRight,
  FaCaretDown,
  FaChevronLeft,
  FaCheck,
  FaCheckCircle,
  FaCog,
  FaEdit,
  FaExchangeAlt,
  FaExclamationCircle,
  FaEye,
  FaEyeSlash,
  FaHistory,
  FaInfoCircle,
  FaKey,
  FaLayerGroup,
  FaMapMarkerAlt,
  FaSearch,
  FaShieldAlt,
  FaSignature,
  FaSyncAlt,
  FaThumbsUp,
  FaTimes,
  FaTrash,
  FaUserCircle,
  FaUserEdit,
  FaUserPlus,
  FaUsers,
  FaClock,
} from 'react-icons/fa'
import Badge from '../../../components/common/Badge'
import Button from '../../../components/common/Button'
import Card from '../../../components/common/Card'
import Input from '../../../components/common/Input'
import Modal from '../../../components/common/Modal'
import Table from '../../../components/common/Table'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { SOCKET_EVENTS } from '../../../constants/socketEvents'
import { CRM_FILTER_USERS, normalizeCrmUserName, getCanonicalCrmUserName } from '../../../features/users/crmUserDirectory'
import { userApi } from '../../../services/userApi'
import ManageUserTypesModule from './ManageUserTypesModule'
import './AdminUserManagementPage.css'

const USER_SETTINGS_BASE_PATH = '/admin/user-management'
const USER_GROUPS_STORAGE_KEY = 'crm-user-management-groups'
const USER_TYPES_STORAGE_KEY = 'crm-user-management-types'
const USER_MENU_VISIBILITY_STORAGE_KEY = 'crm-user-management-menu-visibility'

const initialFormState = {
  name: '',
  email: '',
  password: '',
}

const initialGroupFormState = {
  name: '',
  description: '',
}

const initialTypeFormState = {
  name: '',
  description: '',
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
]

const roundRobinOptions = [
  { value: 'all', label: 'All' },
  { value: 'in', label: 'In Round Robin' },
  { value: 'out', label: 'Out of Round Robin' },
]

const orderByOptions = [
  { value: 'name', label: 'Order By Name' },
  { value: 'recent', label: 'Recently Added' },
  { value: 'lastLogin', label: 'Last Login' },
]

const DEFAULT_TIME_ZONE = '[UTC + 5:30] Indian Standard Time, Sri Lanka Time'

const USER_CARD_MENU_ITEMS = [
  {
    key: 'locations',
    label: 'Locations',
    description: 'Review linked user locations.',
    icon: FaMapMarkerAlt,
  },
  {
    key: 'edit-base-location',
    label: 'Edit Base Location',
    description: 'Update the default working location.',
    icon: FaEdit,
  },
  {
    key: 'edit-signature',
    label: 'Edit Signature',
    description: 'Manage the user email signature.',
    icon: FaSignature,
  },
  {
    key: 'history',
    label: 'History',
    description: 'Check recent activity and updates.',
    icon: FaHistory,
  },
  {
    key: 'edit-user',
    label: 'Edit User',
    description: 'Open the user profile editor.',
    icon: FaUserEdit,
  },
  {
    key: 'migrate-user',
    label: 'Migrate User',
    description: 'Move this user to another setup.',
    icon: FaExchangeAlt,
  },
  {
    key: 'change-permissions',
    label: 'Change Permissions',
    description: 'Adjust role and access control.',
    icon: FaShieldAlt,
  },
  {
    key: 'reset-password',
    label: 'Reset Password',
    description: 'Send or apply a password reset.',
    icon: FaKey,
  },
  {
    key: 'add-round-robin',
    label: 'Add Round Robin',
    description: 'Include this user in round robin.',
    icon: FaSyncAlt,
  },
  {
    key: 'punch-time',
    label: 'Punch-in/out Time',
    description: 'Review attendance punch timing.',
    icon: FaClock,
  },
  {
    key: 'delete',
    label: 'Delete',
    description: 'Remove this user from the system.',
    icon: FaTrash,
    tone: 'danger',
  },
]

const formatCardDate = (value) => {
  if (!value) return '-'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '-'
  const day = String(parsed.getDate()).padStart(2, '0')
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const year = parsed.getFullYear()
  let hours = parsed.getHours()
  const minutes = String(parsed.getMinutes()).padStart(2, '0')
  const meridiem = hours >= 12 ? 'pm' : 'am'
  hours = hours % 12 || 12
  return `${day}-${month}-${year} ${String(hours).padStart(2, '0')}:${minutes} ${meridiem}`
}

const passwordRules = [
  { key: 'uppercase', label: 'One Uppercase Letter', test: (value) => /[A-Z]/.test(value) },
  { key: 'lowercase', label: 'One Lowercase Letter', test: (value) => /[a-z]/.test(value) },
  { key: 'digit', label: 'One Digit', test: (value) => /\d/.test(value) },
  { key: 'special', label: 'One Special Character', test: (value) => /[^A-Za-z0-9]/.test(value) },
]

const generateRandomPassword = () => {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const digits = '23456789'
  const symbols = '!@#$%^&*?'
  const all = upper + lower + digits + symbols
  const pick = (set) => set.charAt(Math.floor(Math.random() * set.length))
  const required = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  while (required.length < 10) {
    required.push(pick(all))
  }
  return required.sort(() => Math.random() - 0.5).join('')
}

const initialWizardState = {
  loginId: '',
  password: '',
  retypePassword: '',
  role: 'user',
  userGroup: '',
  userType: '',
  name: '',
  phone: '',
  timeZone: DEFAULT_TIME_ZONE,
}

const USER_SETTING_CARDS = [
  {
    key: 'add-user',
    title: 'Add User',
    description: 'You can add a user with email id as login.',
    icon: FaUserPlus,
    route: `${USER_SETTINGS_BASE_PATH}/add-user`,
  },
  {
    key: 'manage-users',
    title: 'Manage Users',
    description: 'To manage and configure users.',
    icon: FaUsers,
    route: `${USER_SETTINGS_BASE_PATH}/manage-users`,
  },
  {
    key: 'manage-user-groups',
    title: 'Manage User Groups',
    description: 'To add the user group which defines branches/department of users.',
    icon: FaLayerGroup,
    route: `${USER_SETTINGS_BASE_PATH}/manage-user-groups`,
  },
  {
    key: 'manage-user-types',
    title: 'Manage User Types',
    description: 'To define the user access permission.',
    icon: FaShieldAlt,
    route: `${USER_SETTINGS_BASE_PATH}/manage-user-types`,
  },
]

const formatStatusLabel = (value = '') => (
  String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
)

const formatSimpleUserStatus = (value = '') => {
  const status = String(value || '').trim().toLowerCase()
  if (['disabled', 'inactive', 'rejected', 'blocked', 'deleted'].includes(status)) return 'Inactive'
  return 'Active'
}

const isPrivilegedUserRole = (role = '') => (
  ['admin', 'super_admin', 'owner'].includes(String(role || '').trim().toLowerCase())
)

const canManageUserApproval = (user = {}) => (
  /^\d+$/.test(String(user?.id || ''))
)

const slugifyValue = (value = '') => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')

const readStoredItems = (storageKey) => {
  try {
    const rawValue = window.localStorage.getItem(storageKey)
    const parsedValue = rawValue ? JSON.parse(rawValue) : []
    return Array.isArray(parsedValue) ? parsedValue : []
  } catch {
    return []
  }
}

const readStoredMenuVisibility = (storageKey) => {
  const defaultValue = USER_CARD_MENU_ITEMS.reduce((accumulator, item) => ({
    ...accumulator,
    [item.key]: true,
  }), {})

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    const parsedValue = rawValue ? JSON.parse(rawValue) : {}
    return USER_CARD_MENU_ITEMS.reduce((accumulator, item) => ({
      ...accumulator,
      [item.key]: parsedValue?.[item.key] !== false,
    }), defaultValue)
  } catch {
    return defaultValue
  }
}

const getCurrentView = (pathname) => {
  if (pathname.endsWith('/add-user')) return 'add-user'
  if (pathname.endsWith('/manage-users')) return 'manage-users'
  if (pathname.endsWith('/user-history')) return 'user-history'
  if (pathname.endsWith('/login-history')) return 'login-history'
  if (pathname.endsWith('/user-base-locations')) return 'user-base-locations'
  if (pathname.endsWith('/manage-user-groups')) return 'manage-user-groups'
  if (pathname.endsWith('/manage-user-types')) return 'manage-user-types'
  return 'home'
}

const buildDirectoryUsers = (users = []) => {
  const mergedUsers = new Map()

  users.forEach((entry) => {
    const canonicalName = getCanonicalCrmUserName(entry.name || entry.username || entry.email)
    const normalizedTarget = canonicalName ? normalizeCrmUserName(canonicalName) : normalizeCrmUserName(entry.name || entry.username || entry.email)
    const directoryKey = `directory-${normalizedTarget || String(entry.id)}`
    const directoryEntry = CRM_FILTER_USERS.find((crmUser) => normalizeCrmUserName(crmUser.name) === normalizedTarget) || {}
    const previousEntry = mergedUsers.get(directoryKey) || directoryEntry

    mergedUsers.set(directoryKey, {
      ...previousEntry,
      ...entry,
      id: entry.id || previousEntry.id,
      name: entry.name || previousEntry.name || entry.username || 'User',
      username: entry.username || previousEntry.username || '',
      email: entry.email || previousEntry.email || '',
      role: entry.role || previousEntry.role || 'user',
      status: entry.status || previousEntry.status || 'active',
      userGroup: entry.userGroup || previousEntry.userGroup || 'Unassigned',
      userType: entry.userType || previousEntry.userType || formatStatusLabel(entry.role || previousEntry.role || 'user'),
    })
  })

  return Array.from(mergedUsers.entries())
    .filter(([, entry]) => entry?.id)
    .map(([, entry]) => entry)
}

const UserSettingsHome = ({ onOpen }) => (
  <section className="admin-user-settings-grid">
    {USER_SETTING_CARDS.map((card) => {
      const Icon = card.icon

      return (
        <button
          key={card.key}
          type="button"
          className="admin-user-settings-card"
          onClick={() => onOpen(card.route)}
        >
          <div className="admin-user-settings-card-top">
            <span className="admin-user-settings-card-icon">
              <Icon />
            </span>
            <strong>{card.title}</strong>
          </div>
          <p>{card.description}</p>
        </button>
      )
    })}
  </section>
)

const AddUserView = ({
  formData,
  formError,
  pageSuccess,
  submitting,
  onChange,
  onSubmit,
  onCancel,
}) => (
  <Card
    title="Add User"
    subtitle="You can add a user with email id as login."
    className="admin-user-settings-content-card"
  >
    {pageSuccess ? (
      <div className="admin-user-management-success">{pageSuccess}</div>
    ) : null}

    <form className="admin-user-settings-form" onSubmit={onSubmit}>
      <Input
        label="Full Name *"
        value={formData.name}
        onChange={(event) => onChange('name', event.target.value)}
        fullWidth
        required
      />

      <Input
        label="Email *"
        type="email"
        value={formData.email}
        onChange={(event) => onChange('email', event.target.value)}
        fullWidth
        required
      />

      <Input
        label="Password *"
        type="password"
        value={formData.password}
        onChange={(event) => onChange('password', event.target.value)}
        helperText="Minimum 6 characters."
        fullWidth
        required
      />

      <div className="admin-user-management-fixed-role">
        <span className="admin-user-management-fixed-role-label">Role</span>
        <div className="admin-user-management-fixed-role-value">
          <Badge variant="default">{roleOptions[1].label}</Badge>
          <span>Admin accounts are not created from the frontend.</span>
        </div>
      </div>

      <div className="admin-user-management-help">
        New users are created as standard users and appear in Manage Users immediately.
      </div>

      {formError ? (
        <div className="admin-user-management-error admin-user-management-error-inline">
          {formError}
        </div>
      ) : null}

      <div className="admin-user-settings-form-actions">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Create User'}
        </Button>
      </div>
    </form>
  </Card>
)

const ManageUserGroupsView = ({
  directoryUsers,
  groups,
  form,
  error,
  onFormChange,
  onSubmit,
  onDelete,
}) => {
  const directoryGroupCount = groups.filter((entry) => entry.source === 'Directory').length
  const customGroupCount = groups.filter((entry) => entry.isCustom).length

  const columns = [
    {
      key: 'name',
      label: 'Group Name',
      width: '220px',
      render: (_, row) => (
        <div className="manage-user-groups-table-name">
          <strong>{row.name}</strong>
          <span>{row.source === 'Directory' ? 'Active CRM directory group' : 'Custom admin group'}</span>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      width: '320px',
      render: (value) => (
        <span className="manage-user-groups-table-description">
          {value || 'No description provided.'}
        </span>
      ),
    },
    {
      key: 'members',
      label: 'Users',
      width: '120px',
      render: (value) => <Badge variant="info">{value}</Badge>,
    },
    {
      key: 'source',
      label: 'Source',
      width: '120px',
      render: (value) => <Badge variant={value === 'Directory' ? 'success' : 'default'}>{value}</Badge>,
    },
    {
      key: 'actions',
      label: 'Actions',
      width: '140px',
      render: (_, row) => (
        row.isCustom ? (
          <Button size="small" variant="outline" onClick={() => onDelete(row.id)}>
            Delete
          </Button>
        ) : (
          <span className="admin-user-settings-inline-note">In use</span>
        )
      ),
    },
  ]

  return (
    <div className="admin-user-settings-stack manage-user-groups-page">
      <Card
        title="Manage User Groups"
        subtitle="To add the user group which defines branches/department of users."
        className="admin-user-settings-content-card manage-user-groups-card"
      >
        <div className="manage-user-groups-hero">
          <div className="admin-user-settings-form-panel manage-user-groups-form-panel">
            <div className="manage-user-groups-form-head">
              <h3>Add User Group</h3>
              <p>Create branch or department groups in a clear format for all users.</p>
            </div>

            <Input
              label="Group Name *"
              value={form.name}
              onChange={(event) => onFormChange('name', event.target.value)}
              fullWidth
            />
            <label className="admin-user-settings-textarea-field">
              <span>Description</span>
              <textarea
                rows="4"
                value={form.description}
                onChange={(event) => onFormChange('description', event.target.value)}
                placeholder="Branch or department details"
              />
            </label>
            {error ? <div className="admin-user-management-error admin-user-management-error-inline">{error}</div> : null}
            <div className="admin-user-settings-form-actions admin-user-settings-form-actions-left">
              <Button onClick={onSubmit}>Save Group</Button>
            </div>
          </div>

          <div className="manage-user-groups-summary">
            <div className="manage-user-groups-summary-head">
              <h3>Group Overview</h3>
              <p>Review how many groups are active and how many users are already mapped.</p>
            </div>

            <div className="manage-user-groups-stat-grid">
              <div className="manage-user-groups-stat">
                <span>Total Groups</span>
                <strong>{groups.length}</strong>
              </div>
              <div className="manage-user-groups-stat">
                <span>Directory Groups</span>
                <strong>{directoryGroupCount}</strong>
              </div>
              <div className="manage-user-groups-stat">
                <span>Custom Groups</span>
                <strong>{customGroupCount}</strong>
              </div>
              <div className="manage-user-groups-stat">
                <span>Mapped Users</span>
                <strong>{directoryUsers.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card
        title="Group Directory"
        subtitle="Review CRM directory groups and custom branch or department entries."
        className="admin-user-settings-content-card manage-user-groups-card"
      >
        <div className="manage-user-groups-table-shell">
          <Table
            columns={columns}
            data={groups}
            emptyMessage="No user groups found."
            className="manage-user-groups-table"
          />
        </div>
      </Card>
    </div>
  )
}

const ConfigureUserTypeView = ({
  userTypes,
  selectedTypeId,
  onSelectType,
  onBack,
  onOpenAddModal,
  onDeleteType,
  isAddModalOpen,
  addForm,
  addError,
  onAddFormChange,
  onAddSubmit,
  onAddCancel,
}) => {
  const selectedType = userTypes.find((entry) => entry.id === selectedTypeId) || null

  return (
    <div className="configure-user-type-page">
      <div className="configure-user-type-header">
        <button type="button" className="configure-user-type-back" onClick={onBack}>
          <FaChevronLeft />
          <span>Configure User Type</span>
        </button>
        <button type="button" className="configure-user-type-add-button" onClick={onOpenAddModal}>
          <FaLayerGroup />
          <span>Add User Type</span>
        </button>
      </div>

      <div className="configure-user-type-grid">
        <aside className="configure-user-type-list">
          <div className="configure-user-type-list-header">
            <FaCog className="configure-user-type-list-header-icon" aria-hidden="true" />
            <span>User Types ({userTypes.length})</span>
          </div>
          <ul className="configure-user-type-list-items">
            {userTypes.length === 0 ? (
              <li className="configure-user-type-list-empty">No user types yet.</li>
            ) : (
              userTypes.map((entry) => (
                <li key={entry.id}>
                  <button
                    type="button"
                    className={`configure-user-type-list-item ${selectedTypeId === entry.id ? 'is-selected' : ''}`}
                    onClick={() => onSelectType(entry.id)}
                  >
                    <FaLayerGroup className="configure-user-type-list-item-icon" aria-hidden="true" />
                    <span>{entry.name}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </aside>

        <section className="configure-user-type-detail">
          {selectedType ? (
            <div className="configure-user-type-detail-card">
              <div className="configure-user-type-detail-head">
                <div className="configure-user-type-detail-head-left">
                  <FaLayerGroup className="configure-user-type-detail-head-icon" aria-hidden="true" />
                  <div>
                    <h2>{selectedType.name}</h2>
                    <p>{selectedType.description || 'No description provided.'}</p>
                  </div>
                </div>
                <div className="configure-user-type-detail-head-right">
                  <Badge variant={selectedType.source === 'Directory' ? 'success' : 'default'}>
                    {selectedType.source}
                  </Badge>
                  {selectedType.isCustom ? (
                    <button
                      type="button"
                      className="configure-user-type-delete-button"
                      onClick={() => onDeleteType(selectedType.id)}
                    >
                      <FaTrash /> Delete
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="configure-user-type-detail-stats">
                <div className="configure-user-type-stat">
                  <span className="configure-user-type-stat-label">Users Assigned</span>
                  <strong>{selectedType.members}</strong>
                </div>
                <div className="configure-user-type-stat">
                  <span className="configure-user-type-stat-label">Source</span>
                  <strong>{selectedType.source}</strong>
                </div>
                <div className="configure-user-type-stat">
                  <span className="configure-user-type-stat-label">Type</span>
                  <strong>{selectedType.isCustom ? 'Custom' : 'Built-in'}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="configure-user-type-empty">
              <FaThumbsUp className="configure-user-type-empty-icon" aria-hidden="true" />
              <span>Select the User Type to manage.</span>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={onAddCancel}
        title="Add User Type"
        size="small"
      >
        <div className="configure-user-type-add-form">
          <Input
            label="User Type *"
            value={addForm.name}
            onChange={(event) => onAddFormChange('name', event.target.value)}
            fullWidth
          />
          <label className="admin-user-settings-textarea-field">
            <span>Access Description</span>
            <textarea
              rows="4"
              value={addForm.description}
              onChange={(event) => onAddFormChange('description', event.target.value)}
              placeholder="Permission or access description"
            />
          </label>
          {addError ? (
            <div className="admin-user-management-error admin-user-management-error-inline">{addError}</div>
          ) : null}
          <div className="configure-user-type-add-form-actions">
            <Button variant="outline" onClick={onAddCancel}>Cancel</Button>
            <Button onClick={onAddSubmit}>Save User Type</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const ManageUsersCardView = ({
  users,
  loading,
  searchTerm,
  onSearchChange,
  roundRobinFilter,
  onRoundRobinChange,
  orderBy,
  onOrderByChange,
  userGroupFilter,
  onUserGroupFilterChange,
  userGroupOptions,
  actionsOpen,
  onToggleActions,
  onCloseActions,
  onAddUser,
  onUserHistory,
  onLoginHistory,
  onUserBaseLocations,
  onResetRoundRobin,
  openCardMenuId,
  onToggleCardMenu,
  userMenuItems,
  menuVisibility,
  menuSetupOpen,
  onToggleMenuSetup,
  onToggleMenuVisibility,
  onUserMenuAction,
  onUserStatusAction,
  onlineUserIds,
  liveStatus,
  lastLiveUpdate,
  currentUserId,
}) => {
  const [visiblePasswordIds, setVisiblePasswordIds] = useState(() => new Set())

  const getStatusTone = (status = '') => {
    const normalizedStatus = String(status || '').toLowerCase()
    if (normalizedStatus === 'pending') return 'pending'
    if (['rejected', 'disabled', 'inactive'].includes(normalizedStatus)) return 'inactive'
    return 'active'
  }

  const togglePasswordVisibility = useCallback((userId) => {
    setVisiblePasswordIds((current) => {
      const next = new Set(current)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  return (
    <Card
      title={`Manage Users (${users.length})`}
      actions={(
        <span className={`manage-users-live-badge is-${liveStatus}`} title={lastLiveUpdate ? `Last update: ${lastLiveUpdate.label}` : ''}>
          <span className="manage-users-live-dot" aria-hidden="true" />
          {liveStatus === 'live' ? 'Live' : liveStatus === 'connecting' ? 'Connecting...' : 'Offline'}
        </span>
      )}
      className="admin-user-settings-content-card manage-users-card-shell"
    >
      {lastLiveUpdate ? (
        <div className="manage-users-live-banner">
          <FaCheckCircle aria-hidden="true" /> {lastLiveUpdate.label}
        </div>
      ) : null}

      <div className="manage-users-toolbar">
        <div className="manage-users-search">
          <FaSearch className="manage-users-search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>

        <div className="manage-users-toolbar-right">
          <select
            className="manage-users-filter-select"
            value={userGroupFilter}
            onChange={(event) => onUserGroupFilterChange(event.target.value)}
          >
            <option value="">All Departments</option>
            {userGroupOptions.map((group) => (
              <option key={group} value={group}>
                {group}
              </option>
            ))}
          </select>

          <select
            className="manage-users-filter-select"
            value={orderBy}
            onChange={(event) => onOrderByChange(event.target.value)}
          >
            {orderByOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button type="button" className="manage-users-secondary-button" onClick={onUserHistory}>
            <FaHistory /> User History
          </button>
          <button
            type="button"
            className="manage-users-secondary-button"
            onClick={() => {
              onSearchChange('')
              onUserGroupFilterChange('')
              onOrderByChange('name')
              onRoundRobinChange('all')
            }}
          >
            Reset
          </button>
          <button type="button" className="manage-users-add-button" onClick={onAddUser}>
            <FaUserPlus /> Add User
          </button>
        </div>
      </div>

      {loading ? (
        <div className="manage-users-empty">Loading users...</div>
      ) : users.length ? (
        <div className="manage-users-grid" aria-live="polite">
          {users.map((user) => {
            const userId = user.id || user.email || user.username || user.name
            const statusTone = getStatusTone(user.status)
            const isOnline = onlineUserIds.has(String(user.id))
            const canApproveUser = canManageUserApproval(user)
            const isCurrentUser = String(user.id || '') === String(currentUserId || '')
            const statusLabel = isOnline ? 'Online' : formatStatusLabel(user.status || 'pending')
            const passwordKey = String(userId)
            const assignedPassword = user.assignedPassword || ''
            const isPasswordVisible = visiblePasswordIds.has(passwordKey)

            return (
              <article key={userId} className="manage-users-card-item">
                <div className="manage-users-card-head">
                  <div className="manage-users-card-head-left">
                    <span className="manage-users-card-avatar" aria-hidden="true">
                      <FaUserCircle />
                    </span>
                    <div className="manage-users-card-title">
                      <strong>{user.name || user.username || 'User'}</strong>
                      <span>{user.email || 'No email'}</span>
                    </div>
                  </div>
                  <span className={`manage-users-approval-status is-${isOnline ? 'online' : statusTone}`}>
                    <span className="manage-users-table-status-dot" aria-hidden="true" />
                    {statusLabel}
                  </span>
                </div>

                <dl className="manage-users-card-fields">
                  <div className="manage-users-card-row">
                    <dt>Email ID</dt>
                    <dd>{user.email || user.username || '-'}</dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Department</dt>
                    <dd>{user.department || user.userGroup || 'Unassigned'}</dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Role</dt>
                    <dd>{formatStatusLabel(user.role || 'user')}</dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Password</dt>
                    <dd className="manage-users-password-cell">
                      <span className="manage-users-password-value">
                        {assignedPassword ? (isPasswordVisible ? assignedPassword : '********') : '-'}
                      </span>
                      {assignedPassword ? (
                        <button
                          type="button"
                          className="manage-users-password-toggle"
                          onClick={() => togglePasswordVisibility(passwordKey)}
                          aria-label={`${isPasswordVisible ? 'Hide' : 'Show'} password for ${user.name || user.email || 'user'}`}
                          title={isPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                          {isPasswordVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                      ) : null}
                    </dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Mobile</dt>
                    <dd>{user.phone || user.mobile || '-'}</dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Last Login</dt>
                    <dd>{formatCardDate(user.lastLogin)}</dd>
                  </div>
                  <div className="manage-users-card-row">
                    <dt>Created</dt>
                    <dd>{formatCardDate(user.createdAt)}</dd>
                  </div>
                </dl>

                <div className="manage-users-card-actions">
                  <button
                    type="button"
                    className="manage-users-approval-button is-approve"
                    disabled={!canApproveUser || user.status === 'approved'}
                    onClick={() => onUserStatusAction('approve', user)}
                    title={canApproveUser ? 'Approve this user for login' : 'Only saved MongoDB users can be approved here'}
                  >
                    <FaCheck /> Approve
                  </button>
                  <button
                    type="button"
                    className="manage-users-approval-button is-reject"
                    disabled={!canApproveUser || user.status === 'rejected' || isCurrentUser}
                    onClick={() => onUserStatusAction('reject', user)}
                    title={isCurrentUser ? 'You cannot deny your own account' : canApproveUser ? 'Deny login for this user' : 'Only saved MongoDB users can be denied here'}
                  >
                    <FaTimes /> Not Approve
                  </button>
                  <button
                    type="button"
                    className="manage-users-simple-action"
                    onClick={() => onUserMenuAction('edit-user', user)}
                    aria-label={`Edit ${user.name || 'user'}`}
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    className="manage-users-simple-action is-danger"
                    onClick={() => onUserMenuAction('delete', user)}
                    aria-label={`Delete ${user.name || 'user'}`}
                  >
                    <FaTrash />
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="manage-users-empty">No users found.</div>
      )}
    </Card>
  )
}

const WIZARD_STEPS = [
  { key: 1, label: 'Login Details' },
  { key: 2, label: 'Permissions' },
  { key: 3, label: 'Personal Info' },
]

const WizardSteps = ({ activeStep }) => (
  <div className="add-user-wizard-steps">
    {WIZARD_STEPS.map((step, index) => {
      const isActive = step.key === activeStep
      const isComplete = step.key < activeStep
      return (
        <React.Fragment key={step.key}>
          <div className={`add-user-wizard-step ${isActive ? 'is-active' : ''} ${isComplete ? 'is-complete' : ''}`}>
            <span className="add-user-wizard-step-circle">{step.key}</span>
            <span className="add-user-wizard-step-arrow">→</span>
            <span className="add-user-wizard-step-label">{step.label}</span>
          </div>
          {index < WIZARD_STEPS.length - 1 ? <span className="add-user-wizard-step-spacer" /> : null}
        </React.Fragment>
      )
    })}
  </div>
)

const AddNewUserModal = ({
  isOpen,
  onClose,
  wizardData,
  onWizardChange,
  onGeneratePassword,
  activeStep,
  onStepBack,
  onStepNext,
  onSubmit,
  submitting,
  loginIdTaken,
  userGroupOptions,
  userTypeOptions,
  error,
}) => {
  if (!isOpen) return null

  const passwordChecks = passwordRules.map((rule) => ({
    ...rule,
    passed: rule.test(wizardData.password || ''),
  }))
  const allPasswordRulesPassed = passwordChecks.every((rule) => rule.passed)
  const passwordsMatch = (wizardData.password || '') === (wizardData.retypePassword || '')
  const canAdvanceStep1 = Boolean(
    wizardData.loginId.trim()
      && allPasswordRulesPassed
      && passwordsMatch
      && wizardData.password
      && !loginIdTaken
  )
  const canAdvanceStep2 = Boolean(wizardData.userGroup && wizardData.userType)
  const canSubmit = Boolean(wizardData.name.trim())

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New User" size="medium">
      <div className="add-user-wizard">
        <WizardSteps activeStep={activeStep} />
        <div className="add-user-wizard-divider" />

        {activeStep === 1 ? (
          <div className="add-user-wizard-body">
            <div className="add-user-wizard-row">
              <label className={`add-user-wizard-label ${loginIdTaken ? 'is-error' : ''}`}>Login Id</label>
              <div className="add-user-wizard-field">
                <input
                  type="email"
                  className={`add-user-wizard-input ${loginIdTaken ? 'is-error' : ''}`}
                  value={wizardData.loginId}
                  onChange={(event) => onWizardChange('loginId', event.target.value)}
                  placeholder="user@example.com"
                />
                {loginIdTaken ? (
                  <div className="add-user-wizard-inline-error">
                    This Login Id is already configured. Try an other one.
                  </div>
                ) : null}
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">
                Password <FaInfoCircle className="add-user-wizard-info" title="Use a strong password" />
              </label>
              <div className="add-user-wizard-field">
                <input
                  type="password"
                  className="add-user-wizard-input"
                  value={wizardData.password}
                  onChange={(event) => onWizardChange('password', event.target.value)}
                />
                <ul className="add-user-wizard-checklist">
                  {passwordChecks.map((rule) => (
                    <li
                      key={rule.key}
                      className={rule.passed ? 'is-passed' : 'is-pending'}
                    >
                      {rule.passed ? <FaCheck /> : <FaTimes />} {rule.label}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">Re-type password</label>
              <div className="add-user-wizard-field">
                <input
                  type="password"
                  className={`add-user-wizard-input ${wizardData.retypePassword && !passwordsMatch ? 'is-error' : ''}`}
                  value={wizardData.retypePassword}
                  onChange={(event) => onWizardChange('retypePassword', event.target.value)}
                />
                {wizardData.retypePassword && !passwordsMatch ? (
                  <div className="add-user-wizard-inline-error">Passwords do not match.</div>
                ) : null}
              </div>
            </div>

            <div className="add-user-wizard-generate">
              <button type="button" className="add-user-wizard-generate-button" onClick={onGeneratePassword}>
                Generate Password
              </button>
            </div>
          </div>
        ) : null}

        {activeStep === 2 ? (
          <div className="add-user-wizard-body">
            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">User Group</label>
              <div className="add-user-wizard-field">
                <select
                  className="add-user-wizard-input"
                  value={wizardData.userGroup}
                  onChange={(event) => onWizardChange('userGroup', event.target.value)}
                >
                  <option value="">Select user group</option>
                  {userGroupOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">User Type</label>
              <div className="add-user-wizard-field">
                <select
                  className="add-user-wizard-input"
                  value={wizardData.userType}
                  onChange={(event) => onWizardChange('userType', event.target.value)}
                >
                  <option value="">Select user type</option>
                  {userTypeOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">Role</label>
              <div className="add-user-wizard-field add-user-wizard-role-note">
                <Badge variant="default">User</Badge>
                <span>Admin accounts are not created from the frontend.</span>
              </div>
            </div>
          </div>
        ) : null}

        {activeStep === 3 ? (
          <div className="add-user-wizard-body">
            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">Full Name</label>
              <div className="add-user-wizard-field">
                <input
                  type="text"
                  className="add-user-wizard-input"
                  value={wizardData.name}
                  onChange={(event) => onWizardChange('name', event.target.value)}
                  placeholder="Enter full name"
                />
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">Phone</label>
              <div className="add-user-wizard-field">
                <input
                  type="tel"
                  className="add-user-wizard-input"
                  value={wizardData.phone}
                  onChange={(event) => onWizardChange('phone', event.target.value)}
                  placeholder="+91 00000 00000"
                />
              </div>
            </div>

            <div className="add-user-wizard-row">
              <label className="add-user-wizard-label">Time Zone</label>
              <div className="add-user-wizard-field">
                <input
                  type="text"
                  className="add-user-wizard-input"
                  value={wizardData.timeZone}
                  onChange={(event) => onWizardChange('timeZone', event.target.value)}
                />
              </div>
            </div>
          </div>
        ) : null}

        {error ? <div className="add-user-wizard-error">{error}</div> : null}

        <div className="add-user-wizard-divider" />

        <div className="add-user-wizard-footer">
          <button
            type="button"
            className="add-user-wizard-back"
            onClick={activeStep === 1 ? onClose : onStepBack}
          >
            <FaArrowLeft /> Back
          </button>

          {activeStep < 3 ? (
            <button
              type="button"
              className="add-user-wizard-next"
              onClick={onStepNext}
              disabled={activeStep === 1 ? !canAdvanceStep1 : !canAdvanceStep2}
            >
              Next <FaArrowRight />
            </button>
          ) : (
            <button
              type="button"
              className="add-user-wizard-next"
              onClick={onSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? 'Saving...' : 'Create User'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}

const UserInsightView = ({
  type,
  users,
  onlineUserIds,
  onBack,
}) => {
  const config = {
    'user-history': {
      title: 'User History',
      subtitle: 'Review account creation and latest profile activity.',
      icon: FaHistory,
      empty: 'No user history is available yet.',
      columns: [
        {
          key: 'user',
          label: 'User',
          render: (_, user) => (
            <div className="user-insight-user-cell">
              <strong>{user.name || user.username || 'User'}</strong>
              <span>{user.email || '-'}</span>
            </div>
          ),
        },
        { key: 'role', label: 'Role', render: (_, user) => formatStatusLabel(user.role || 'user') },
        { key: 'status', label: 'Status', render: (_, user) => formatSimpleUserStatus(user.status) },
        { key: 'createdAt', label: 'Created', render: (_, user) => formatCardDate(user.createdAt) },
        { key: 'updatedAt', label: 'Last Modified', render: (_, user) => formatCardDate(user.updatedAt || user.createdAt) },
      ],
    },
    'login-history': {
      title: 'Login History',
      subtitle: 'Review online state and latest login timestamps for active users.',
      icon: FaClock,
      empty: 'No login history is available yet.',
      columns: [
        {
          key: 'user',
          label: 'User',
          render: (_, user) => (
            <div className="user-insight-user-cell">
              <strong>{user.name || user.username || 'User'}</strong>
              <span>{user.email || '-'}</span>
            </div>
          ),
        },
        {
          key: 'online',
          label: 'Current State',
          render: (_, user) => {
            const isOnline = onlineUserIds.has(String(user.id))
            return (
              <span className={`manage-users-table-status ${isOnline ? 'is-online' : 'is-offline'}`}>
                <span className="manage-users-table-status-dot" aria-hidden="true" />
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )
          },
        },
        { key: 'lastLogin', label: 'Last Login', render: (_, user) => formatCardDate(user.lastLogin || user.updatedAt) },
        { key: 'timeZone', label: 'Time Zone', render: (_, user) => user.timeZone || DEFAULT_TIME_ZONE },
        { key: 'loginId', label: 'Login ID', render: (_, user) => user.email || user.username || '-' },
        { key: 'assignedPassword', label: 'Password', render: (_, user) => user.assignedPassword || '-' },
      ],
    },
    'user-base-locations': {
      title: 'User Base Locations',
      subtitle: 'Review mapped branch, group, and base-location details.',
      icon: FaMapMarkerAlt,
      empty: 'No base-location mappings are available yet.',
      columns: [
        {
          key: 'user',
          label: 'User',
          render: (_, user) => (
            <div className="user-insight-user-cell">
              <strong>{user.name || user.username || 'User'}</strong>
              <span>{user.email || '-'}</span>
            </div>
          ),
        },
        { key: 'group', label: 'User Group', render: (_, user) => user.userGroup || 'Unassigned' },
        { key: 'baseLocation', label: 'Base Location', render: (_, user) => user.baseLocation || user.location || user.branch || 'Not set' },
        { key: 'timeZone', label: 'Time Zone', render: (_, user) => user.timeZone || DEFAULT_TIME_ZONE },
        { key: 'status', label: 'Status', render: (_, user) => formatSimpleUserStatus(user.status) },
      ],
    },
  }[type]

  const Icon = config.icon
  const visibleUsers = Array.isArray(users) ? users : []

  return (
    <Card
      title={config.title}
      subtitle={config.subtitle}
      className="admin-user-settings-content-card user-insight-card"
      actions={(
        <Button type="button" variant="outline" size="small" onClick={onBack}>
          <FaArrowLeft />
          <span>Manage Users</span>
        </Button>
      )}
    >
      <div className="user-insight-summary">
        <div className="user-insight-summary-icon" aria-hidden="true">
          <Icon />
        </div>
        <div>
          <strong>{visibleUsers.length}</strong>
          <span>{config.title} records</span>
        </div>
      </div>

      <Table
        columns={config.columns}
        data={visibleUsers}
        emptyMessage={config.empty}
        loading={false}
      />
    </Card>
  )
}

const AdminUserManagementPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { addNotification, onlineUsers } = useData()
  const { socket, user } = useAuth()
  const [liveStatus, setLiveStatus] = useState('connecting')
  const [lastLiveUpdate, setLastLiveUpdate] = useState(null)
  const currentView = useMemo(() => getCurrentView(location.pathname), [location.pathname])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [pageError, setPageError] = useState('')
  const [pageSuccess, setPageSuccess] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [formData, setFormData] = useState(initialFormState)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [groupForm, setGroupForm] = useState(initialGroupFormState)
  const [typeForm, setTypeForm] = useState(initialTypeFormState)
  const [groupError, setGroupError] = useState('')
  const [typeError, setTypeError] = useState('')
  const [customGroups, setCustomGroups] = useState(() => readStoredItems(USER_GROUPS_STORAGE_KEY))
  const [customTypes, setCustomTypes] = useState(() => readStoredItems(USER_TYPES_STORAGE_KEY))
  const [userMenuVisibility, setUserMenuVisibility] = useState(() => readStoredMenuVisibility(USER_MENU_VISIBILITY_STORAGE_KEY))
  const [roundRobinFilter, setRoundRobinFilter] = useState('all')
  const [orderBy, setOrderBy] = useState('name')
  const [userGroupFilter, setUserGroupFilter] = useState('')
  const [actionsMenuOpen, setActionsMenuOpen] = useState(false)
  const [menuSetupOpen, setMenuSetupOpen] = useState(false)
  const [openCardMenuId, setOpenCardMenuId] = useState(null)
  const [isAddUserWizardOpen, setIsAddUserWizardOpen] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState(initialWizardState)
  const [wizardError, setWizardError] = useState('')
  const [selectedUserTypeId, setSelectedUserTypeId] = useState(null)
  const [isAddUserTypeModalOpen, setIsAddUserTypeModalOpen] = useState(false)
  const [selectedUserAction, setSelectedUserAction] = useState({ actionKey: '', user: null })

  const onlineUserIds = useMemo(() => {
    const ids = new Set()
    ;(onlineUsers || []).forEach((entry) => {
      const id = entry?.id || entry?.userId || entry
      if (id) ids.add(String(id))
    })
    return ids
  }, [onlineUsers])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setPageError('')

    try {
      const data = await userApi.listUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (error) {
      setPageError(error.response?.data?.message || 'Unable to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  useEffect(() => {
    window.localStorage.setItem(USER_GROUPS_STORAGE_KEY, JSON.stringify(customGroups))
  }, [customGroups])

  useEffect(() => {
    window.localStorage.setItem(USER_TYPES_STORAGE_KEY, JSON.stringify(customTypes))
  }, [customTypes])

  useEffect(() => {
    window.localStorage.setItem(USER_MENU_VISIBILITY_STORAGE_KEY, JSON.stringify(userMenuVisibility))
  }, [userMenuVisibility])

  useEffect(() => {
    if (!actionsMenuOpen && !menuSetupOpen && openCardMenuId === null) return undefined
    const handler = (event) => {
      const insideActions = event.target.closest('.manage-users-actions-wrap')
      const insideMenuSetup = event.target.closest('.manage-users-visibility-wrap')
      const insideCardMenu = event.target.closest('.manage-users-card-head-right')
      if (!insideActions) setActionsMenuOpen(false)
      if (!insideMenuSetup) setMenuSetupOpen(false)
      if (!insideCardMenu) setOpenCardMenuId(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [actionsMenuOpen, menuSetupOpen, openCardMenuId])

  useEffect(() => {
    if (!socket) {
      setLiveStatus('offline')
      return undefined
    }

    const markLive = (label) => {
      setLiveStatus('live')
      setLastLiveUpdate({ label, at: Date.now() })
    }

    const handleConnect = () => setLiveStatus('live')
    const handleDisconnect = () => setLiveStatus('offline')

    const handleUserCreated = (payload) => {
      const created = payload?.user
      setUsers((current) => {
        const next = Array.isArray(current) ? [...current] : []
        if (created && !next.some((entry) => entry.id === created.id)) {
          next.unshift(created)
        }
        return next
      })
      markLive(`New user added${created?.name ? `: ${created.name}` : ''}`)
    }

    const handleUserUpdated = (payload) => {
      const updated = payload?.user
      if (!updated) return
      setUsers((current) => (Array.isArray(current) ? current : []).map(
        (entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)
      ))
      markLive(`User updated${updated.name ? `: ${updated.name}` : ''}`)
    }

    const handleUserStatusChanged = (payload) => {
      const updated = payload?.user
      if (!updated) return
      setUsers((current) => (Array.isArray(current) ? current : []).map(
        (entry) => (entry.id === updated.id ? { ...entry, ...updated } : entry)
      ))
      markLive(`Status changed${updated.name ? ` for ${updated.name}` : ''}`)
    }

    const handleUserDeleted = (payload) => {
      const deletedUserId = payload?.userId || payload?.user?.id
      if (!deletedUserId) return
      setUsers((current) => (Array.isArray(current) ? current : []).filter(
        (entry) => String(entry.id) !== String(deletedUserId)
      ))
      markLive(`User deleted${payload?.user?.name ? `: ${payload.user.name}` : ''}`)
    }

    const handleOnlinePresence = () => markLive('User came online')
    const handleOfflinePresence = () => markLive('User went offline')

    setLiveStatus(socket.connected ? 'live' : 'connecting')

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on(SOCKET_EVENTS.USER_CREATED, handleUserCreated)
    socket.on(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated)
    socket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged)
    socket.on(SOCKET_EVENTS.USER_DELETED, handleUserDeleted)
    socket.on(SOCKET_EVENTS.USER_ONLINE, handleOnlinePresence)
    socket.on(SOCKET_EVENTS.USER_OFFLINE, handleOfflinePresence)

    return () => {
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off(SOCKET_EVENTS.USER_CREATED, handleUserCreated)
      socket.off(SOCKET_EVENTS.USER_UPDATED, handleUserUpdated)
      socket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, handleUserStatusChanged)
      socket.off(SOCKET_EVENTS.USER_DELETED, handleUserDeleted)
      socket.off(SOCKET_EVENTS.USER_ONLINE, handleOnlinePresence)
      socket.off(SOCKET_EVENTS.USER_OFFLINE, handleOfflinePresence)
    }
  }, [socket])

  const directoryUsers = useMemo(() => buildDirectoryUsers(users), [users])

  const userGroupOptions = useMemo(() => {
    const set = new Set()
    directoryUsers.forEach((entry) => {
      const name = String(entry.userGroup || '').trim()
      if (name) set.add(name)
    })
    customGroups.forEach((entry) => {
      const name = String(entry.name || '').trim()
      if (name) set.add(name)
    })
    return Array.from(set).sort((left, right) => left.localeCompare(right))
  }, [customGroups, directoryUsers])

  const userTypeOptions = useMemo(() => {
    const set = new Set()
    directoryUsers.forEach((entry) => {
      const name = String(entry.userType || '').trim()
      if (name) set.add(name)
    })
    customTypes.forEach((entry) => {
      const name = String(entry.name || '').trim()
      if (name) set.add(name)
    })
    return Array.from(set).sort((left, right) => left.localeCompare(right))
  }, [customTypes, directoryUsers])

  const loginIdTaken = useMemo(() => {
    const value = wizardData.loginId.trim().toLowerCase()
    if (!value) return false
    return users.some((entry) => {
      const email = String(entry.email || '').trim().toLowerCase()
      const username = String(entry.username || '').trim().toLowerCase()
      return email === value || username === value
    })
  }, [users, wizardData.loginId])

  const openAddUserWizard = useCallback(() => {
    setWizardData(initialWizardState)
    setWizardStep(1)
    setWizardError('')
    setIsAddUserWizardOpen(true)
  }, [])

  const closeAddUserWizard = useCallback(() => {
    setIsAddUserWizardOpen(false)
    setWizardError('')
  }, [])

  const handleWizardChange = useCallback((field, value) => {
    setWizardError('')
    setWizardData((current) => ({ ...current, [field]: value }))
  }, [])

  const handleGeneratePassword = useCallback(() => {
    const generated = generateRandomPassword()
    setWizardData((current) => ({ ...current, password: generated, retypePassword: generated }))
  }, [])

  const handleWizardNext = useCallback(() => {
    setWizardError('')
    setWizardStep((current) => Math.min(current + 1, 3))
  }, [])

  const handleWizardBack = useCallback(() => {
    setWizardError('')
    setWizardStep((current) => Math.max(current - 1, 1))
  }, [])

  const handleWizardSubmit = useCallback(async () => {
    setWizardError('')
    setSubmitting(true)
    try {
      const payload = {
        name: wizardData.name.trim(),
        email: wizardData.loginId.trim(),
        password: wizardData.password,
      }
      const created = await userApi.createUser(payload)
      await loadUsers()
      addNotification(
        'success',
        'User created',
        `User created successfully. Login username: ${created?.username || payload.email}.`
      )
      setIsAddUserWizardOpen(false)
      setWizardData(initialWizardState)
      setWizardStep(1)
    } catch (error) {
      setWizardError(error.response?.data?.message || 'Unable to save this user.')
    } finally {
      setSubmitting(false)
    }
  }, [addNotification, loadUsers, wizardData])

  const cardViewUsers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    const filtered = directoryUsers.filter((entry) => {
      const matchesSearch = !query || [entry.name, entry.username, entry.email]
        .some((value) => String(value || '').toLowerCase().includes(query))
      const matchesStatus = !statusFilter || entry.status === statusFilter
      const matchesGroup = !userGroupFilter || String(entry.userGroup || '').trim() === userGroupFilter
      return matchesSearch && matchesStatus && matchesGroup
    })

    const sorted = [...filtered]
    if (orderBy === 'name') {
      sorted.sort((left, right) => String(left.name || '').localeCompare(String(right.name || '')))
    } else if (orderBy === 'recent') {
      sorted.sort((left, right) => new Date(right.createdAt || 0) - new Date(left.createdAt || 0))
    } else if (orderBy === 'lastLogin') {
      sorted.sort((left, right) => new Date(right.lastLogin || 0) - new Date(left.lastLogin || 0))
    }
    return sorted
  }, [directoryUsers, orderBy, searchTerm, statusFilter, userGroupFilter])

  const groupRows = useMemo(() => {
    const groupedCounts = directoryUsers.reduce((accumulator, entry) => {
      const groupName = String(entry.userGroup || 'Unassigned').trim() || 'Unassigned'
      accumulator[groupName] = (accumulator[groupName] || 0) + 1
      return accumulator
    }, {})

    const mergedRows = new Map()

    Object.entries(groupedCounts).forEach(([name, count]) => {
      const id = `directory-${slugifyValue(name)}`
      mergedRows.set(normalizeCrmUserName(name), {
        id,
        name,
        description: 'In use by CRM user directory.',
        members: count,
        source: 'Directory',
        isCustom: false,
      })
    })

    customGroups.forEach((entry) => {
      const key = normalizeCrmUserName(entry.name)
      const previousEntry = mergedRows.get(key)
      mergedRows.set(key, {
        id: entry.id,
        name: entry.name,
        description: entry.description || previousEntry?.description || 'Custom group entry.',
        members: previousEntry?.members || 0,
        source: previousEntry ? 'Directory' : 'Custom',
        isCustom: !previousEntry,
      })
    })

    return Array.from(mergedRows.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [customGroups, directoryUsers])

  const userTypeRows = useMemo(() => {
    const typeCounts = directoryUsers.reduce((accumulator, entry) => {
      const typeName = String(entry.userType || 'Standard User').trim() || 'Standard User'
      accumulator[typeName] = (accumulator[typeName] || 0) + 1
      return accumulator
    }, {})

    const mergedRows = new Map()

    Object.entries(typeCounts).forEach(([name, count]) => {
      const id = `directory-${slugifyValue(name)}`
      mergedRows.set(normalizeCrmUserName(name), {
        id,
        name,
        description: 'In use by CRM user directory.',
        members: count,
        source: 'Directory',
        isCustom: false,
      })
    })

    customTypes.forEach((entry) => {
      const key = normalizeCrmUserName(entry.name)
      const previousEntry = mergedRows.get(key)
      mergedRows.set(key, {
        id: entry.id,
        name: entry.name,
        description: entry.description || previousEntry?.description || 'Custom permission entry.',
        members: previousEntry?.members || 0,
        source: previousEntry ? 'Directory' : 'Custom',
        isCustom: !previousEntry,
      })
    })

    return Array.from(mergedRows.values()).sort((left, right) => left.name.localeCompare(right.name))
  }, [customTypes, directoryUsers])

  const visibleUserMenuItems = useMemo(
    () => USER_CARD_MENU_ITEMS.filter((item) => userMenuVisibility[item.key] !== false),
    [userMenuVisibility]
  )

  const openCreateModal = () => {
    setEditingUser(null)
    setFormData(initialFormState)
    setFormError('')
    setPageSuccess('')
    setIsModalOpen(true)
  }

  const openEditModal = (user) => {
    setEditingUser(user)
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
    })
    setFormError('')
    setPageSuccess('')
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    setFormData(initialFormState)
    setFormError('')
  }

  const handleUserFormChange = (field, value) => {
    setFormError('')
    setFormData((currentValue) => ({ ...currentValue, [field]: value }))
  }

  const handleToggleMenuVisibility = useCallback((itemKey) => {
    setUserMenuVisibility((currentValue) => ({
      ...currentValue,
      [itemKey]: currentValue[itemKey] === false,
    }))
  }, [])

  const handleUserMenuAction = useCallback(async (actionKey, user) => {
    setOpenCardMenuId(null)

    const userName = user?.name || user?.username || user?.email || 'This user'
    const isDirectoryEntry = !user?.id || String(user?.id).startsWith('crm-')

    if (actionKey === 'edit-user') {
      if (isDirectoryEntry) {
        addNotification('info', 'Directory entry', 'This user is from the CRM directory and cannot be edited here.')
        return
      }

      openEditModal(user)
      return
    }

    if (isDirectoryEntry) {
      addNotification('info', 'Directory entry', `${userName} is a CRM directory entry. Create a managed user account before editing account settings.`)
      return
    }

    const item = USER_CARD_MENU_ITEMS.find((entry) => entry.key === actionKey)
    const title = item?.label || 'User Action'

    if (actionKey === 'delete') {
      const confirmed = window.confirm(`Delete ${userName}? This action cannot be undone.`)
      if (!confirmed) return

      try {
        await userApi.deleteUser(user.id)
        setUsers((current) => (Array.isArray(current) ? current : []).filter(
          (entry) => String(entry.id) !== String(user.id)
        ))
        addNotification('success', 'User deleted', `${userName} deleted successfully.`)
      } catch (error) {
        addNotification('error', 'Delete failed', error.response?.data?.message || 'Unable to delete this user.')
      }
      return
    }

    if (['locations', 'edit-base-location', 'history', 'punch-time'].includes(actionKey)) {
      setSelectedUserAction({ actionKey, user })
      return
    }

    if (actionKey === 'reset-password') {
      openEditModal(user)
      addNotification('info', 'Reset Password', `Open ${userName} and enter a new password to reset it.`)
      return
    }

    if (actionKey === 'change-permissions') {
      navigate(`${USER_SETTINGS_BASE_PATH}/manage-user-types`)
      return
    }

    if (actionKey === 'add-round-robin') {
      setUsers((current) => (Array.isArray(current) ? current : []).map((entry) => (
        String(entry.id) === String(user.id)
          ? { ...entry, rrCounter: Math.max(0, Number(entry.rrCounter || 0)) }
          : entry
      )))
      addNotification('success', 'Round Robin', `${userName} is included in round robin.`)
      return
    }

    addNotification('info', title, `${title} can be managed from the user profile record.`)
  }, [addNotification, navigate])

  const handleUserStatusAction = useCallback(async (actionKey, user) => {
    const userName = user?.name || user?.username || user?.email || 'This user'

    if (!canManageUserApproval(user)) {
      addNotification('info', 'Approval not available', `${userName} cannot be approved here. Only saved MongoDB users can be changed from this screen.`)
      return
    }

    const actionMap = {
      approve: {
        request: userApi.approveUser,
        status: 'approved',
        title: 'User approved',
        message: `${userName} can now login.`,
      },
      reject: {
        request: userApi.rejectUser,
        status: 'rejected',
        title: 'User not approved',
        message: `${userName} was marked as not approved.`,
      },
      disable: {
        request: userApi.disableUser,
        status: 'disabled',
        title: 'User disabled',
        message: `${userName} was disabled.`,
      },
    }

    const action = actionMap[actionKey]
    if (!action) return

    try {
      const updatedUser = await action.request(user.id)
      setUsers((current) => (Array.isArray(current) ? current : []).map((entry) => (
        String(entry.id) === String(user.id)
          ? { ...entry, ...(updatedUser || {}), status: updatedUser?.status || action.status }
          : entry
      )))
      addNotification('success', action.title, action.message)
    } catch (error) {
      addNotification('error', 'Status update failed', error.message || error.response?.data?.message || 'Unable to update this user status.')
    }
  }, [addNotification])

  const handleCreateUser = async (event) => {
    event.preventDefault()
    setFormError('')
    setPageSuccess('')
    setSubmitting(true)

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        setFormError('Name and email are required.')
        return
      }

      if (!formData.password.trim()) {
        setFormError('Password is required for a new user.')
        return
      }

      await userApi.createUser(formData)
      await loadUsers()
      setFormData(initialFormState)
      setPageSuccess('User created successfully.')
      addNotification('success', 'User created', 'User created successfully.')
      navigate(`${USER_SETTINGS_BASE_PATH}/manage-users`)
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to save this user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleManageUsersSubmit = async (event) => {
    event.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        setFormError('Name and email are required.')
        return
      }

      if (!editingUser && !formData.password.trim()) {
        setFormError('Password is required for a new user.')
        return
      }

      let successMessage = ''

      if (editingUser) {
        const updatePayload = {
          name: formData.name,
          email: formData.email,
        }

        if (formData.password.trim()) {
          updatePayload.password = formData.password
        }

        await userApi.updateUser(editingUser.id, updatePayload)
        successMessage = 'User updated successfully.'
      } else {
        const createdUser = await userApi.createUser(formData)
        successMessage = `User created successfully. Login username: ${createdUser.username}.`
      }

      await loadUsers()
      closeModal()
      setPageSuccess(successMessage)
      addNotification(
        'success',
        editingUser ? 'User updated' : 'User created',
        editingUser
          ? 'User details were updated successfully.'
          : 'User created successfully.'
      )
    } catch (error) {
      setFormError(error.response?.data?.message || 'Unable to save this user.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddGroup = () => {
    const normalizedName = normalizeCrmUserName(groupForm.name)
    setGroupError('')

    if (!normalizedName) {
      setGroupError('Group name is required.')
      return
    }

    if (groupRows.some((entry) => normalizeCrmUserName(entry.name) === normalizedName)) {
      setGroupError('This user group already exists.')
      return
    }

    setCustomGroups((currentValue) => [
      ...currentValue,
      {
        id: `group-${Date.now()}`,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
      },
    ])
    setGroupForm(initialGroupFormState)
    addNotification('success', 'User group added', 'The custom user group was added successfully.')
  }

  const handleBack = () => {
    if (currentView === 'home') {
      navigate('/admin/launchpad')
      return
    }

    navigate(USER_SETTINGS_BASE_PATH)
  }

  const renderContent = () => {
    if (currentView === 'add-user') {
      return (
        <AddUserView
          formData={formData}
          formError={formError}
          pageSuccess={pageSuccess}
          submitting={submitting}
          onChange={handleUserFormChange}
          onSubmit={handleCreateUser}
          onCancel={handleBack}
        />
      )
    }

    if (currentView === 'manage-users') {
      return (
        <>
          {pageError ? <div className="admin-user-management-error">{pageError}</div> : null}
          {pageSuccess ? <div className="admin-user-management-success">{pageSuccess}</div> : null}

          <ManageUsersCardView
            users={cardViewUsers}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            roundRobinFilter={roundRobinFilter}
            onRoundRobinChange={setRoundRobinFilter}
            orderBy={orderBy}
            onOrderByChange={setOrderBy}
            userGroupFilter={userGroupFilter}
            onUserGroupFilterChange={setUserGroupFilter}
            userGroupOptions={userGroupOptions}
            actionsOpen={actionsMenuOpen}
            onToggleActions={() => {
              setMenuSetupOpen(false)
              setActionsMenuOpen((value) => !value)
            }}
            onCloseActions={() => setActionsMenuOpen(false)}
            onAddUser={openCreateModal}
            onUserHistory={() => navigate(`${USER_SETTINGS_BASE_PATH}/user-history`)}
            onLoginHistory={() => navigate(`${USER_SETTINGS_BASE_PATH}/login-history`)}
            onUserBaseLocations={() => navigate(`${USER_SETTINGS_BASE_PATH}/user-base-locations`)}
            onResetRoundRobin={() => addNotification('success', 'Round Robin Reset', 'Round robin counters have been reset.')}
            openCardMenuId={openCardMenuId}
            onToggleCardMenu={(id) => setOpenCardMenuId((current) => (current === id ? null : id))}
            userMenuItems={visibleUserMenuItems}
            menuVisibility={userMenuVisibility}
            menuSetupOpen={menuSetupOpen}
            onToggleMenuSetup={() => {
              setActionsMenuOpen(false)
              setMenuSetupOpen((value) => !value)
            }}
            onToggleMenuVisibility={handleToggleMenuVisibility}
            onUserMenuAction={handleUserMenuAction}
            onUserStatusAction={handleUserStatusAction}
            onlineUserIds={onlineUserIds}
            liveStatus={liveStatus}
            lastLiveUpdate={lastLiveUpdate}
            currentUserId={user?.id}
          />
        </>
      )
    }

    if (currentView === 'user-history' || currentView === 'login-history' || currentView === 'user-base-locations') {
      return (
        <UserInsightView
          type={currentView}
          users={cardViewUsers}
          onlineUserIds={onlineUserIds}
          onBack={() => navigate(`${USER_SETTINGS_BASE_PATH}/manage-users`)}
        />
      )
    }

    if (currentView === 'manage-user-groups') {
      return (
        <ManageUserGroupsView
          directoryUsers={directoryUsers}
          groups={groupRows}
          form={groupForm}
          error={groupError}
          onFormChange={(field, value) => {
            setGroupError('')
            setGroupForm((currentValue) => ({ ...currentValue, [field]: value }))
          }}
          onSubmit={handleAddGroup}
          onDelete={(groupId) => {
            setCustomGroups((currentValue) => currentValue.filter((entry) => entry.id !== groupId))
            addNotification('success', 'User group removed', 'The custom user group was removed successfully.')
          }}
        />
      )
    }

    if (currentView === 'manage-user-types') {
      return (
        <ManageUserTypesModule
          onBack={handleBack}
          addNotification={addNotification}
          onUserTypesSync={setCustomTypes}
        />
      )
    }

    return (
      <UserSettingsHome
        onOpen={(route) => {
          if (route.endsWith('/add-user')) {
            navigate(`${USER_SETTINGS_BASE_PATH}/manage-users`)
            openCreateModal()
          } else {
            navigate(route)
          }
        }}
      />
    )
  }

  const hidePageHeader = currentView === 'manage-user-types'

  return (
    <div className="admin-user-management-page admin-user-settings-page">
      {hidePageHeader ? null : (
        <div className="admin-user-settings-header">
          <button type="button" className="admin-user-settings-back" onClick={handleBack}>
            <FaArrowLeft />
            <span>{currentView === 'home' ? 'Back' : 'Back to User Settings'}</span>
          </button>

          <div className="admin-user-settings-title-wrap">
            <h1>User Settings</h1>
            <p>
              {currentView === 'home'
                ? 'Open the user administration area you want to work with.'
                : USER_SETTING_CARDS.find((entry) => entry.key === currentView)?.description || 'Manage user administration settings.'}
            </p>
          </div>
        </div>
      )}

      {renderContent()}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingUser ? 'Edit User' : 'Create User'}
      >
        <form className="admin-user-management-form" onSubmit={handleManageUsersSubmit}>
          <div className="admin-user-management-help">
            {editingUser
              ? 'Update the user profile here. Enter a new password only when you want to reset it.'
              : 'Create a standard user account. The user appears in Manage Users immediately.'}
          </div>

          <Input
            label="Full Name *"
            value={formData.name}
            onChange={(event) => handleUserFormChange('name', event.target.value)}
            fullWidth
            required
            className="admin-user-management-form-field"
          />

          <Input
            label="Email *"
            type="email"
            value={formData.email}
            onChange={(event) => handleUserFormChange('email', event.target.value)}
            fullWidth
            required
            className="admin-user-management-form-field"
          />

          <Input
            label={editingUser ? 'New Password' : 'Password *'}
            type="password"
            value={formData.password}
            onChange={(event) => handleUserFormChange('password', event.target.value)}
            helperText={editingUser ? 'Leave blank to keep the existing password.' : 'Minimum 6 characters.'}
            fullWidth
            required={!editingUser}
            className="admin-user-management-form-field admin-user-management-form-field-wide"
          />

          <div className="admin-user-management-fixed-role">
            <span className="admin-user-management-fixed-role-label">Role</span>
            <div className="admin-user-management-fixed-role-value">
              <Badge variant="default">{roleOptions[1].label}</Badge>
              <span>Admin accounts are not created from the frontend.</span>
            </div>
          </div>

          {formError ? (
            <div className="admin-user-management-error admin-user-management-error-inline">
              {formError}
            </div>
          ) : null}

          <div className="admin-user-management-modal-actions">
            <Button type="button" variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editingUser ? 'Update User' : 'Create User'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedUserAction.user)}
        onClose={() => setSelectedUserAction({ actionKey: '', user: null })}
        title={USER_CARD_MENU_ITEMS.find((entry) => entry.key === selectedUserAction.actionKey)?.label || 'User Details'}
      >
        {selectedUserAction.user ? (
          <div className="user-action-detail">
            <div className="user-action-detail-head">
              <FaUserCircle aria-hidden="true" />
              <div>
                <strong>{selectedUserAction.user.name || selectedUserAction.user.username || 'User'}</strong>
                <span>{selectedUserAction.user.email || '-'}</span>
              </div>
            </div>

            <div className="user-action-detail-grid">
              {[
                ['Status', formatSimpleUserStatus(selectedUserAction.user.status)],
                ['Role', formatStatusLabel(selectedUserAction.user.role || 'user')],
                ['User Group', selectedUserAction.user.userGroup || 'Unassigned'],
                ['User Type', selectedUserAction.user.userType || formatStatusLabel(selectedUserAction.user.role || 'user')],
                ['Base Location', selectedUserAction.user.baseLocation || selectedUserAction.user.location || selectedUserAction.user.branch || 'Not set'],
                ['Time Zone', selectedUserAction.user.timeZone || DEFAULT_TIME_ZONE],
                ['Last Login', formatCardDate(selectedUserAction.user.lastLogin || selectedUserAction.user.updatedAt)],
                ['Last Modified', formatCardDate(selectedUserAction.user.updatedAt || selectedUserAction.user.createdAt)],
              ].map(([label, value]) => (
                <div key={label} className="user-action-detail-item">
                  <span>{label}</span>
                  <strong>{value || '-'}</strong>
                </div>
              ))}
            </div>

            <div className="admin-user-management-modal-actions">
              <Button type="button" variant="outline" onClick={() => setSelectedUserAction({ actionKey: '', user: null })}>
                Close
              </Button>
              {selectedUserAction.actionKey === 'edit-base-location' ? (
                <Button type="button" onClick={() => {
                  setSelectedUserAction({ actionKey: '', user: null })
                  openEditModal(selectedUserAction.user)
                }}>
                  Edit User
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      </Modal>

      <AddNewUserModal
        isOpen={isAddUserWizardOpen}
        onClose={closeAddUserWizard}
        wizardData={wizardData}
        onWizardChange={handleWizardChange}
        onGeneratePassword={handleGeneratePassword}
        activeStep={wizardStep}
        onStepBack={handleWizardBack}
        onStepNext={handleWizardNext}
        onSubmit={handleWizardSubmit}
        submitting={submitting}
        loginIdTaken={loginIdTaken}
        userGroupOptions={userGroupOptions}
        userTypeOptions={userTypeOptions}
        error={wizardError}
      />
    </div>
  )
}

export default AdminUserManagementPage
