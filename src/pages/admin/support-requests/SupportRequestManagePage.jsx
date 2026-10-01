import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { authService } from '../../../services/authService'
import {
  buildSupportRequestTypeOptions,
  formatDateTime,
  formatSupportRequestType,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestAdmin.css'
import {
  FaBell,
  FaBook,
  FaCheck,
  FaLayerGroup,
  FaPuzzlePiece,
  FaTrash,
  FaUserTie,
} from 'react-icons/fa'

const statusOptions = ['open', 'in-progress', 'on-hold', 'resolved', 'closed']
const priorityOptions = ['low', 'medium', 'high', 'critical']

const SupportRequestManageActionMenu = ({
  supportRequest,
  basePath,
  onCloseSr,
  onDeleteSr,
  busy = false,
}) => {
  const navigate = useNavigate()
  const menuRef = useRef(null)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return undefined

    const handleDocumentClick = (event) => {
      if (!menuRef.current?.contains(event.target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [open])

  const navigateAction = (actionKey) => {
    setOpen(false)
    navigate(`${basePath}/actions/${actionKey}/${supportRequest.id}`)
  }

  const handleDirectAction = (handler) => {
    setOpen(false)
    handler()
  }

  const menuItems = [
    { key: 'add-reminder', label: 'Add Reminder', icon: FaBell, onClick: () => navigateAction('add-reminder') },
    { key: 'close-sr', label: 'Close SR', icon: FaCheck, onClick: () => handleDirectAction(onCloseSr), disabled: supportRequest.status === 'closed' },
    { key: 'add-document', label: 'Add Document', icon: FaBook, onClick: () => navigateAction('add-document') },
    { key: 'change-status', label: 'Change Status', icon: FaPuzzlePiece, onClick: () => navigateAction('change-status') },
    { key: 'change-type', label: 'Change Type', icon: FaLayerGroup, onClick: () => navigateAction('change-type') },
    { key: 'reassign-sr', label: 'Re-Assign SR', icon: FaUserTie, onClick: () => navigateAction('reassign-sr') },
    { key: 'delete-sr', label: 'Delete SR', icon: FaTrash, onClick: () => handleDirectAction(onDeleteSr), danger: true },
  ]

  return (
    <div ref={menuRef} className="support-request-manage-action-menu">
      <button
        type="button"
        className="support-request-view-action-trigger"
        onClick={() => setOpen((current) => !current)}
        disabled={busy}
      >
        <span>Actions</span>
        <span className="support-request-view-action-caret">v</span>
      </button>

      {open ? (
        <div className="support-request-manage-action-dropdown">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.key}
                type="button"
                className={item.danger ? 'support-request-manage-action-danger' : ''}
                onClick={item.onClick}
                disabled={item.disabled || busy}
              >
                <Icon />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

const SupportRequestManagePage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { supportRequestId } = useParams()
  const { user } = useAuth()
  const { supportRequests, updateSupportRequest, deleteSupportRequest, addNotification } = useData()
  const basePath = getSupportRequestBasePath(location.pathname)

  const supportRequest = useMemo(
    () => supportRequests.find((entry) => entry.id === supportRequestId) || null,
    [supportRequestId, supportRequests]
  )

  const ownerOptions = useMemo(
    () => authService
      .getAvailableUsers()
      .filter((entry) => entry.name !== 'System Administrator'),
    []
  )

  const [formState, setFormState] = useState(() => ({
    title: supportRequest?.title || '',
    requestType: supportRequest?.requestType || '',
    priority: supportRequest?.priority || 'medium',
    ownerId: supportRequest?.ownerId || '',
    status: supportRequest?.status || 'open',
    srDate: supportRequest?.srDate || '',
    city: supportRequest?.city || '',
    contactPerson: supportRequest?.contactPerson || '',
    notes: supportRequest?.notes || '',
    onHoldReason: supportRequest?.onHoldReason || '',
    postponedReason: supportRequest?.postponedReason || '',
    reopenedOn: supportRequest?.reopenedOn || '',
  }))
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  if (!supportRequest) {
    return (
      <div className="support-request-admin-page">
        <section className="support-request-admin-card">
          <h1>Support request not found</h1>
          <p>The selected support request could not be located.</p>
          <div className="support-request-admin-actions">
            <Button onClick={() => navigate(`${basePath}/list`)}>Back To SR List</Button>
          </div>
        </section>
      </div>
    )
  }

  const handleChange = (key, value) => {
    setFormState((currentState) => ({
      ...currentState,
      [key]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!formState.title.trim()) {
      setErrorMessage('Title is required.')
      return
    }

    if (!formState.requestType) {
      setErrorMessage('SR Type / Complaint Type is required.')
      return
    }

    if (!formState.ownerId) {
      setErrorMessage('Owner is required.')
      return
    }

    setSaving(true)

    const selectedOwner = ownerOptions.find((entry) => entry.id === formState.ownerId)
    const nextUpdates = {
      title: formState.title.trim(),
      requestType: formState.requestType,
      priority: formState.priority,
      ownerId: formState.ownerId,
      ownerName: selectedOwner?.name || '',
      status: formState.status,
      srDate: formState.srDate,
      city: formState.city.trim(),
      contactPerson: formState.contactPerson.trim(),
      notes: formState.notes,
      onHoldReason: formState.onHoldReason,
      postponedReason: formState.postponedReason,
      reopenedOn: formState.reopenedOn,
    }

    if (supportRequest.status !== 'closed' && formState.status === 'closed') {
      nextUpdates.closedOn = new Date().toISOString()
      nextUpdates.closedByName = user?.name || ''
    }

    if (supportRequest.status === 'closed' && formState.status !== 'closed' && !formState.reopenedOn) {
      nextUpdates.reopenedOn = new Date().toISOString().slice(0, 10)
    }

    const result = await updateSupportRequest(supportRequest.id, nextUpdates)
    setSaving(false)

    if (!result.success) {
      setErrorMessage(result.message || 'Unable to update support request.')
      return
    }

    addNotification('success', 'Support Request Updated', `${supportRequest.srNumber} was updated successfully.`)
    navigate(`${basePath}/list`)
  }

  const handleCloseSr = async () => {
    if (supportRequest.status === 'closed') {
      addNotification('info', 'Support Request Already Closed', `${supportRequest.srNumber} is already closed.`)
      return
    }

    setSaving(true)
    const result = await updateSupportRequest(supportRequest.id, {
      status: 'closed',
      closedOn: new Date().toISOString(),
      closedByName: user?.name || '',
    })
    setSaving(false)

    if (!result.success) {
      setErrorMessage(result.message || 'Unable to close support request.')
      return
    }

    setFormState((currentState) => ({ ...currentState, status: 'closed' }))
    addNotification('success', 'Support Request Closed', `${supportRequest.srNumber} was closed successfully.`)
  }

  const handleDeleteSr = async () => {
    const confirmed = window.confirm(`Delete ${supportRequest.srNumber}? This cannot be undone.`)
    if (!confirmed) return

    setSaving(true)
    const result = await deleteSupportRequest(supportRequest.id)
    setSaving(false)

    if (!result.success) {
      setErrorMessage(result.message || 'Unable to delete support request.')
      return
    }

    addNotification('success', 'Support Request Deleted', `${supportRequest.srNumber} was deleted successfully.`)
    navigate(`${basePath}/list`)
  }

  return (
    <div className="support-request-admin-page support-request-admin-page--landscape">
      <section className="support-request-admin-card support-request-admin-card--landscape support-request-manage-card">
        <div className="support-request-admin-header-row">
          <div>
            <p className="support-request-admin-eyebrow">Manage SR</p>
            <h1>{supportRequest.srNumber}</h1>
            <p className="support-request-admin-copy">Update the support request and track close ownership properly.</p>
          </div>

          <SupportRequestManageActionMenu
            supportRequest={supportRequest}
            basePath={basePath}
            onCloseSr={handleCloseSr}
            onDeleteSr={handleDeleteSr}
            busy={saving}
          />
        </div>

        <div className="support-request-admin-grid support-request-admin-grid-summary">
          <div><span>Customer</span><strong>{supportRequest.customerName || '-'}</strong></div>
          <div><span>Current SR Type / Complaint Type</span><strong>{formatSupportRequestType(supportRequest.requestType)}</strong></div>
          <div><span>Added By</span><strong>{supportRequest.addedByName || '-'}</strong></div>
          <div><span>Last Updated</span><strong>{formatDateTime(supportRequest.updatedAt)}</strong></div>
        </div>

        <form onSubmit={handleSubmit} className="support-request-admin-form support-request-manage-form">
          <div className="support-request-admin-form-grid support-request-admin-form-grid--landscape">
            <label>
              <span>Title</span>
              <input type="text" value={formState.title} onChange={(event) => handleChange('title', event.target.value)} />
            </label>
            <label>
              <span>SR Type / Complaint Type</span>
              <select value={formState.requestType} onChange={(event) => handleChange('requestType', event.target.value)}>
                <option value="">Select</option>
                {buildSupportRequestTypeOptions(formState.requestType).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Priority</span>
              <select value={formState.priority} onChange={(event) => handleChange('priority', event.target.value)}>
                {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Owner</span>
              <select value={formState.ownerId} onChange={(event) => handleChange('ownerId', event.target.value)}>
                <option value="">Select</option>
                {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
              </select>
            </label>
            <label>
              <span>Status</span>
              <select value={formState.status} onChange={(event) => handleChange('status', event.target.value)}>
                {statusOptions.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
            <label>
              <span>Service Date</span>
              <input type="date" value={formState.srDate} onChange={(event) => handleChange('srDate', event.target.value)} />
            </label>
            <label>
              <span>City</span>
              <input type="text" value={formState.city} onChange={(event) => handleChange('city', event.target.value)} />
            </label>
            <label>
              <span>Contact Person</span>
              <input type="text" value={formState.contactPerson} onChange={(event) => handleChange('contactPerson', event.target.value)} />
            </label>
            <label>
              <span>On Hold Reason</span>
              <textarea rows={3} value={formState.onHoldReason} onChange={(event) => handleChange('onHoldReason', event.target.value)} />
            </label>
            <label>
              <span>Postponed Reason</span>
              <textarea rows={3} value={formState.postponedReason} onChange={(event) => handleChange('postponedReason', event.target.value)} />
            </label>
            <label>
              <span>Re-Opened On</span>
              <input type="date" value={formState.reopenedOn} onChange={(event) => handleChange('reopenedOn', event.target.value)} />
            </label>
            <label className="support-request-admin-form-full">
              <span>Internal Notes</span>
              <textarea rows={4} value={formState.notes} onChange={(event) => handleChange('notes', event.target.value)} />
            </label>
          </div>

          {errorMessage ? <p className="support-request-admin-error">{errorMessage}</p> : null}

          <div className="support-request-admin-actions">
            <Button type="submit" loading={saving}>Save Changes</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}>View SR</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/list`)}>Cancel</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default SupportRequestManagePage
