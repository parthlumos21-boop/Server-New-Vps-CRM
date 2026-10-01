import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import AddRemarksModal from '../../../components/common/AddRemarksModal'
import AddReminderModal from '../../../components/common/AddReminderModal'
import Button from '../../../components/common/Button'
import { useData } from '../../../context/DataContext'
import { remarkApi } from '../../../services/remarkApi'
import { reminderApi } from '../../../services/reminderApi'
import { calendarApi } from '../../../services/calendarApi'
import { ACCOUNT_ACTION_MAP } from '../../../features/adminAccounts/config/accountActions'
import { getAccountOwnerOptionLabel, getCachedAccountOwnerOptions, loadAccountOwnerOptions, filterAccountOwnerOptionsByVertical } from '../../../features/adminAccounts/utils/accountOwnerOptions'
import {
  ACCOUNT_ORDER_STATUS_OPTIONS,
  ACCOUNT_QUOTATION_STATUS_OPTIONS,
  ACCOUNT_STATE_OPTIONS,
  ACCOUNT_CHANGE_STATUS_OPTIONS,
  getAccountChangeStatusOption,
  shouldShowAccountPoDetails,
} from '../../../features/adminAccounts/config/accountStages'
import './MyGroupAccounts.css'

const documentTypes = ['Proposal', 'Quotation', 'PO', 'Drawing', 'Site Photo', 'Other']
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
  const location = useLocation()
  const isAdminRoute = location.pathname.startsWith('/admin')
  const { addNotification, updateAccount } = useData()
  const action = ACCOUNT_ACTION_MAP[actionKey]
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

  const handleSaveRemarkAccountField = async (fieldKey, value) => {
    const accountId = account.raw?.id || account.id
    const result = await updateAccount(accountId, { [fieldKey]: value })

    if (!result.success) {
      addNotification('error', 'Account update failed', result.message || 'Unable to update account field.')
      throw new Error(result.message || 'Unable to update account field.')
    }

    addNotification('success', 'Account updated', 'Account information saved successfully.')
    onSaved?.()
    return result
  }

  if (actionKey === 'add-note-remarks') {
    return (
      <AddRemarksModal
        isOpen
        onClose={onClose}
        accountData={account}
        onSave={handleSaveRemark}
        onSaveAccountField={handleSaveRemarkAccountField}
        isLoading={isSaving}
      />
    )
  }

  if (actionKey === 'add-reminder') {
    return (
      <AddReminderModal
        isOpen
        onClose={onClose}
        contextLabel={`${account.name || 'Account'} | ${account.accountNumber || '-'}`}
        createdBy={account.accountOwnerName || account.accountOwner || ''}
        onSaved={async (reminder) => {
          if (reminder) {
            await updateAccount(account.raw?.id || account.id, {
              reminderDate: reminder.reminderDate,
              reminderTime: reminder.reminderTime,
              reminderMode: reminder.reminderMode,
              latestRemark: reminder.message || reminder.note || account.latestRemark,
              updatedAt: new Date().toISOString(),
            })
          }
          if (onSaved) onSaved(reminder)
          onClose()
        }}
        relatedEntityType="account"
        relatedEntityId={account.raw?.id || account.id}
        assignedTo={account.raw?.assignedTo || account.raw?.ownerUserId || account.accountOwner || account.raw?.createdBy || null}
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

    if (actionKey === 'change-status' || actionKey === 'converted-deal') {
      const targetStage = actionKey === 'converted-deal' ? 'convert_to_po' : stage
      if (!targetStage) {
        setFormError('Status is required.')
        return
      }

      const isNotQuoted = targetStage === 'not_quoted' || targetStage === 'Not Quoted' || targetStage === 'not-quoted'
      if (isNotQuoted && !statusNote.trim()) {
        setFormError('Status Note / Reason is mandatory for Not Quoted.')
        return
      }

      const selectedStatus = getAccountChangeStatusOption(targetStage)
      const selectedStatusLabel = selectedStatus?.label || targetStage

      if (actionKey === 'converted-deal' || showPoDetails) {
        if (!String(poValue).trim()) {
          setFormError('PO Value is required to convert account to PO Converted status.')
          return
        }
      }

      updates = {
        stage: selectedStatus?.stageKey || targetStage,
        status: isNotQuoted ? 'not_quoted' : selectedStatusLabel,
        accountStatus: isNotQuoted ? 'not_quoted' : (targetStage === 'convert_to_po' ? 'convert_to_po' : 'Pending'),
        accountState: isNotQuoted ? 'not_quoted' : (targetStage === 'convert_to_po' ? 'convert_to_po' : (accountState || selectedStatusLabel)),
        latestRemark: statusNote.trim() || account.latestRemark,
      }

      if (showPoDetails || actionKey === 'converted-deal') {
        updates = {
          ...updates,
          stage: 'convert_to_po',
          status: 'convert_to_po',
          accountStatus: 'convert_to_po',
          accountState: 'convert_to_po',
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
        accountOwnerCode: owner?.ownerCode || '',
        company: owner?.company || owner?.companyName || account.accountCategory || '',
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

    addNotification('success', `${action.label} saved`, `${action.label} completed successfully.`)
    onSaved?.()
    onClose()
  }

  const renderFields = () => {
    if (actionKey === 'change-status' || actionKey === 'converted-deal') {
      const isNotQuotedSelected = stage === 'not_quoted' || stage === 'Not Quoted'
      const showPoFields = actionKey === 'converted-deal' || showPoDetails

      return (
        <>
          <div className="admin-accounts-action-form-grid" style={{ marginBottom: '16px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <label className="admin-accounts-bulk-field">
              Account No.
              <input type="text" value={account.accountNumber || account.accountNo || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            </label>
            <label className="admin-accounts-bulk-field">
              Account Owner
              <input type="text" value={account.accountOwnerDisplay || account.accountOwnerName || account.accountOwner || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            </label>
            <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
              Project Name
              <input type="text" value={account.projectName || account.company || account.raw?.projectName || '-'} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
            </label>
          </div>

          {actionKey === 'change-status' ? (
            <div className="admin-accounts-action-form-grid">
              <label className="admin-accounts-bulk-field">
                Account Status
                <select value={stage} onChange={(event) => setStage(event.target.value)}>
                  {ACTION_CHANGE_STATUS_OPTIONS.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
                </select>
              </label>
              <label className="admin-accounts-bulk-field admin-accounts-action-field-full">
                Status Note {isNotQuotedSelected ? <span style={{ color: '#dc2626' }}>* (Mandatory for Not Quoted)</span> : null}
                <textarea value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Add status note..." />
              </label>
            </div>
          ) : null}

          {showPoFields ? (
            <>
              <div className="admin-accounts-action-section-label">Please fill in the PO Converted details below</div>
              <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--section">
                <label className="admin-accounts-bulk-field">
                  PO Value <span style={{ color: '#dc2626' }}>* (Mandatory)</span>
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

              {isAdminRoute ? (
                <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--section admin-accounts-action-form-grid--compact">
                <label className="admin-accounts-bulk-field">
                  Account State
                  <select value={accountState} onChange={(event) => setAccountState(event.target.value)}>
                    <option value="">Select</option>
                    {ACCOUNT_STATE_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
                  </select>
                </label>
                </div>
              ) : null}
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
                {filterAccountOwnerOptionsByVertical(ownerOptions, account.accountCategory).map((owner) => <option key={owner.id} value={owner.name}>{getAccountOwnerOptionLabel(owner)}</option>)}
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
            <Button type="button" variant="outline" className="btn-red-theme" onClick={onClose}>Close</Button>
            <Button type="submit" className="btn-red-theme" disabled={isSaving}>
              {actionKey === 'send-mail' ? 'Open Mail' : actionKey === 'converted-deal' ? 'Convert To PO' : 'Save'}
            </Button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default AccountActionModal
