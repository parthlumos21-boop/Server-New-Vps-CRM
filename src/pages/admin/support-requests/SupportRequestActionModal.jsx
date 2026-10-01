import React, { useMemo, useState, useEffect, useRef } from 'react'
import Modal from '../../../components/common/Modal'
import Button from '../../../components/common/Button'
import AddRemarksModal from '../../../components/common/AddRemarksModal'
import { useAuth } from '../../../context/AuthContext'
import { useData } from '../../../context/DataContext'
import { remarkApi } from '../../../services/remarkApi'
import { reminderApi } from '../../../services/reminderApi'
import { calendarApi } from '../../../services/calendarApi'
import { supportRequestDocumentApi } from '../../../services/supportRequestDocumentApi'
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
  }
}

const reminderModes = ['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp', 'Follow Up']
const documentTypes = ['Service Report', 'Site Photo', 'Invoice', 'Drawing', 'Warranty', 'Other']

const today = () => new Date().toISOString().slice(0, 10)

const SupportRequestActionModal = ({ supportRequest, actionKey, onClose, onSaved }) => {
  const { user } = useAuth()
  const { updateSupportRequest, addNotification } = useData()
  const config = actionConfig[actionKey] || actionConfig['add-note-remarks']

  const [reminderDate, setReminderDate] = useState(today())
  const [reminderTime, setReminderTime] = useState('09:00')
  const [reminderMode, setReminderMode] = useState(reminderModes[0])
  const [reminderNote, setReminderNote] = useState('')
  
  const [documentType, setDocumentType] = useState(documentTypes[0])
  const [documentFile, setDocumentFile] = useState(null)
  const [documentNote, setDocumentNote] = useState('')

  const fileInputRef = useRef(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!supportRequest) return
    setReminderDate(today())
    setReminderTime('09:00')
    setReminderMode(reminderModes[0])
    setReminderNote('')
    setDocumentType(documentTypes[0])
    setDocumentFile(null)
    setDocumentNote('')
    setErrorMessage('')
  }, [supportRequest, actionKey])

  if (!supportRequest || !actionKey || !config) return null

  const handleSaveRemark = async (remarkData) => {
    setSaving(true)
    try {
      await remarkApi.createRemark({
        ...remarkData,
        relatedEntityType: 'support_request',
        relatedEntityId: supportRequest.id
      })
      addNotification('success', 'Remark added', 'Remark saved successfully.')
      onSaved?.()
      onClose()
    } catch (error) {
      addNotification('error', 'Remark not saved', error.response?.data?.message || error.message)
    } finally {
      setSaving(false)
    }
  }

  if (actionKey === 'add-note-remarks') {
    return (
      <AddRemarksModal
        isOpen
        onClose={onClose}
        accountData={supportRequest}
        onSave={handleSaveRemark}
        isLoading={saving}
      />
    )
  }

  const buildUpdates = () => {
    const timestamp = new Date().toISOString()
    const actorName = user?.name || 'System'

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



    return { error: 'Unsupported action.' }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    setSaving(true)
    if (actionKey === 'add-document') {
      if (!documentFile) {
        setErrorMessage('Document file is required.')
        setSaving(false)
        return
      }
      try {
        const formData = new FormData()
        formData.append('file', documentFile)
        formData.append('supportRequestId', supportRequest.id || supportRequest._id || supportRequest.legacyId)
        formData.append('srNumber', supportRequest.srNumber || 'SR000')
        formData.append('documentType', documentType.toLowerCase().replace(/ /g, '_'))
        formData.append('title', documentFile.name)
        formData.append('description', documentNote.trim())

        await supportRequestDocumentApi.uploadDocument(formData)
        addNotification('success', config.successTitle, `${supportRequest.srNumber}: ${config.successMessage}`)
        onSaved?.()
        onClose()
      } catch (error) {
        setErrorMessage(error.response?.data?.message || error.message || 'Unable to upload document.')
      } finally {
        setSaving(false)
      }
      return
    }

    const updates = buildUpdates()
    if (updates?.error) {
      setErrorMessage(updates.error)
      setSaving(false)
      return
    }

    const result = await updateSupportRequest(supportRequest.id, updates)
    
    if (result.success && actionKey === 'add-reminder') {
      const remindAt = `${reminderDate}T${reminderTime || '09:00'}:00`
      const reminderTitle = `${supportRequest.srNumber || 'SR'} reminder`
      const assignedTo = supportRequest.ownerId || supportRequest.assignedUserId || supportRequest.createdBy || null

      await Promise.allSettled([
        reminderApi.createReminder({
          title: reminderTitle,
          message: reminderNote.trim(),
          remindAt,
          status: 'scheduled',
          relatedEntityType: 'support_request',
          relatedEntityId: supportRequest.id,
          assignedTo,
          reminderDate,
          reminderTime,
          reminderMode,
        }).catch(console.error),
        calendarApi.createEvent({
          title: reminderTitle,
          description: reminderNote.trim(),
          startAt: remindAt,
          category: 'Reminder',
          relatedEntityType: 'support_request',
          relatedEntityId: supportRequest.id,
          assignedTo,
        }).catch(console.error)
      ])
    }
    
    setSaving(false)

    if (!result.success) {
      setErrorMessage(result.message || 'Unable to save action.')
      return
    }

    addNotification('success', config.successTitle, `${supportRequest.srNumber}: ${config.successMessage}`)
    onSaved?.()
    onClose()
  }

  const renderFields = () => {
    if (actionKey === 'add-reminder') {
      return (
        <div className="admin-accounts-action-form-grid" style={{ padding: '1rem' }}>
          <label className="admin-accounts-bulk-field">
            <span>Reminder Date</span>
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
          </label>
          <label className="admin-accounts-bulk-field">
            <span>Reminder Time</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>
          <label className="admin-accounts-bulk-field">
            <span>Reminder Mode</span>
            <select value={reminderMode} onChange={(event) => setReminderMode(event.target.value)}>
              {reminderModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
            <span>Reminder Note</span>
            <textarea rows={4} value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} />
          </label>
        </div>
      )
    }

    if (actionKey === 'add-document') {
      return (
        <div className="admin-accounts-action-form-grid" style={{ padding: '1rem' }}>
          <label className="admin-accounts-bulk-field">
            <span>Document Type</span>
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          <label className="admin-accounts-bulk-field">
            <span>Document File</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={(event) => setDocumentFile(event.target.files?.[0] || null)} 
              />
            </div>
          </label>
          <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
            <span>Document Note</span>
            <textarea rows={4} value={documentNote} onChange={(event) => setDocumentNote(event.target.value)} />
          </label>
        </div>
      )
    }
    return null
  }

  return (
    <Modal isOpen onClose={onClose} title={config.title} size="medium">
      <form onSubmit={handleSubmit}>
        {renderFields()}
        
        {errorMessage && <div style={{ padding: '0 1rem', color: 'red' }}>{errorMessage}</div>}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', padding: '1rem', borderTop: '1px solid var(--border-subtle)' }}>
          <Button type="button" variant="outline" className="btn-red-theme" onClick={onClose}>Cancel</Button>
          <Button type="submit" className="btn-red-theme" loading={saving}>
            {actionKey === 'add-document' ? 'Upload File' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export default SupportRequestActionModal
