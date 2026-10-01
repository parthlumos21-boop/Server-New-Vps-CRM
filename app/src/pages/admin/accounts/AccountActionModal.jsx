import React, { useEffect, useState } from 'react'
import AddRemarksModal from '../../../components/common/AddRemarksModal'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import { remarkApi } from '../../../services/remarkApi'
import { reminderApi } from '../../../services/reminderApi'
import { calendarApi } from '../../../services/calendarApi'
import { ACCOUNT_ACTION_MAP } from '../../../features/adminAccounts/config/accountActions'
import { getAccountOwnerOptionLabel, getCachedAccountOwnerOptions, loadAccountOwnerOptions } from '../../../features/adminAccounts/utils/accountOwnerOptions'
import {
  ACCOUNT_ORDER_STATUS_OPTIONS,
  ACCOUNT_QUOTATION_STATUS_OPTIONS,
  ACCOUNT_STATE_OPTIONS,
  ACCOUNT_CHANGE_STATUS_OPTIONS,
  getAccountChangeStatusOption,
  shouldShowAccountPoDetails,
} from '../../../features/adminAccounts/config/accountStages'
import './MyGroupAccounts.css'

const reminderModes = ['Call', 'Email', 'Meeting', 'Visit', 'WhatsApp', 'Follow Up']
const documentTypes = ['Proposal', 'Quotation', 'PO', 'Drawing', 'Site Photo', 'Other']
const reminderTimes = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
const getTodayInputValue = () => new Date().toISOString().slice(0, 10)
const ACTION_CHANGE_STATUS_OPTIONS = ACCOUNT_CHANGE_STATUS_OPTIONS.filter((entry) => (
  !['converted', 'closed', 'contacted', 'order_lost'].includes(entry.value)
)).map((entry) => ({
  ...entry,
  label: entry.value === 'convert_to_po' ? 'PO Converted' : entry.label,
}))
const getAllowedActionStatusOption = (value) => {
  const selectedOption = getAccountChangeStatusOption(value)
  return ACTION_CHANGE_STATUS_OPTIONS.some((entry) => entry.value === selectedOption.value)
    ? selectedOption
    : ACTION_CHANGE_STATUS_OPTIONS[0]
}

const AccountActionModal = ({ account, actionKey, onClose, onSaved }) => {
  const { addNotification, updateAccount } = useData()
  const action = ACCOUNT_ACTION_MAP[actionKey]
  const [reminderDate, setReminderDate] = useState(getTodayInputValue)
  const [reminderTime, setReminderTime] = useState('')
  const [reminderMode, setReminderMode] = useState(reminderModes[0])
  const [reminderNote, setReminderNote] = useState('')
  const [stage, setStage] = useState(ACCOUNT_CHANGE_STATUS_OPTIONS[0]?.value || 'new')
  const [statusNote, setStatusNote] = useState('')
  const [poValue, setPoValue] = useState('')
  const [orderReceivedStatus, setOrderReceivedStatus] = useState('')
  const [quotationGivenStatus, setQuotationGivenStatus] = useState('')
  const [gstin, setGstin] = useState('')
  const [jobNo, setJobNo] = useState('')
  const [accountState, setAccountState] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [documentType, setDocumentType] = useState(documentTypes[0])
  const [documentName, setDocumentName] = useState('')
  const [documentNote, setDocumentNote] = useState('')
  const [documentFile, setDocumentFile] = useState(null)
  const [emailSubject, setEmailSubject] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [ownerOptions, setOwnerOptions] = useState(getCachedAccountOwnerOptions)

  useEffect(() => {
    let isMounted = true

    loadAccountOwnerOptions()
      .then((options) => {
        if (isMounted) setOwnerOptions(options)
      })
      .catch(() => {
        if (isMounted) setOwnerOptions(getCachedAccountOwnerOptions())
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!account) return

    setReminderDate(account.reminderDate || getTodayInputValue())
    setReminderTime(account.raw?.reminderTime || '')
    setReminderMode(account.reminderMode || reminderModes[0])
    setReminderNote(account.raw?.reminderNote || '')
    setStage(getAllowedActionStatusOption(account.status || account.stage)?.value || ACTION_CHANGE_STATUS_OPTIONS[0]?.value || 'new')
    setStatusNote('')
    setPoValue(account.poValue || '')
    setOrderReceivedStatus(account.statusAsPerOrderReceived || '')
    setQuotationGivenStatus(account.statusAsPerQuotationGiven || '')
    setGstin(account.gstin || '')
    setJobNo(account.jobNo || '')
    setAccountState(account.accountState || '')
    setOwnerName(account.accountOwnerName || account.accountOwner || ownerOptions[0]?.name || '')
    setDocumentType(documentTypes[0])
    setDocumentName('')
    setDocumentNote('')
    setDocumentFile(null)
    setEmailSubject(`Regarding ${account.name}`)
    setEmailMessage('')
    setFormError('')
  }, [account, ownerOptions])

  if (!account || !actionKey || !action) return null

  const showPoDetails = actionKey === 'change-status' && shouldShowAccountPoDetails(stage)

  const handleSaveRemark = async (remarkData) => {
    setIsSaving(true)

    try {
      await remarkApi.createRemark(remarkData)
      addNotification('success', 'Remark added', 'Remark saved successfully.')
      onSaved?.()
      onClose()
    } catch (error) {
      addNotification('error', 'Remark not saved', error.response?.data?.message || error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (actionKey === 'add-note-remarks') {
    return (
      <AddRemarksModal
        isOpen
        onClose={onClose}
        accountData={account}
        onSave={handleSaveRemark}
        isLoading={isSaving}
      />
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (actionKey === 'manage-account') {
      addNotification('info', 'Account workspace', 'You are already viewing the account workspace.')
      onClose()
      return
    }

    let updates = {}

    if (actionKey === 'add-reminder') {
      if (!reminderDate) {
        setFormError('Reminder date is required.')
        return
      }

      updates = {
        reminderDate,
        reminderTime,
        reminderMode,
        reminderNote: reminderNote.trim(),
        latestRemark: reminderNote.trim() || account.latestRemark,
      }
    } else if (actionKey === 'change-status') {
      if (!stage) {
        setFormError('Status is required.')
        return
      }

      const selectedStatus = getAccountChangeStatusOption(stage)
      updates = {
        stage: selectedStatus?.stageKey || stage,
        status: selectedStatus?.label || stage,
        accountState: accountState || account.accountState || '',
        latestRemark: statusNote.trim() || account.latestRemark,
      }

      if (showPoDetails) {
        updates = {
          ...updates,
          poValue: poValue === '' ? '' : poValue,
          statusAsPerOrderReceived: orderReceivedStatus,
          statusAsPerQuotationGiven: quotationGivenStatus,
          gstin: gstin.trim(),
          jobNo: jobNo.trim(),
        }
      }
    } else if (actionKey === 're-assign-account') {
      if (!ownerName) {
        setFormError('Account owner is required.')
        return
      }

      const owner = ownerOptions.find((entry) => entry.name === ownerName)
      updates = {
        accountOwner: ownerName,
        ownerName,
        ownerId: owner?.id || account.raw?.ownerId || null,
        assignedUserId: owner?.id || account.raw?.assignedUserId || null,
      }
    } else if (actionKey === 'add-document') {
      if (!documentFile) {
        setFormError('Document file is required.')
        return
      }

      setIsSaving(true)
      let base64File = ''
      try {
        base64File = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(documentFile)
          reader.onload = () => resolve(reader.result)
          reader.onerror = (error) => reject(error)
        })
      } catch (error) {
        setFormError('Failed to read file.')
        setIsSaving(false)
        return
      }

      updates = {
        documents: [
          ...(Array.isArray(account.raw?.documents) ? account.raw.documents : []),
          {
            id: `DOC-${Date.now()}`,
            type: documentType,
            name: documentName,
            note: documentNote.trim(),
            fileData: base64File,
            addedOn: new Date().toISOString(),
          },
        ],
        latestRemark: `Document added: ${documentName}`,
      }
    } else if (actionKey === 'send-mail') {
      if (!account.email) {
        setFormError('Account email is not available.')
        return
      }

      window.location.href = `mailto:${encodeURIComponent(account.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`
      onClose()
      return
    }

    setIsSaving(true)
    const result = await updateAccount(account.raw?.id || account.id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    setIsSaving(false)

    if (!result.success) {
      setFormError(result.message || 'Unable to save account action.')
      return
    }

    if (actionKey === 'add-reminder') {
      const remindAt = `${reminderDate}T${reminderTime || '09:00'}:00`
      const reminderTitle = `${account.name || 'Account'} reminder`
      const assignedTo = account.raw?.assignedTo || account.raw?.ownerUserId || account.raw?.createdBy || null

      await Promise.allSettled([
        reminderApi.createReminder({
          title: reminderTitle,
          message: reminderNote.trim(),
          remindAt,
          status: 'scheduled',
          relatedEntityType: 'account',
          relatedEntityId: account.raw?.id || account.id,
          assignedTo,
          reminderDate,
          reminderTime,
          reminderMode,
        }),
        calendarApi.createEvent({
          title: reminderTitle,
          description: reminderNote.trim(),
          startAt: remindAt,
          category: 'Reminder',
          relatedEntityType: 'account',
          relatedEntityId: account.raw?.id || account.id,
          assignedTo,
        }),
      ])
    }

    addNotification('success', `${action.label} saved`, `${action.label} completed successfully.`)
    onSaved?.()
    onClose()
  }

  const renderFields = () => {
    if (actionKey === 'add-reminder') {
      return (
        <div className="admin-accounts-action-form-grid">
          <label className="admin-accounts-bulk-field">
            Reminder Date
            <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
          </label>
          <label className="admin-accounts-bulk-field">
            Reminder Mode
            <select value={reminderMode} onChange={(event) => setReminderMode(event.target.value)}>
              {reminderModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
            </select>
          </label>
          <div className="admin-accounts-bulk-field admin-accounts-action-field-full">
            Reminder Time
            <div className="admin-accounts-reminder-time-buttons">
              {reminderTimes.map((time, index) => (
                <button
                  key={time}
                  type="button"
                  className={`admin-accounts-reminder-time-btn admin-accounts-reminder-time-btn-${index % 5} ${reminderTime === time ? 'active' : ''}`}
                  onClick={() => setReminderTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
            <span className="admin-accounts-reminder-time-other">Other</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </div>
          <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
            Reminder Note
            <textarea value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} placeholder="Add reminder note here..." />
          </label>
        </div>
      )
    }

    if (actionKey === 'change-status') {
      return (
        <>
          <div className="admin-accounts-action-form-grid">
            <label className="admin-accounts-bulk-field">
              Account Status
              <select value={stage} onChange={(event) => setStage(event.target.value)}>
                {ACTION_CHANGE_STATUS_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
              </select>
            </label>
            <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
              Status Note
              <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Add status note..." />
            </label>
          </div>

          {showPoDetails ? (
            <>
              <div className="admin-accounts-action-section-label">Please fill in the details below</div>
              <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--section">
                <label className="admin-accounts-bulk-field">
                  PO Value
                  <input type="number" min="0" value={poValue} onChange={(event) => setPoValue(event.target.value)} placeholder="Enter PO value" />
                </label>
                <label className="admin-accounts-bulk-field">
                  Status Of Customer As Per Order Received
                  <select value={orderReceivedStatus} onChange={(event) => setOrderReceivedStatus(event.target.value)}>
                    <option value="">Select</option>
                    {ACCOUNT_ORDER_STATUS_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </label>
                <label className="admin-accounts-bulk-field">
                  Status Of Customer As Per Quotation Given
                  <select value={quotationGivenStatus} onChange={(event) => setQuotationGivenStatus(event.target.value)}>
                    <option value="">Select</option>
                    {ACCOUNT_QUOTATION_STATUS_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </label>
                <label className="admin-accounts-bulk-field">
                  GSTIN
                  <input type="text" value={gstin} onChange={(event) => setGstin(event.target.value)} placeholder="Enter GSTIN" />
                </label>
                <label className="admin-accounts-bulk-field">
                  Job No
                  <input type="text" value={jobNo} onChange={(event) => setJobNo(event.target.value)} placeholder="Enter Job No" />
                </label>
              </div>

              <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--section admin-accounts-action-form-grid--compact">
                <label className="admin-accounts-bulk-field">
                  Account State
                  <select value={accountState} onChange={(event) => setAccountState(event.target.value)}>
                    <option value="">Select</option>
                    {ACCOUNT_STATE_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </label>
              </div>
            </>
          ) : null}
        </>
      )
    }

    if (actionKey === 're-assign-account') {
      return (
        <div className="admin-accounts-action-form-grid">
          <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
            Account Owner
            <select value={ownerName} onChange={(event) => setOwnerName(event.target.value)}>
              {ownerOptions.map((owner) => <option key={owner.id} value={owner.name}>{getAccountOwnerOptionLabel(owner)}</option>)}
            </select>
          </label>
        </div>
      )
    }

    if (actionKey === 'add-document') {
      return (
        <div className="admin-accounts-action-form-grid">
          <label className="admin-accounts-bulk-field">
            Document Type
            <select value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
              {documentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
          </label>
          </label>
          <label className="admin-accounts-bulk-field">
            Document Upload
            <input type="file" accept=".pdf,.jpeg,.jpg,.png,.svg,.xlsx,.csv" onChange={(event) => {
              const file = event.target.files[0]
              if (file) {
                setDocumentFile(file)
                setDocumentName(file.name)
              } else {
                setDocumentFile(null)
                setDocumentName('')
              }
            }} />
          </label>
          <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
            Document Note
            <textarea value={documentNote} onChange={(event) => setDocumentNote(event.target.value)} placeholder="Add document note..." />
          </label>
        </div>
      )
    }

    if (actionKey === 'send-mail') {
      return (
        <>
          <div className="admin-accounts-mail-summary">
            <div className="admin-accounts-mail-summary__item">
              <span>Account</span>
              <strong>{account.name || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Account No.</span>
              <strong>{account.accountNumber || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Contact</span>
              <strong>{account.contactPerson || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Phone</span>
              <strong>{account.phone || '-'}</strong>
            </div>
          </div>
          <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--mail">
            <label className="admin-accounts-bulk-field">
              To
              <input type="email" value={account.email || ''} readOnly />
            </label>
            <label className="admin-accounts-bulk-field">
              Subject
              <input type="text" value={emailSubject} onChange={(event) => setEmailSubject(event.target.value)} />
            </label>
            <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
              Message
              <textarea className="admin-accounts-mail-message" value={emailMessage} onChange={(event) => setEmailMessage(event.target.value)} placeholder="Enter your message..." />
            </label>
          </div>
        </>
      )
    }

    return (
      <p className="admin-accounts-bulk-help">
        This action is already available in the current account workspace.
      </p>
    )
  }

  return (
    <div className="admin-accounts-inline-action-layer" role="dialog" aria-modal="true" aria-label={action.label} onClick={onClose}>
      <section className="admin-accounts-inline-action-modal" onClick={(event) => event.stopPropagation()}>
        <div className="admin-accounts-inline-action-header">
          <div>
            <p className="admin-accounts-placeholder-eyebrow">{action.label}</p>
            <h2>{action.heading}</h2>
            <span>{account.name} | {account.accountNumber}</span>
          </div>
          <button type="button" className="admin-accounts-inline-action-close" onClick={onClose} aria-label="Close action">
            &times;
          </button>
        </div>

        <form className="admin-accounts-action-form" onSubmit={handleSubmit}>
          {renderFields()}
          {formError ? <div className="admin-accounts-action-error">{formError}</div> : null}
          <div className="admin-accounts-placeholder-actions">
            <Button type="button" variant="outline" onClick={onClose}>Close</Button>
            <Button type="submit" disabled={isSaving}>{actionKey === 'send-mail' ? 'Open Mail' : 'Save'}</Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default AccountActionModal
