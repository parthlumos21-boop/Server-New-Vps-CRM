import React, { useEffect, useMemo, useState } from 'react'
import Button from '../common/Button'
import Modal from '../common/Modal'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { messageService } from '../../services/messageService'
import './AdminMessagesModal.css'

const initialFormState = {
  targetMode: 'users',
  selectedUserIds: [],
  selectedGroupIds: [],
  body: '',
}

const AdminMessagesModal = ({ isOpen, onClose, onMessageSent }) => {
  const { user } = useAuth()
  const { addNotification, sendMessage } = useData()
  const [availableUsers, setAvailableUsers] = useState([])
  const [formState, setFormState] = useState(initialFormState)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    setAvailableUsers(messageService.getRecipientUsers(user))
    setFormState(initialFormState)
    setError('')
    setSubmitting(false)
  }, [isOpen, user])

  const userGroups = useMemo(() => messageService.getUserGroups(availableUsers), [availableUsers])
  const allUsersSelected = availableUsers.length > 0 && formState.selectedUserIds.length === availableUsers.length

  const toggleUserSelection = (userId) => {
    setFormState((current) => ({
      ...current,
      selectedUserIds: current.selectedUserIds.includes(userId)
        ? current.selectedUserIds.filter((id) => id !== userId)
        : [...current.selectedUserIds, userId],
    }))
  }

  const toggleGroupSelection = (groupId) => {
    setFormState((current) => ({
      ...current,
      selectedGroupIds: current.selectedGroupIds.includes(groupId)
        ? current.selectedGroupIds.filter((id) => id !== groupId)
        : [...current.selectedGroupIds, groupId],
    }))
  }

  const handleCheckAllUsers = () => {
    setFormState((current) => ({
      ...current,
      selectedUserIds: allUsersSelected ? [] : availableUsers.map((entry) => entry.id),
    }))
  }

  const handleTargetModeChange = (targetMode) => {
    setFormState((current) => ({
      ...current,
      targetMode,
      selectedUserIds: [],
      selectedGroupIds: [],
    }))
    setError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await sendMessage({
      targetMode: formState.targetMode,
      selectedUserIds: formState.selectedUserIds,
      selectedGroupIds: formState.selectedGroupIds,
      body: formState.body,
    })

    if (!result.success) {
      setError(result.message)
      setSubmitting(false)
      return
    }

    const recipientCount = Array.isArray(result.data) ? result.data.length : 0
    addNotification(
      'success',
      'Message sent',
      `Message sent to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}.`
    )
    onMessageSent?.(result.data)
    setSubmitting(false)
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={user?.role === 'admin' ? 'Send Message' : 'Message Admin'}
      size="large"
    >
      <form className="admin-messages-form" onSubmit={handleSubmit}>
        <div className="admin-messages-target-row">
          <span className="admin-messages-target-label">To:</span>

          <label className="admin-messages-radio-option">
            <input
              type="radio"
              name="message-target-mode"
              checked={formState.targetMode === 'users'}
              onChange={() => handleTargetModeChange('users')}
            />
            <span>Users</span>
          </label>

          <label className="admin-messages-radio-option">
            <input
              type="radio"
              name="message-target-mode"
              checked={formState.targetMode === 'groups'}
              onChange={() => handleTargetModeChange('groups')}
            />
            <span>User Groups</span>
          </label>
        </div>

        <div className="admin-messages-recipient-box">
          {formState.targetMode === 'users' ? (
            <>
              <label className="admin-messages-check-all">
                <input
                  type="checkbox"
                  checked={allUsersSelected}
                  onChange={handleCheckAllUsers}
                />
                <span>Check All</span>
              </label>

              <div className="admin-messages-user-grid">
                {availableUsers.map((entry) => (
                  <label key={entry.id} className="admin-messages-user-option">
                    <input
                      type="checkbox"
                      checked={formState.selectedUserIds.includes(entry.id)}
                      onChange={() => toggleUserSelection(entry.id)}
                    />
                    <span>{entry.name}</span>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <div className="admin-messages-group-grid">
              {userGroups.map((group) => (
                <label key={group.id} className="admin-messages-group-option">
                  <input
                    type="checkbox"
                    checked={formState.selectedGroupIds.includes(group.id)}
                    onChange={() => toggleGroupSelection(group.id)}
                  />
                  <div>
                    <div className="admin-messages-group-name">{group.name}</div>
                    <div className="admin-messages-group-count">
                      {group.recipients.length} member{group.recipients.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="admin-messages-input-block">
          <textarea
            className="admin-messages-textarea"
            placeholder="Add message here..."
            value={formState.body}
            onChange={(event) => setFormState((current) => ({ ...current, body: event.target.value }))}
            rows={5}
            disabled={submitting}
          />
        </div>

        {error && (
          <div className="admin-messages-error">
            {error}
          </div>
        )}

        <div className="admin-messages-actions">
          <Button type="button" variant="danger" size="small" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="success" size="small" disabled={submitting}>
            {submitting ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default AdminMessagesModal
