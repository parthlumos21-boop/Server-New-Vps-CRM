import React, { useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { authService } from '../../../services/authService'
import {
  buildSupportRequestTypeOptions,
  formatDateTime,
  getSupportRequestBasePath,
} from './SupportRequestShared'
import './SupportRequestAdmin.css'

const actionConfig = {
  'add-note-remarks': {
    title: 'Add Note/Remarks',
    successTitle: 'Remark Added',
    successMessage: 'Remark saved successfully.',
  },
  'add-reminder': {
    title: 'Add Reminder',
    successTitle: 'Reminder Added',
    successMessage: 'Reminder saved successfully.',
  },
  'add-document': {
    title: 'Add Document',
    successTitle: 'Document Added',
    successMessage: 'Document saved successfully.',
  },
  'extend-time': {
    title: 'Extend Time',
    successTitle: 'Time Extended',
    successMessage: 'Support request time was extended successfully.',
  },
  'change-status': {
    title: 'Change Status',
    successTitle: 'Status Changed',
    successMessage: 'Support request status was updated successfully.',
  },
  'change-type': {
    title: 'Change Type',
    successTitle: 'Type Changed',
    successMessage: 'Support request type was updated successfully.',
  },
  'reassign-sr': {
    title: 'Re-Assign SR',
    successTitle: 'SR Re-Assigned',
    successMessage: 'Support request owner was updated successfully.',
  },
}

const reminderModes = ['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp', 'Follow Up']
const documentTypes = ['Service Report', 'Site Photo', 'Invoice', 'Drawing', 'Warranty', 'Other']
const statusOptions = ['open', 'in-progress', 'on-hold', 'resolved', 'closed']

const today = () => new Date().toISOString().slice(0, 10)

const SupportRequestActionPage = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { actionKey, supportRequestId } = useParams()
  const { user } = useAuth()
  const { supportRequests, updateSupportRequest, addNotification } = useData()
  const basePath = getSupportRequestBasePath(location.pathname)
  const config = actionConfig[actionKey] || actionConfig['add-note-remarks']

  const supportRequest = useMemo(
    () => supportRequests.find((entry) => entry.id === supportRequestId) || null,
    [supportRequestId, supportRequests]
  )

  const [remarkText, setRemarkText] = useState('')
  const [reminderDate, setReminderDate] = useState(today())
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderMode, setReminderMode] = useState(reminderModes[0])
  const [reminderNote, setReminderNote] = useState('')
  const [documentType, setDocumentType] = useState(documentTypes[0])
  const [documentName, setDocumentName] = useState('')
  const [documentNote, setDocumentNote] = useState('')
  const [extendedUntil, setExtendedUntil] = useState(supportRequest?.extendedUntil || supportRequest?.srDate || today())
  const [extendedTime, setExtendedTime] = useState(supportRequest?.extendedTime || '17:00')
  const [extendReason, setExtendReason] = useState('')
  const [nextStatus, setNextStatus] = useState(supportRequest?.status || 'open')
  const [statusNote, setStatusNote] = useState('')
  const [nextType, setNextType] = useState(supportRequest?.requestType || '')
  const [typeNote, setTypeNote] = useState('')
  const [nextOwnerId, setNextOwnerId] = useState(supportRequest?.ownerId || '')
  const [reassignNote, setReassignNote] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  const ownerOptions = useMemo(
    () => authService
      .getAvailableUsers()
      .filter((entry) => entry.name !== 'System Administrator'),
    []
  )

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

  const buildUpdates = () => {
    const timestamp = new Date().toISOString()
    const actorName = user?.name || 'System'

    if (actionKey === 'add-note-remarks') {
      const note = remarkText.trim()
      if (!note) {
        return { error: 'Note/remark is required.' }
      }

      const nextRemark = {
        id: `${Date.now()}`,
        note,
        addedByName: actorName,
        createdAt: timestamp,
      }

      const existingNotes = String(supportRequest.notes || '').trim()

      return {
        remarks: [...(supportRequest.remarks || []), nextRemark],
        notes: existingNotes ? `${existingNotes}\n${note}` : note,
      }
    }

    if (actionKey === 'add-reminder') {
      if (!reminderDate) {
        return { error: 'Reminder date is required.' }
      }

      const nextReminder = {
        id: `${Date.now()}`,
        date: reminderDate,
        time: reminderTime,
        mode: reminderMode,
        note: reminderNote.trim(),
        status: 'active',
        addedByName: actorName,
        createdAt: timestamp,
      }

      return {
        reminders: [...(supportRequest.reminders || []), nextReminder],
        reminderDate,
        reminderTime,
        reminderMode,
        reminderNote: reminderNote.trim(),
      }
    }

    if (actionKey === 'add-document') {
      const name = documentName.trim()
      if (!name) {
        return { error: 'Document name is required.' }
      }

      const nextDocument = {
        id: `${Date.now()}`,
        type: documentType,
        name,
        note: documentNote.trim(),
        addedByName: actorName,
        createdAt: timestamp,
      }

      return {
        documents: [...(supportRequest.documents || []), nextDocument],
        attachmentNames: [...(supportRequest.attachmentNames || []), name],
      }
    }

    if (actionKey === 'extend-time') {
      if (!extendedUntil) {
        return { error: 'Extended date is required.' }
      }

      const nextExtension = {
        id: `${Date.now()}`,
        date: extendedUntil,
        time: extendedTime,
        reason: extendReason.trim(),
        addedByName: actorName,
        createdAt: timestamp,
      }

      return {
        extendedUntil,
        extendedTime,
        extendReason: extendReason.trim(),
        extensions: [...(supportRequest.extensions || []), nextExtension],
      }
    }

    if (actionKey === 'change-status') {
      const updates = {
        status: nextStatus,
        statusNote: statusNote.trim(),
      }

      if (supportRequest.status !== 'closed' && nextStatus === 'closed') {
        updates.closedOn = timestamp
        updates.closedByName = actorName
      }

      if (supportRequest.status === 'closed' && nextStatus !== 'closed' && !supportRequest.reopenedOn) {
        updates.reopenedOn = today()
      }

      if (statusNote.trim()) {
        updates.remarks = [
          ...(supportRequest.remarks || []),
          {
            id: `${Date.now()}`,
            note: `Status changed to ${nextStatus}: ${statusNote.trim()}`,
            addedByName: actorName,
            createdAt: timestamp,
          },
        ]
      }

      return updates
    }

    if (actionKey === 'change-type') {
      if (!nextType) {
        return { error: 'SR Type / Complaint Type is required.' }
      }

      const updates = {
        requestType: nextType,
        typeChangeNote: typeNote.trim(),
      }

      if (typeNote.trim()) {
        updates.remarks = [
          ...(supportRequest.remarks || []),
          {
            id: `${Date.now()}`,
            note: `Type changed: ${typeNote.trim()}`,
            addedByName: actorName,
            createdAt: timestamp,
          },
        ]
      }

      return updates
    }

    if (actionKey === 'reassign-sr') {
      if (!nextOwnerId) {
        return { error: 'Owner is required.' }
      }

      const selectedOwner = ownerOptions.find((entry) => entry.id === nextOwnerId)
      const updates = {
        ownerId: nextOwnerId,
        ownerName: selectedOwner?.name || '',
        reassignNote: reassignNote.trim(),
      }

      if (reassignNote.trim()) {
        updates.remarks = [
          ...(supportRequest.remarks || []),
          {
            id: `${Date.now()}`,
            note: `SR re-assigned to ${selectedOwner?.name || 'selected owner'}: ${reassignNote.trim()}`,
            addedByName: actorName,
            createdAt: timestamp,
          },
        ]
      }

      return updates
    }

    return { error: 'Unsupported action.' }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const updates = buildUpdates()
    if (updates.error) {
      setErrorMessage(updates.error)
      return
    }

    setSaving(true)
    const result = await updateSupportRequest(supportRequest.id, updates)
    setSaving(false)

    if (!result.success) {
      setErrorMessage(result.message || 'Unable to save action.')
      return
    }

    addNotification('success', config.successTitle, `${supportRequest.srNumber}: ${config.successMessage}`)
    navigate(`${basePath}/details/${supportRequest.id}`)
  }

  const renderFields = () => {
    if (actionKey === 'add-reminder') {
      return (
        <>
          <label>
            <span>Reminder Date</span>
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
          </label>
          <label>
            <span>Reminder Time</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>
          <label>
            <span>Reminder Mode</span>
            <select value={reminderMode} onChange={(event) => setReminderMode(event.target.value)}>
              {reminderModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <label className="support-request-admin-form-full">
            <span>Reminder Note</span>
            <textarea rows={5} value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} />
          </label>
        </>
      )
    }

    if (actionKey === 'add-document') {
      return (
        <>
          <label>
            <span>Document Type</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span>Document Name</span>
            <input type="text" value={documentName} onChange={(event) => setDocumentName(event.target.value)} placeholder="Service-report.pdf" />
          </label>
          <label className="support-request-admin-form-full">
            <span>Document Note</span>
            <textarea rows={5} value={documentNote} onChange={(event) => setDocumentNote(event.target.value)} />
          </label>
        </>
      )
    }

    if (actionKey === 'extend-time') {
      return (
        <>
          <label>
            <span>Extended Date</span>
            <input type="date" value={extendedUntil} onChange={(event) => setExtendedUntil(event.target.value)} />
          </label>
          <label>
            <span>Extended Time</span>
            <input type="time" value={extendedTime} onChange={(event) => setExtendedTime(event.target.value)} />
          </label>
          <label className="support-request-admin-form-full">
            <span>Reason</span>
            <textarea rows={5} value={extendReason} onChange={(event) => setExtendReason(event.target.value)} />
          </label>
        </>
      )
    }

    if (actionKey === 'change-status') {
      return (
        <>
          <label>
            <span>Status</span>
            <select value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>
              {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="support-request-admin-form-full">
            <span>Status Note</span>
            <textarea rows={5} value={statusNote} onChange={(event) => setStatusNote(event.target.value)} />
          </label>
        </>
      )
    }

    if (actionKey === 'change-type') {
      return (
        <>
          <label>
            <span>SR Type / Complaint Type</span>
            <select value={nextType} onChange={(event) => setNextType(event.target.value)}>
              <option value="">Select</option>
              {buildSupportRequestTypeOptions(nextType).map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="support-request-admin-form-full">
            <span>Type Change Note</span>
            <textarea rows={5} value={typeNote} onChange={(event) => setTypeNote(event.target.value)} />
          </label>
        </>
      )
    }

    if (actionKey === 'reassign-sr') {
      return (
        <>
          <label>
            <span>Owner</span>
            <select value={nextOwnerId} onChange={(event) => setNextOwnerId(event.target.value)}>
              <option value="">Select</option>
              {ownerOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="support-request-admin-form-full">
            <span>Re-Assign Note</span>
            <textarea rows={5} value={reassignNote} onChange={(event) => setReassignNote(event.target.value)} />
          </label>
        </>
      )
    }

    return (
      <label className="support-request-admin-form-full">
        <span>Note/Remarks</span>
        <textarea rows={7} value={remarkText} onChange={(event) => setRemarkText(event.target.value)} />
      </label>
    )
  }

  return (
    <div className="support-request-admin-page support-request-admin-page--landscape">
      <section className="support-request-admin-card support-request-admin-card--landscape support-request-action-card">
        <p className="support-request-admin-eyebrow">Support Request Action</p>
        <h1>{config.title}</h1>
        <div className="support-request-action-summary">
          <div>
            <span>SR No</span>
            <strong>{supportRequest.srNumber}</strong>
          </div>
          <div>
            <span>Customer</span>
            <strong>{supportRequest.customerName || 'Customer'}</strong>
          </div>
          <div>
            <span>Last Updated</span>
            <strong>{formatDateTime(supportRequest.updatedAt)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="support-request-admin-form">
          <div className="support-request-admin-form-grid support-request-admin-form-grid--landscape">
            {renderFields()}
          </div>

          {errorMessage ? <p className="support-request-admin-error">{errorMessage}</p> : null}

          <div className="support-request-admin-actions">
            <Button type="submit" loading={saving}>Save</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/details/${supportRequest.id}`)}>Cancel</Button>
            <Button variant="outline" onClick={() => navigate(`${basePath}/manage/${supportRequest.id}`)}>Manage SR</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default SupportRequestActionPage
