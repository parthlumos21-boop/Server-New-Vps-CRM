import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import Button from '../../../components/common/Button'
import AddRemarksModal from '../../../components/common/AddRemarksModal'
import RemarksTimeline from '../../../components/common/RemarksTimeline'
import { useData } from '../../../context/DataContext'
import { useAuth } from '../../../context/AuthContext'
import { remarkApi } from '../../../services/remarkApi'
import { reminderApi } from '../../../services/reminderApi'
import { calendarApi } from '../../../services/calendarApi'
import { ACCOUNT_ACTION_MAP, USER_ACCOUNT_ACTION_MAP } from '../../../features/adminAccounts/config/accountActions'
import {
  ACCOUNT_ORDER_STATUS_OPTIONS,
  ACCOUNT_QUOTATION_STATUS_OPTIONS,
  ACCOUNT_STATE_OPTIONS,
  ACCOUNT_CHANGE_STATUS_OPTIONS,
  getAccountChangeStatusOption,
  shouldShowAccountPoDetails,
} from '../../../features/adminAccounts/config/accountStages'
import { buildAdminAccountBoardReturnUrl, buildAdminAccountDrawerUrl } from '../../../features/adminAccounts/utils/accountNavigation'
import { getAccountsBoardData } from '../../../features/adminAccounts/selectors/getAccountsBoardData'
import { getAccountById } from '../../../features/adminAccounts/selectors/getAccountById'
import { getAccountOwnerOptionLabel, getCachedAccountOwnerOptions, loadAccountOwnerOptions } from '../../../features/adminAccounts/utils/accountOwnerOptions'
import { buildCrmAccountActionUrl } from '../crm-actions/CRMActionPage'
import BulkUploadAccountsPage from './BulkUploadAccountsPage'
import AccountDetailsDrawer from './AccountDetailsDrawer'
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

const AccountActionPlaceholderPage = () => {
  const navigate = useNavigate()
  const { actionKey } = useParams()
  const [searchParams] = useSearchParams()
  const { accounts, addNotification, updateAccount, findConvertedDealForAccount, convertAccountToDeal } = useData()
  const { user } = useAuth()
  const isAdminUser = user?.role === 'admin'
  const searchDealPagePath = isAdminUser ? '/admin/deals/search' : '/deals/search'
  const conversionStartedRef = useRef(false)
  const [conversionError, setConversionError] = useState('')
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false)
  const [isSavingRemark, setIsSavingRemark] = useState(false)
  const [remarkRefreshKey, setRemarkRefreshKey] = useState(0)
  const [reminderDate, setReminderDate] = useState(getTodayInputValue)
  const [reminderTime, setReminderTime] = useState('09:00')
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
  const [isSavingAction, setIsSavingAction] = useState(false)
  const [ownerOptions, setOwnerOptions] = useState(getCachedAccountOwnerOptions)

  const action = ACCOUNT_ACTION_MAP[actionKey]
  const boardData = useMemo(() => getAccountsBoardData(accounts), [accounts])
  const accountId = searchParams.get('accountId')
  const selectedAccount = useMemo(
    () => getAccountById(boardData.records, accountId),
    [accountId, boardData.records]
  )
  const boardUrl = useMemo(() => buildAdminAccountBoardReturnUrl(searchParams), [searchParams])
  const isActionAvailable = Boolean(action && (isAdminUser || USER_ACCOUNT_ACTION_MAP[actionKey]))
  const accountDetailUrl = useMemo(
    () => (selectedAccount ? buildAdminAccountDrawerUrl(searchParams, selectedAccount.id) : ''),
    [searchParams, selectedAccount]
  )
  useEffect(() => {
    if (actionKey === 'add-note-remarks' && selectedAccount) {
      setIsRemarkModalOpen(true)
    }
  }, [actionKey, selectedAccount])

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
    if (isAdminUser && actionKey === 'send-mail' && selectedAccount) {
      navigate(buildCrmAccountActionUrl('send-mail', selectedAccount.id, accountDetailUrl || boardUrl), { replace: true })
    }
  }, [accountDetailUrl, actionKey, boardUrl, isAdminUser, navigate, selectedAccount])

  useEffect(() => {
    if (actionKey !== 'converted-deal' || !selectedAccount || conversionStartedRef.current) {
      return
    }

    conversionStartedRef.current = true

    const runConversion = async () => {
      const accountId = selectedAccount.raw?.id ?? selectedAccount.id ?? ''
      const existingResult = await findConvertedDealForAccount(accountId)

      if (!existingResult?.success) {
        setConversionError(existingResult?.message || 'Unable to check existing converted deal.')
        return
      }

      if (existingResult.data?.id) {
        addNotification('info', 'Existing linked deal', 'This account already has a converted deal. Opening it in Search Deal.')
        navigate(searchDealPagePath, {
          replace: true,
          state: {
            quotationDealLookup: {
              dealNumber: existingResult.data.dealNumber || '',
              projectName: existingResult.data.name || existingResult.data.projectName || '',
              companyName: existingResult.data.accountName || existingResult.data.linkedAccountName || '',
            },
          },
        })
        return
      }

      const conversionResult = await convertAccountToDeal(accountId)

      if (!conversionResult.success) {
        setConversionError(conversionResult.message || 'Unable to convert this account into a deal.')
        return
      }

      const createdDeal = conversionResult.data?.deal || {}
      const createdConvertedDeal = conversionResult.data?.convertedDeal || {}

      addNotification('success', 'Account converted', 'Deal and Converted Deal were created successfully. Opening Search Deal.')
      navigate(searchDealPagePath, {
        replace: true,
        state: {
          editDealId: createdDeal.id || '',
          quotationDealLookup: {
            dealNumber: createdDeal.dealNumber || createdConvertedDeal.dealNumber || '',
            projectName: createdDeal.dealName || createdDeal.projectName || createdConvertedDeal.name || createdConvertedDeal.projectName || '',
            companyName: createdDeal.customerName || createdDeal.accountName || createdConvertedDeal.accountName || selectedAccount.name || '',
          },
        },
      })
    }

    runConversion()
  }, [actionKey, addNotification, convertAccountToDeal, findConvertedDealForAccount, navigate, searchDealPagePath, selectedAccount])

  useEffect(() => {
    if (!selectedAccount) return

    setReminderDate(selectedAccount.reminderDate || getTodayInputValue())
    setReminderTime(selectedAccount.raw?.reminderTime || '09:00')
    setReminderMode(selectedAccount.reminderMode || reminderModes[0])
    setReminderNote(selectedAccount.raw?.reminderNote || '')
    setStage(getAllowedActionStatusOption(selectedAccount.status || selectedAccount.stage)?.value || ACTION_CHANGE_STATUS_OPTIONS[0]?.value || 'new')
    setStatusNote('')
    setPoValue(selectedAccount.poValue || '')
    setOrderReceivedStatus(selectedAccount.statusAsPerOrderReceived || '')
    setQuotationGivenStatus(selectedAccount.statusAsPerQuotationGiven || '')
    setGstin(selectedAccount.gstin || '')
    setJobNo(selectedAccount.jobNo || '')
    setAccountState(selectedAccount.accountState || '')
    setOwnerName(selectedAccount.accountOwnerName || selectedAccount.accountOwner || ownerOptions[0]?.name || '')
    setDocumentType(documentTypes[0])
    setDocumentName('')
    setDocumentNote('')
    setDocumentFile(null)
    setEmailSubject(`Regarding ${selectedAccount.name}`)
    setEmailMessage('')
    setFormError('')
  }, [ownerOptions, selectedAccount])

  const closeRemarkModal = () => {
    setIsRemarkModalOpen(false)
  }

  const handleSaveManagedAccount = async (accountId, updates) => {
    const result = await updateAccount(accountId, updates)
    if (result.success) {
      addNotification('success', 'Manage Account saved', 'Account details updated successfully.')
    } else {
      addNotification('error', 'Manage Account failed', result.message || 'Unable to update account details.')
    }
    return result
  }

  const handleSaveRemark = async (remarkData) => {
    setIsSavingRemark(true)

    try {
      await remarkApi.createRemark(remarkData)
      addNotification('success', 'Remark added', 'Remark saved successfully.')
      setRemarkRefreshKey((currentValue) => currentValue + 1)
      setIsRemarkModalOpen(false)
    } catch (error) {
      addNotification('error', 'Remark not saved', error.response?.data?.message || error.message)
    } finally {
      setIsSavingRemark(false)
    }
  }

  const handleSaveAccountAction = async (event) => {
    event.preventDefault()
    if (!selectedAccount) return

    setFormError('')

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
        latestRemark: reminderNote.trim() || selectedAccount.latestRemark,
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
        accountState: accountState || selectedAccount.accountState || '',
        latestRemark: statusNote.trim() || selectedAccount.latestRemark,
      }

      if (shouldShowAccountPoDetails(stage)) {
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
        ownerId: owner?.id || selectedAccount.raw?.ownerId || null,
        assignedUserId: owner?.id || selectedAccount.raw?.assignedUserId || null,
      }
    } else if (actionKey === 'add-document') {
      if (!documentFile) {
        setFormError('Document file is required.')
        return
      }

      setIsSavingAction(true)
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
        setIsSavingAction(false)
        return
      }

      updates = {
        documents: [
          ...(Array.isArray(selectedAccount.raw?.documents) ? selectedAccount.raw.documents : []),
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
      if (!selectedAccount.email) {
        setFormError('Account email is not available.')
        return
      }

      window.location.href = `mailto:${encodeURIComponent(selectedAccount.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailMessage)}`
      return
    }

    setIsSavingAction(true)
    const result = await updateAccount(selectedAccount.raw?.id || selectedAccount.id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    })
    setIsSavingAction(false)

    if (!result.success) {
      setFormError(result.message || 'Unable to save account action.')
      return
    }

    if (actionKey === 'add-reminder') {
      const remindAt = `${reminderDate}T${reminderTime || '09:00'}:00`
      const reminderTitle = `${selectedAccount.name || 'Account'} reminder`
      const assignedTo = selectedAccount.raw?.assignedTo || selectedAccount.raw?.ownerUserId || user?.id

      try {
        await Promise.allSettled([
          reminderApi.createReminder({
            title: reminderTitle,
            message: reminderNote.trim(),
            remindAt,
            status: 'scheduled',
            relatedEntityType: 'account',
            relatedEntityId: selectedAccount.raw?.id || selectedAccount.id,
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
            relatedEntityId: selectedAccount.raw?.id || selectedAccount.id,
            assignedTo,
          }),
        ])
      } catch {
        // Account reminder fields are already saved; API writes are best-effort sync.
      }
    }

    addNotification('success', `${action.label} saved`, `${action.label} completed successfully.`)
    navigate(accountDetailUrl || boardUrl)
  }

  const renderActionFields = () => {
    if (actionKey === 'add-reminder') {
      return (
        <div className="admin-accounts-reminder-card">
          <div className="admin-accounts-reminder-top-grid">
            <label className="admin-accounts-reminder-field">
              <span>Reminder Date</span>
              <input type="date" value={reminderDate} onChange={(event) => setReminderDate(event.target.value)} />
            </label>
            <label className="admin-accounts-reminder-field">
              <span>Reminder Mode</span>
              <select value={reminderMode} onChange={(event) => setReminderMode(event.target.value)}>
                {reminderModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
              </select>
            </label>
          </div>

          <div className="admin-accounts-reminder-section">
            <span className="admin-accounts-reminder-label">Reminder Time</span>
            <div className="admin-accounts-reminder-time-row">
              {reminderTimes.map((time) => (
                <button
                  key={time}
                  type="button"
                  className={`admin-accounts-reminder-time-chip${reminderTime === time ? ' admin-accounts-reminder-time-chip--active' : ''}`}
                  onClick={() => setReminderTime(time)}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          <label className="admin-accounts-reminder-field admin-accounts-reminder-field-full">
            <span>Other</span>
            <input type="time" value={reminderTime} onChange={(event) => setReminderTime(event.target.value)} />
          </label>

          <label className="admin-accounts-reminder-field admin-accounts-reminder-field-full">
            <span>Reminder Note</span>
            <textarea rows={4} value={reminderNote} onChange={(event) => setReminderNote(event.target.value)} placeholder="Add reminder note here..." />
          </label>
        </div>
      )
    }

    if (actionKey === 'change-status') {
      const showPoDetails = shouldShowAccountPoDetails(stage)

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
              <strong>{selectedAccount?.name || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Account No.</span>
              <strong>{selectedAccount?.accountNumber || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Contact</span>
              <strong>{selectedAccount?.contactPerson || '-'}</strong>
            </div>
            <div className="admin-accounts-mail-summary__item">
              <span>Phone</span>
              <strong>{selectedAccount?.phone || '-'}</strong>
            </div>
          </div>
          <div className="admin-accounts-action-form-grid admin-accounts-action-form-grid--mail">
            <label className="admin-accounts-bulk-field">
              To
              <input type="email" value={selectedAccount?.email || ''} readOnly />
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

    return null
  }

  if (!isActionAvailable) {
    return (
      <div className="admin-accounts-placeholder-page">
        <div className="admin-accounts-placeholder-card">
          <h1>Action not available</h1>
          <p>The requested account action is not available for this user workspace.</p>
          <Button onClick={() => navigate(boardUrl)}>Back To Board</Button>
        </div>
      </div>
    )
  }

  if (actionKey === 'manage-account' && selectedAccount) {
    return (
      <div className="admin-accounts-manage-action-page">
        <AccountDetailsDrawer
          account={selectedAccount}
          isOpen
          inline
          onClose={() => navigate(boardUrl)}
          boardStateQuery={searchParams}
          onSaveAccount={handleSaveManagedAccount}
          onRefresh={() => Promise.resolve()}
          canEdit={isAdminUser || selectedAccount?.recordSource === 'live'}
        />
      </div>
    )
  }

  // Render wizard pages with specialized components
  if (action.isWizard) {
    if (actionKey === 'bulk-upload-accounts') {
      return <BulkUploadAccountsPage />
    }
  }

  if (actionKey === 'add-note-remarks') {
    return (
      <div className="admin-accounts-placeholder-page">
        <div className="admin-accounts-placeholder-card">
          <p className="admin-accounts-placeholder-eyebrow">Add Notes/Remarks</p>
          <h1>Add Remark</h1>

          {selectedAccount ? (
            <>
              <RemarksTimeline accountId={selectedAccount.id} refreshKey={remarkRefreshKey} />

              <AddRemarksModal
                isOpen={isRemarkModalOpen}
                onClose={closeRemarkModal}
                accountData={selectedAccount}
                onSave={handleSaveRemark}
                isLoading={isSavingRemark}
              />
            </>
          ) : (
            <p>Select an account before adding a remark.</p>
          )}
        </div>
      </div>
    )
  }

  if (actionKey === 'converted-deal') {
    return (
      <div className="admin-accounts-placeholder-page">
        <div className="admin-accounts-placeholder-card">
          <p className="admin-accounts-placeholder-eyebrow">Deal Section</p>
          <h1>Converted Deal</h1>

          {!selectedAccount ? (
            <p>Select an account to convert into a deal.</p>
          ) : conversionError ? (
            <>
              <div className="admin-accounts-action-error">{conversionError}</div>
              <div className="admin-accounts-placeholder-actions">
                <Button onClick={() => navigate(searchDealPagePath)}>Go To Search Deal</Button>
                {accountDetailUrl ? (
                  <Button variant="outline" onClick={() => navigate(accountDetailUrl)}>Back To Account</Button>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <p>Converting {selectedAccount.name} into a deal and opening Search Deal...</p>
              <div className="admin-accounts-placeholder-actions">
                <Button variant="outline" onClick={() => navigate(searchDealPagePath)}>Open Search Deal</Button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  const isReminderAction = actionKey === 'add-reminder'

  return (
    <div className={`admin-accounts-placeholder-page${isReminderAction ? ' admin-accounts-placeholder-page--reminder' : ''}`}>
      <div className={`admin-accounts-placeholder-card${isReminderAction ? ' admin-accounts-placeholder-card--reminder' : ''}`}>
        <p className="admin-accounts-placeholder-eyebrow">{action.placeholderTitle}</p>
        <h1>{action.heading}</h1>
        <p>{action.description}</p>

        {selectedAccount && renderActionFields() ? (
          <form className="admin-accounts-action-form" onSubmit={handleSaveAccountAction}>
            {renderActionFields()}
            {formError ? <div className="admin-accounts-action-error">{formError}</div> : null}
            <div className="admin-accounts-placeholder-actions">
              {accountDetailUrl ? (
                <Button type="button" variant="outline" onClick={() => navigate(accountDetailUrl)}>
                  {isReminderAction ? 'Close' : 'Back To Account'}
                </Button>
              ) : null}
              {!isReminderAction ? (
                <Button type="button" variant="outline" onClick={() => navigate(boardUrl)}>Return To Board</Button>
              ) : null}
              <Button type="submit" disabled={isSavingAction}>{actionKey === 'send-mail' ? 'Open Mail' : 'Save'}</Button>
            </div>
          </form>
        ) : (
          <div className="admin-accounts-placeholder-actions">
            {accountDetailUrl ? (
              <Button onClick={() => navigate(accountDetailUrl)}>Back To Account</Button>
            ) : null}
            <Button variant={accountDetailUrl ? 'outline' : 'primary'} onClick={() => navigate(boardUrl)}>
              Return To Board
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AccountActionPlaceholderPage
