import React, { useEffect, useMemo, useState } from 'react'
import { FaEdit } from 'react-icons/fa'
import Modal from './Modal'
import Button from './Button'
import { userApi } from '../../services/userApi'
import { getVisibleAccountStages } from '../../features/adminAccounts/config/accountStages'
import './AddRemarksModal.css'

const REMARK_CATEGORIES = [
  { value: 'feedback', label: 'FEEDBACK' },
  { value: 'general', label: 'GENERAL' },
  { value: 'call-log', label: 'CALL LOG' },
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
  'Proposal',
  'Payment Followup',
  'Other',
]

const REMINDER_PRIORITIES = ['High', 'Medium', 'Low']

const FOLLOWUP_TYPES = ['Call', 'Visit']

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

const ACCOUNT_STAGE_OPTIONS = getVisibleAccountStages().map((stage) => ({
  value: stage.key,
  label: stage.label,
}))

const getStageOption = (value) => {
  const normalizedValue = String(value || '').trim().toLowerCase()
  return ACCOUNT_STAGE_OPTIONS.find((option) => (
    option.value === value
    || option.label.trim().toLowerCase() === normalizedValue
    || option.value.replace(/_/g, ' ') === normalizedValue
  ))
}

const getStageDisplayValue = (value) => getStageOption(value)?.label || getDisplayValue(value)

const getAccountOwnerId = (accountData) => (
  accountData?.assignedUserId || accountData?.ownerId || accountData?.assigned_to || accountData?.assignedTo || ''
)

const getEditableAccountValue = (accountData, field) => {
  switch (field) {
    case 'accountName':
      return getAccountName(accountData)
    case 'accountNumber':
      return getAccountNumber(accountData)
    case 'industryType':
      return getDisplayValue(accountData?.industryType, accountData?.industry)
    case 'accountCategory':
      return getDisplayValue(accountData?.accountCategory, accountData?.accountType, accountData?.customerType)
    case 'accountSource':
      return getDisplayValue(accountData?.accountSource, accountData?.source, accountData?.dealSource)
    case 'status':
      return getDisplayValue(accountData?.status, accountData?.accountStatus, accountData?.dealStatus)
    case 'stage':
      return (
        getStageOption(accountData?.stage)?.value
        || getStageOption(accountData?.stageLabel)?.value
        || getDisplayValue(accountData?.stage, accountData?.stageLabel)
      )
    default:
      return 'Not Available'
  }
}

const getAccountInfoDisplayValue = (accountData, field, drafts = {}) => {
  const draftValue = drafts[field.key]
  if (field.key === 'stage') {
    return draftValue ? getStageDisplayValue(draftValue) : getDisplayValue(accountData?.stageLabel, getStageDisplayValue(accountData?.stage))
  }

  return draftValue ?? getEditableAccountValue(accountData, field.key)
}

const AddRemarksModal = ({ isOpen, onClose, accountData, dealData, onSave, onSaveAccountField, isLoading = false }) => {
  const targetEntity = accountData || dealData
  const [category, setCategory] = useState('call-log')
  const [content, setContent] = useState('')
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('09:30')
  const [hasReminder, setHasReminder] = useState(false)
  const [reminderDate, setReminderDate] = useState('')
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderAction, setReminderAction] = useState('Call')
  const [reminderPriority, setReminderPriority] = useState('Medium')
  const [followupType, setFollowupType] = useState('Call')
  const [reminderStatus] = useState('Pending')
  const [assignedTo, setAssignedTo] = useState('owner')
  const [otherUserId, setOtherUserId] = useState('')
  const [reminderNote, setReminderNote] = useState('')
  const [assignmentMode, setAssignmentMode] = useState('user')
  const [selectedAssignmentUserIds, setSelectedAssignmentUserIds] = useState([])
  const [selectedAssignmentTypes, setSelectedAssignmentTypes] = useState([])
  const [selectedAssignmentGroups, setSelectedAssignmentGroups] = useState([])
  const [availableUsers, setAvailableUsers] = useState([])
  const [editingInfoField, setEditingInfoField] = useState('')
  const [infoDrafts, setInfoDrafts] = useState({})
  const [isSavingInfoField, setIsSavingInfoField] = useState(false)
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

  const accountInfoFields = [
    { key: 'accountName', label: 'Account Name:' },
    { key: 'accountNumber', label: 'Account No.:' },
    { key: 'industryType', label: 'Industry:' },
    { key: 'accountCategory', label: 'Account Type:' },
    { key: 'accountSource', label: 'Source:' },
    { key: 'status', label: 'Status:' },
    { key: 'stage', label: 'Stage:', options: ACCOUNT_STAGE_OPTIONS },
  ]

  useEffect(() => {
    if (!isOpen) return undefined

    let isMounted = true
    userApi.listDirectory()
      .then((users) => {
        if (!isMounted) return
        setAvailableUsers(Array.isArray(users) ? users : [])
      })
      .catch(() => {
        if (isMounted) setAvailableUsers([])
      })

    return () => {
      isMounted = false
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    setInfoDrafts(accountInfoFields.reduce((drafts, field) => ({
      ...drafts,
      [field.key]: getEditableAccountValue(accountData, field.key),
    }), {}))
    setEditingInfoField('')
  }, [accountData, isOpen])

  useEffect(() => {
    if (isOpen && !initialSelectDone && allUserIds.length > 0) {
      setSelectedAssignmentUserIds(allUserIds)
      setInitialSelectDone(true)
    } else if (!isOpen) {
      setInitialSelectDone(false)
    }
  }, [allUserIds, isOpen, initialSelectDone])

  useEffect(() => {
    if (!isOpen) return

    if (category === 'general') {
      setHasReminder(true)
      if (allUserIds.length > 0) {
        setSelectedAssignmentUserIds(allUserIds)
      }
    } else {
      setHasReminder(false)
    }
  }, [allUserIds, category, isOpen])

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

    if (category === 'general' && expandedAssignmentUserIds.length === 0) {
      alert('Please select at least one assignment user, type, or group')
      return
    }

    const remarkData = {
      accountId: accountData?.id || null,
      dealId: dealData?.id || null,
      relatedEntityId: String(dealData?.id || accountData?.id || ''),
      relatedEntityType: dealData ? 'deal' : 'account',
      category,
      content,
      startTime: category === 'call-log' ? startTime : null,
      endTime: category === 'call-log' ? endTime : null,
      remarkDate: new Date().toISOString().split('T')[0],
      callLogTime: startTime,
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
      } : null
    }

    onSave(remarkData)
    resetForm()
  }

  const resetForm = () => {
    setCategory('call-log')
    setContent('')
    setStartTime('09:00')
    setEndTime('09:30')
    setHasReminder(false)
    setReminderDate('')
    setReminderTime('09:00')
    setReminderAction('Call')
    setReminderPriority('Medium')
    setFollowupType('Call')
    setAssignedTo('owner')
    setOtherUserId('')
    setReminderNote('')
    setAssignmentMode('user')
    setSelectedAssignmentUserIds(allUserIds)
    setSelectedAssignmentTypes([])
    setSelectedAssignmentGroups([])
    setEditingInfoField('')
    setIsSavingInfoField(false)
  }

  const handleStartInfoEdit = (fieldKey) => {
    setInfoDrafts((currentValue) => ({
      ...currentValue,
      [fieldKey]: currentValue[fieldKey] ?? getEditableAccountValue(accountData, fieldKey),
    }))
    setEditingInfoField(fieldKey)
  }

  const handleSaveInfoField = async (fieldKey) => {
    if (!fieldKey) return

    const nextValue = String(infoDrafts[fieldKey] || '').trim()
    const previousValue = getEditableAccountValue(accountData, fieldKey)
    if (nextValue === String(previousValue || '').trim()) {
      setEditingInfoField('')
      return
    }

    setIsSavingInfoField(true)
    try {
      if (onSaveAccountField) {
        await onSaveAccountField(fieldKey, nextValue)
      }
      setInfoDrafts((currentValue) => ({ ...currentValue, [fieldKey]: nextValue }))
      setEditingInfoField('')
    } catch (error) {
      setInfoDrafts((currentValue) => ({ ...currentValue, [fieldKey]: nextValue }))
    } finally {
      setIsSavingInfoField(false)
    }
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
        <div className="remark-top-grid">
          <div className="remark-section remark-section--account-info">
            <h3 className="section-title">Account Information</h3>
            <div className="account-info-display">
              {accountInfoFields.map((field) => {
                const isEditing = editingInfoField === field.key
                const displayValue = getAccountInfoDisplayValue(accountData, field, infoDrafts)

                return (
                  <div
                    key={field.key}
                    className={`info-item ${isEditing ? 'info-item--editing' : ''}`}
                    onDoubleClick={() => {
                      if (!isEditing && !isSavingInfoField) {
                        handleStartInfoEdit(field.key)
                      }
                    }}
                  >
                    <span className="label">{field.label}</span>
                    {isEditing && field.options ? (
                      <select
                        className="info-item-input info-item-select"
                        value={infoDrafts[field.key] || ''}
                        onChange={(event) => setInfoDrafts((currentValue) => ({
                          ...currentValue,
                          [field.key]: event.target.value,
                        }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleSaveInfoField(field.key)
                          }
                          if (event.key === 'Escape') {
                            setEditingInfoField('')
                          }
                        }}
                        disabled={isSavingInfoField}
                        autoFocus
                      >
                        <option value="">Select</option>
                        {field.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : isEditing ? (
                      <input
                        className="info-item-input"
                        value={infoDrafts[field.key] || ''}
                        onChange={(event) => setInfoDrafts((currentValue) => ({
                          ...currentValue,
                          [field.key]: event.target.value,
                        }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleSaveInfoField(field.key)
                          }
                          if (event.key === 'Escape') {
                            setEditingInfoField('')
                          }
                        }}
                        disabled={isSavingInfoField}
                        autoFocus
                      />
                    ) : (
                      <>
                        <span className="value">{displayValue}</span>
                        <button
                          type="button"
                          className="info-item-edit-button"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleStartInfoEdit(field.key)
                          }}
                          aria-label={`Edit ${field.label.replace(':', '')}`}
                        >
                          <FaEdit className="info-item-edit-icon" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="remark-section remark-section--category">
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
        </div>



        {/* Remark Content */}
        <div className={`remark-section${category === 'feedback' ? ' remark-section--compact-feedback' : ''}`}>
          <label className="section-title">{category === 'feedback' ? 'Feedback *' : 'Remark Details *'}</label>
          <textarea
            className="remark-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={category === 'feedback' ? 'Add feedback here...' : 'Add remark here...'}
            rows={category === 'feedback' ? 4 : 6}
            required
          />
        </div>

        {/* Call Log Duration Picker */}
        {category === 'call-log' && (
          <div className="remark-section followup-subsection" style={{ marginTop: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600, color: '#334155' }}>Call Log Duration</h4>
            <div className="followup-time-buttons" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
              {FOLLOW_UP_TIMES.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`time-btn ${startTime === time ? 'active' : ''}`}
                  onClick={() => setStartTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <div className="custom-time-input">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>Start Time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="time-picker"
                />
              </div>
              <div className="custom-time-input">
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>End Time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="time-picker"
                />
              </div>
            </div>
          </div>
        )}

        {/* Follow-up Section */}
        {category === 'general' ? (
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

              <div className="followup-grid-row followup-grid-row--priority-only">
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
            </>
          )}
        </div>
        ) : null}

        {/* Form Actions */}
        <div className="form-actions">
          <Button type="submit" variant="primary" className="btn-red-theme" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Add'}
          </Button>
          <Button type="button" variant="outline" className="btn-red-theme" onClick={() => {
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
