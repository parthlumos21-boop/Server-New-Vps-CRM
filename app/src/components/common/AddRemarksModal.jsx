import React, { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'
import Button from './Button'
import { authService } from '../../services/authService'
import './AddRemarksModal.css'

const REMARK_CATEGORIES = [
  { value: 'feedback', label: 'FEEDBACK' },
  { value: 'general', label: 'GENERAL' },
  { value: 'call_log', label: 'Call Log' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'Whatsapp' }
]

const FOLLOW_UP_TIMES = [
  '09:00', '10:00', '11:00', '12:00', '13:00',
  '14:00', '15:00', '16:00', '17:00'
]

const REMINDER_ACTIONS = [
  'Call',
  'Meeting',
  'Site Visit',
  'Follow Up',
  'Demo',
  'WhatsApp',
  'Email',
  'Proposal',
  'Payment Followup',
  'Other',
]

const REMINDER_PRIORITIES = ['High', 'Medium', 'Low']

const FOLLOWUP_TYPES = ['Call', 'Visit', 'Email', 'WhatsApp']

const ASSIGNMENT_MODES = [
  { key: 'user', label: 'User Wise' },
  { key: 'type', label: 'User Type Wise' },
  { key: 'group', label: 'User Group Wise' },
]

const normalizeLabel = (value) => String(value || '').trim()

const formatRoleLabel = (role) => {
  const normalizedRole = normalizeLabel(role).toLowerCase()
  if (normalizedRole === 'admin') return 'Admin'
  if (normalizedRole === 'user') return 'Sales Executive'
  return normalizeLabel(role) || 'User'
}

const getDerivedUserType = (user) => {
  const explicitType = normalizeLabel(user.userType || user.type || user.roleName)
  if (explicitType) return explicitType

  const searchable = `${user.name || ''} ${user.username || ''} ${user.email || ''}`.toLowerCase()
  if (searchable.includes('support')) return 'Support Executive'
  if (searchable.includes('field')) return 'Field Staff'
  return formatRoleLabel(user.role)
}

const getDerivedUserGroup = (user) => {
  const explicitGroup = normalizeLabel(user.userGroup || user.group || user.groupName || user.department)
  if (explicitGroup) return explicitGroup

  const userType = getDerivedUserType(user).toLowerCase()
  if (userType.includes('support') || userType.includes('field')) return 'Field Staff'
  if (String(user.role || '').toLowerCase() === 'admin') return 'Management'
  return 'Back Office'
}

const getDisplayUserName = (user) => user.name || user.username || user.email || `User ${user.id}`

const getUniqueLabels = (items) => Array.from(new Set(items.map(normalizeLabel).filter(Boolean)))

const getAccountName = (accountData) => (
  accountData?.name || accountData?.accountName || accountData?.customerName || 'N/A'
)

const getAccountNumber = (accountData) => (
  accountData?.accountNumber || accountData?.account_number || accountData?.id || 'N/A'
)

const getDisplayValue = (...values) => {
  const value = values.find((entry) => String(entry || '').trim())
  return String(value || 'Not Available').trim()
}

const getAccountOwnerId = (accountData) => (
  accountData?.assignedUserId || accountData?.ownerId || accountData?.assigned_to || accountData?.assignedTo || ''
)

const AddRemarksModal = ({ isOpen, onClose, accountData, onSave, isLoading = false }) => {
  const [category, setCategory] = useState('general')
  const [content, setContent] = useState('')
  const [hasReminder, setHasReminder] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderAction, setReminderAction] = useState('Call')
  const [reminderPriority, setReminderPriority] = useState('Medium')
  const [followupType, setFollowupType] = useState('Call')
  const [reminderStatus, setReminderStatus] = useState('Pending')
  const [assignedTo, setAssignedTo] = useState('owner')
  const [otherUserId, setOtherUserId] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [closeOldReminders, setCloseOldReminders] = useState(false)
  const [assignmentMode, setAssignmentMode] = useState('user')
  const [selectedAssignmentUserIds, setSelectedAssignmentUserIds] = useState([])
  const [selectedAssignmentTypes, setSelectedAssignmentTypes] = useState([])
  const [selectedAssignmentGroups, setSelectedAssignmentGroups] = useState([])
  const availableUsers = useMemo(() => authService.getAvailableUsers(), [isOpen])
  const assignmentUsers = useMemo(() => (
    availableUsers
      .filter((user) => user.id)
      .map((user) => ({
        ...user,
        id: String(user.id),
        assignmentType: getDerivedUserType(user),
        assignmentGroup: getDerivedUserGroup(user),
      }))
      .sort((left, right) => getDisplayUserName(left).localeCompare(getDisplayUserName(right)))
  ), [availableUsers])
  const assignmentUserTypes = useMemo(() => getUniqueLabels(assignmentUsers.map((user) => user.assignmentType)), [assignmentUsers])
  const assignmentUserGroups = useMemo(() => getUniqueLabels(assignmentUsers.map((user) => user.assignmentGroup)), [assignmentUsers])
  const selectedAssignmentUserSet = useMemo(() => new Set(selectedAssignmentUserIds), [selectedAssignmentUserIds])
  const selectedTypeSet = useMemo(() => new Set(selectedAssignmentTypes), [selectedAssignmentTypes])
  const selectedGroupSet = useMemo(() => new Set(selectedAssignmentGroups), [selectedAssignmentGroups])
  const allUserIds = useMemo(() => assignmentUsers.map((user) => user.id), [assignmentUsers])
  const allUsersSelected = allUserIds.length > 0 && allUserIds.every((userId) => selectedAssignmentUserSet.has(userId))
  const ownerId = getAccountOwnerId(accountData)
  const fallbackAssignedUser = availableUsers[0]?.id || ownerId || ''
  const selectedAssignedUser = assignedTo === 'owner' ? ownerId || fallbackAssignedUser : otherUserId

  const [initialSelectDone, setInitialSelectDone] = useState(false)

  useEffect(() => {
    if (isOpen && !initialSelectDone && allUserIds.length > 0) {
      setSelectedAssignmentUserIds(allUserIds)
      setInitialSelectDone(true)
    } else if (!isOpen) {
      setInitialSelectDone(false)
    }
  }, [allUserIds, isOpen, initialSelectDone])

  const getExpandedAssignmentUserIds = () => {
    if (assignmentMode === 'type') {
      return assignmentUsers
        .filter((user) => selectedTypeSet.has(user.assignmentType))
        .map((user) => user.id)
    }

    if (assignmentMode === 'group') {
      return assignmentUsers
        .filter((user) => selectedGroupSet.has(user.assignmentGroup))
        .map((user) => user.id)
    }

    return selectedAssignmentUserIds
  }

  const getExpandedAssignmentUsers = (userIds = []) => {
    const selectedIds = new Set(userIds.map((userId) => String(userId)))
    return assignmentUsers
      .filter((user) => selectedIds.has(String(user.id)))
      .map((user) => ({
        id: String(user.id),
        name: getDisplayUserName(user),
        ownerCode: user.ownerCode || '',
        username: user.username || '',
        email: user.email || '',
      }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    if (!content.trim()) {
      alert('Please enter remark content')
      return
    }

    if (hasReminder && !reminderDate) {
      alert('Please select a follow-up date')
      return
    }

    if (hasReminder && !selectedAssignedUser) {
      alert('Please select a user for the reminder')
      return
    }

    if (hasReminder && !reminderAction) {
      alert('Please select a reminder action')
      return
    }

    const expandedAssignmentUserIds = getExpandedAssignmentUserIds()
    const expandedAssignmentUsers = getExpandedAssignmentUsers(expandedAssignmentUserIds)

    if (expandedAssignmentUserIds.length === 0) {
      alert('Please select at least one assignment user, type, or group')
      return
    }

    const remarkData = {
      accountId: accountData?.id,
      category,
      content,
      assignment: {
        mode: assignmentMode,
        userIds: expandedAssignmentUserIds,
        userTypes: assignmentMode === 'type' ? selectedAssignmentTypes : [],
        userGroups: assignmentMode === 'group' ? selectedAssignmentGroups : [],
      },
      reminder: hasReminder ? {
        date: reminderDate,
        time: reminderTime,
        actionType: reminderAction,
        priority: reminderPriority,
        status: reminderStatus,
        followupType,
        assignedTo: selectedAssignedUser,
        assignedUserIds: expandedAssignmentUserIds,
        assignedUsers: expandedAssignmentUsers,
        note: reminderNote,
        closeOldReminders
      } : null
    }

    onSave(remarkData)
    resetForm()
  }

  const resetForm = () => {
    setCategory('general')
    setContent('')
    setHasReminder(false)
    setReminderDate('')
    setReminderTime('09:00')
    setReminderAction('Call')
    setReminderPriority('Medium')
    setFollowupType('Call')
    setReminderStatus('Pending')
    setAssignedTo('owner')
    setOtherUserId('')
    setReminderNote('')
    setCloseOldReminders(false)
    setAssignmentMode('user')
    setSelectedAssignmentUserIds(allUserIds)
    setSelectedAssignmentTypes([])
    setSelectedAssignmentGroups([])
  }

  const getFollowUpDate = (daysOffset) => {
    const date = new Date()
    date.setDate(date.getDate() + daysOffset)
    return date.toISOString().split('T')[0]
  }

  const ensureDefaultAssignments = () => {
    if (selectedAssignmentUserIds.length === 0 && allUserIds.length > 0) {
      setSelectedAssignmentUserIds(allUserIds)
    }
  }

  const toggleAssignmentMode = (modeKey) => {
    setAssignmentMode(modeKey)
    ensureDefaultAssignments()
  }

  const toggleAssignmentUser = (userId) => {
    setSelectedAssignmentUserIds((currentValue) => (
      currentValue.includes(userId)
        ? currentValue.filter((entry) => entry !== userId)
        : [...currentValue, userId]
    ))
  }

  const toggleAllAssignmentUsers = () => {
    setSelectedAssignmentUserIds(allUsersSelected ? [] : allUserIds)
  }

  const toggleLabelSelection = (label, setter) => {
    setter((currentValue) => (
      currentValue.includes(label)
        ? currentValue.filter((entry) => entry !== label)
        : [...currentValue, label]
    ))
  }

  const renderUserGrid = (users) => (
    <div className="assignment-user-grid">
      {users.map((user) => (
        <label key={user.id} className="assignment-checkbox-option">
          <input
            type="checkbox"
            checked={selectedAssignmentUserSet.has(user.id)}
            onChange={() => toggleAssignmentUser(user.id)}
          />
          <span>{getDisplayUserName(user)}</span>
        </label>
      ))}
    </div>
  )

  const renderLabelGrid = (labels, selectedSet, setter) => (
    <div className="assignment-user-grid">
      {labels.map((label) => (
        <label key={label} className="assignment-checkbox-option">
          <input
            type="checkbox"
            checked={selectedSet.has(label)}
            onChange={() => toggleLabelSelection(label, setter)}
          />
          <span>{label}</span>
        </label>
      ))}
    </div>
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        resetForm()
        onClose()
      }}
      title="Add Remark"
      size="large"
    >
      <form onSubmit={handleSubmit} className="add-remarks-form">
        {/* Account Information */}
        <div className="remark-section">
          <h3 className="section-title">Account Information</h3>
          <div className="account-info-display">
            <div className="info-item">
              <span className="label">Account Name:</span>
              <span className="value">{getAccountName(accountData)}</span>
            </div>
            <div className="info-item">
              <span className="label">Account No.:</span>
              <span className="value">{getAccountNumber(accountData)}</span>
            </div>
            <div className="info-item">
              <span className="label">Industry:</span>
              <span className="value">{getDisplayValue(accountData?.industryType, accountData?.industry)}</span>
            </div>
            <div className="info-item">
              <span className="label">Account Type:</span>
              <span className="value">{getDisplayValue(accountData?.accountCategory, accountData?.accountType, accountData?.customerType)}</span>
            </div>
            <div className="info-item">
              <span className="label">Source:</span>
              <span className="value">{getDisplayValue(accountData?.accountSource, accountData?.source, accountData?.dealSource)}</span>
            </div>
            <div className="info-item">
              <span className="label">Status:</span>
              <span className="value">{getDisplayValue(accountData?.status, accountData?.accountStatus, accountData?.dealStatus)}</span>
            </div>
            <div className="info-item">
              <span className="label">Stage:</span>
              <span className="value">{getDisplayValue(accountData?.stageLabel, accountData?.stage)}</span>
            </div>
          </div>
        </div>

        {/* Remark Categories */}
        <div className="remark-section">
          <h3 className="section-title">Remark Category</h3>
          <div className="category-tabs">
            {REMARK_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                type="button"
                className={`category-tab ${category === cat.value ? 'active' : ''}`}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assignment Section */}
        <div className="remark-section">
          <h3 className="section-title">Assignment</h3>
          <div className="assignment-panel">
            <div className="assignment-mode-list">
              {ASSIGNMENT_MODES.map((mode) => {
                const isActive = assignmentMode === mode.key

                return (
                  <div key={mode.key} className="assignment-mode-row">
                    <span>{mode.label}</span>
                    <div className="assignment-toggle" role="group" aria-label={mode.label}>
                      <button
                        type="button"
                        className={isActive ? 'active' : ''}
                        onClick={() => toggleAssignmentMode(mode.key)}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        className={!isActive ? 'active' : ''}
                        onClick={() => {
                          if (isActive) toggleAssignmentMode('user')
                        }}
                      >
                        NO
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>

            {assignmentMode === 'user' ? (
              <>
                <label className="assignment-checkbox-option assignment-checkbox-option-strong">
                  <input type="checkbox" checked={allUsersSelected} onChange={toggleAllAssignmentUsers} />
                  <span>Select All</span>
                </label>

                {renderUserGrid(assignmentUsers)}

                <div className="assignment-group-grid">
                  {['Back Office', 'Field Staff'].map((groupLabel) => {
                    const groupUsers = assignmentUsers.filter((user) => user.assignmentGroup === groupLabel)

                    return (
                      <section key={groupLabel} className="assignment-group-box">
                        <h4>{groupLabel}</h4>
                        {groupUsers.length > 0 ? renderUserGrid(groupUsers) : (
                          <p className="assignment-empty">No users in this group.</p>
                        )}
                      </section>
                    )
                  })}
                </div>
              </>
            ) : null}

            {assignmentMode === 'type' ? (
              <section className="assignment-group-box assignment-group-box-wide">
                <h4>User Types</h4>
                {renderLabelGrid(assignmentUserTypes, selectedTypeSet, setSelectedAssignmentTypes)}
              </section>
            ) : null}

            {assignmentMode === 'group' ? (
              <section className="assignment-group-box assignment-group-box-wide">
                <h4>User Groups</h4>
                {renderLabelGrid(assignmentUserGroups, selectedGroupSet, setSelectedAssignmentGroups)}
              </section>
            ) : null}
          </div>
        </div>

        {/* Remark Content */}
        <div className="remark-section">
          <label className="section-title">Remark Details *</label>
          <textarea
            className="remark-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add remark here..."
            rows={6}
            required
          />
        </div>

        {/* Follow-up Section */}
        <div className="remark-section">
          <div className="followup-header">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={hasReminder}
                onChange={(e) => setHasReminder(e.target.checked)}
              />
              <span>Add Reminder/Followup</span>
            </label>
          </div>

          {hasReminder && (
            <>
              {/* Follow-up Date Selection */}
              <div className="followup-subsection">
                <h4>Follow-up Date</h4>
                <div className="followup-quick-buttons">
                  <button
                    type="button"
                    className={`quick-date-btn ${reminderDate === getFollowUpDate(0) ? 'active' : ''}`}
                    onClick={() => setReminderDate(getFollowUpDate(0))}
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    className={`quick-date-btn ${reminderDate === getFollowUpDate(1) ? 'active' : ''}`}
                    onClick={() => setReminderDate(getFollowUpDate(1))}
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    className={`quick-date-btn ${reminderDate === getFollowUpDate(7) ? 'active' : ''}`}
                    onClick={() => setReminderDate(getFollowUpDate(7))}
                  >
                    Next Week
                  </button>
                </div>
                <div className="custom-date-input">
                  <label>Other</label>
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="date-picker"
                  />
                </div>
              </div>

              {/* Follow-up Time Selection */}
              <div className="followup-subsection">
                <h4>Follow-up Time</h4>
                <div className="followup-time-buttons">
                  {FOLLOW_UP_TIMES.map((time) => (
                    <button
                      key={time}
                      type="button"
                      className={`time-btn ${reminderTime === time ? 'active' : ''}`}
                      onClick={() => setReminderTime(time)}
                    >
                      {time}
                    </button>
                  ))}
                </div>
                <div className="custom-time-input">
                  <label>Other</label>
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    className="time-picker"
                  />
                </div>
              </div>

              {/* Reminder Action */}
              <div className="followup-subsection">
                <h4>Reminder Action</h4>
                <div className="reminder-action-buttons">
                  {REMINDER_ACTIONS.map((action) => (
                    <button
                      key={action}
                      type="button"
                      className={`reminder-action-btn ${reminderAction === action ? 'active' : ''}`}
                      onClick={() => setReminderAction(action)}
                    >
                      {action}
                    </button>
                  ))}
                </div>
              </div>

              <div className="followup-grid-row">
                {/* Priority Selection */}
                <div className="followup-subsection">
                  <h4>Priority</h4>
                  <div className="reminder-choice-row">
                    {REMINDER_PRIORITIES.map((priority) => (
                      <label key={priority} className="radio-label reminder-radio-card">
                        <input
                          type="radio"
                          name="reminderPriority"
                          value={priority}
                          checked={reminderPriority === priority}
                          onChange={(e) => setReminderPriority(e.target.value)}
                        />
                        <span>{priority}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Reminder Status */}
                <div className="followup-subsection">
                  <h4>Reminder Status</h4>
                  <div className="reminder-status-pill">{reminderStatus}</div>
                </div>
              </div>

              {/* Followup Type */}
              <div className="followup-subsection">
                <h4>Followup Type</h4>
                <div className="reminder-action-buttons reminder-type-buttons">
                  {FOLLOWUP_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      className={`reminder-action-btn ${followupType === type ? 'active' : ''}`}
                      onClick={() => setFollowupType(type)}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              {/* Assign Reminder To */}
              <div className="followup-subsection">
                <h4>Assign Reminder To</h4>
                <div className="assign-options">
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="owner"
                      checked={assignedTo === 'owner'}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    />
                    <span>Account Owner</span>
                  </label>
                  <label className="radio-label">
                    <input
                      type="radio"
                      name="assignedTo"
                      value="other"
                      checked={assignedTo === 'other'}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    />
                    <span>Other User</span>
                  </label>
                </div>
                {assignedTo === 'other' ? (
                  <select
                    className="assign-user-select"
                    value={otherUserId}
                    onChange={(e) => setOtherUserId(e.target.value)}
                  >
                    <option value="">Select user</option>
                    {availableUsers.map((availableUser) => (
                      <option key={availableUser.id} value={availableUser.id}>
                        {availableUser.name || availableUser.username || availableUser.email}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>

              {/* Reminder Note */}
              <div className="followup-subsection">
                <label>Reminder Note</label>
                <textarea
                  className="reminder-textarea"
                  value={reminderNote}
                  onChange={(e) => setReminderNote(e.target.value)}
                  placeholder="Add reminder note here..."
                  rows={3}
                />
              </div>

              {/* Close Old Reminders */}
              <div className="followup-subsection">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={closeOldReminders}
                    onChange={(e) => setCloseOldReminders(e.target.checked)}
                  />
                  <span>Close all older Reminders</span>
                </label>
              </div>
            </>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <Button type="submit" variant="primary" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Add'}
          </Button>
          <Button type="button" variant="outline" onClick={() => {
            resetForm()
            onClose()
          }}>
            Close
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AddRemarksModal
