import React, { useMemo, useState } from 'react'
import { FaTimes } from 'react-icons/fa'
import { enrichUsersForTeamView } from '../../../features/adminTeamView/teamViewData'

const FILTER_MODES = [
  { key: 'user', label: 'User Wise' },
  { key: 'type', label: 'User Type Wise' },
  { key: 'group', label: 'User Group Wise' },
]

const getSrUserIds = (supportRequest = {}) => [
  supportRequest.ownerId,
  supportRequest.userId,
  supportRequest.assignedToId,
  supportRequest.assignedUserId,
].filter(Boolean)

const buildUserGroups = (users) => {
  const enrichedUsers = enrichUsersForTeamView(users).map((user) => {
    const sourceUser = users.find((entry) => entry.id === user.id) || {}

    return {
      ...user,
      userGroup: sourceUser.userGroup || user.userGroup,
      userType: sourceUser.userType || user.userType,
    }
  })

  return [
    {
      key: 'back-office',
      label: 'Back Office',
      users: enrichedUsers.filter((user) => !String(user.userType || '').toLowerCase().includes('field staff')),
    },
    {
      key: 'field-staff',
      label: 'Field Staff',
      users: enrichedUsers.filter((user) => String(user.userType || '').toLowerCase().includes('field staff')),
    },
  ]
}

const UserCheckbox = ({ user, checked, onChange }) => (
  <label className="sr-user-filter-user-option">
    <input
      type="checkbox"
      checked={checked}
      onChange={() => onChange(user.id)}
    />
    <span>{user.name || user.username || user.email}</span>
  </label>
)

const SupportRequestUserFilterPanel = ({
  users,
  supportRequests,
  selectedUserIds,
  activeMode,
  onModeChange,
  onApply,
  onClose,
}) => {
  const [draftMode, setDraftMode] = useState(activeMode || 'user')
  const [draftSelectedUserIds, setDraftSelectedUserIds] = useState(selectedUserIds)

  const groups = useMemo(() => buildUserGroups(users), [users])
  const allUserIds = useMemo(() => users.map((user) => user.id), [users])
  const selectedSet = useMemo(() => new Set(draftSelectedUserIds), [draftSelectedUserIds])
  const allChecked = allUserIds.length > 0 && allUserIds.every((userId) => selectedSet.has(userId))

  const toggleUser = (userId) => {
    setDraftSelectedUserIds((currentValue) => (
      currentValue.includes(userId)
        ? currentValue.filter((entry) => entry !== userId)
        : [...currentValue, userId]
    ))
  }

  const toggleUsers = (userIds) => {
    const allGroupSelected = userIds.every((userId) => selectedSet.has(userId))

    setDraftSelectedUserIds((currentValue) => {
      if (allGroupSelected) {
        return currentValue.filter((userId) => !userIds.includes(userId))
      }

      return Array.from(new Set([...currentValue, ...userIds]))
    })
  }

  const toggleCheckAll = () => {
    setDraftSelectedUserIds(allChecked ? [] : allUserIds)
  }

  const applyFilter = () => {
    onModeChange(draftMode)
    onApply(draftSelectedUserIds)
    onClose()
  }

  return (
    <div className="sr-user-filter-panel" role="dialog" aria-label="Support request user filter">
      <div className="sr-user-filter-header">
        <div>
          <h2>User Filter</h2>
          <p>{supportRequests.length} support request record{supportRequests.length === 1 ? '' : 's'} in current view</p>
        </div>
        <button type="button" className="sr-user-filter-close" onClick={onClose} aria-label="Close user filter">
          <FaTimes />
        </button>
      </div>

      <div className="sr-user-filter-mode-list">
        {FILTER_MODES.map((mode) => {
          const isActive = draftMode === mode.key

          return (
            <div key={mode.key} className="sr-user-filter-mode-row">
              <span>{mode.label}</span>
              <div className="sr-user-filter-toggle" role="group" aria-label={mode.label}>
                <button
                  type="button"
                  className={isActive ? 'active' : ''}
                  onClick={() => setDraftMode(mode.key)}
                >
                  YES
                </button>
                <button
                  type="button"
                  className={!isActive ? 'active' : ''}
                  onClick={() => {
                    if (isActive) setDraftMode('user')
                  }}
                >
                  NO
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sr-user-filter-check-all">
        <label className="sr-user-filter-user-option sr-user-filter-user-option-strong">
          <input type="checkbox" checked={allChecked} onChange={toggleCheckAll} />
          <span>Check All</span>
        </label>
      </div>

      <section className="sr-user-filter-section">
        <div className="sr-user-filter-section-title">All Users</div>
        <div className="sr-user-filter-user-grid">
          {users.map((user) => (
            <UserCheckbox
              key={user.id}
              user={user}
              checked={selectedSet.has(user.id)}
              onChange={toggleUser}
            />
          ))}
        </div>
      </section>

      <div className="sr-user-filter-groups">
        {groups.map((group) => {
          const groupUserIds = group.users.map((user) => user.id)
          const isGroupChecked = groupUserIds.length > 0 && groupUserIds.every((userId) => selectedSet.has(userId))

          return (
            <section key={group.key} className="sr-user-filter-group-box">
              <div className="sr-user-filter-group-header">
                <label className="sr-user-filter-user-option sr-user-filter-user-option-strong">
                  <input type="checkbox" checked={isGroupChecked} onChange={() => toggleUsers(groupUserIds)} />
                  <span>{group.label}</span>
                </label>
                <small>{group.users.length} user{group.users.length === 1 ? '' : 's'}</small>
              </div>
              <div className="sr-user-filter-user-grid">
                {group.users.length > 0 ? (
                  group.users.map((user) => (
                    <UserCheckbox
                      key={`${group.key}-${user.id}`}
                      user={user}
                      checked={selectedSet.has(user.id)}
                      onChange={toggleUser}
                    />
                  ))
                ) : (
                  <p className="sr-user-filter-empty">No users in this group.</p>
                )}
              </div>
            </section>
          )
        })}
      </div>

      <div className="sr-user-filter-footer">
        <button type="button" className="sr-user-filter-apply" onClick={applyFilter}>
          Apply Filter
        </button>
      </div>
    </div>
  )
}

export { getSrUserIds }
export default SupportRequestUserFilterPanel
